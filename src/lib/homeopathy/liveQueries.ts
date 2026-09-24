import { getDb } from '@/lib/mongodb/client';
import { ProductRepository } from '@/lib/mongodb/repositories/productRepository';
import type { Product } from '@/lib/mongodb/schemas';
import type { HomeopathyProductFilters } from './queries';

/**
 * MongoDB-backed product queries for the `/homeopathy` storefront —
 * split out from `./queries.ts` (which stays a pure, client-safe module)
 * because these functions touch the `mongodb` driver, a Node-only
 * dependency that breaks the client bundle if imported from a
 * `'use client'` component (see `HomeopathyCatalog.tsx`/
 * `QuickViewModal.tsx`, which only need the pure helpers from
 * `./queries.ts`). Every function here MUST only be called from a Server
 * Component or route handler.
 *
 * Read the full `products` collection (397 active rows) rather than the
 * 125-row curated demo fixture under `@/lib/demo/products` these
 * functions replaced.
 */

/** All active (`pStatus: 1`) real products — the base catalogue for the
 * storefront. */
export async function getActiveProducts(): Promise<Product[]> {
  const db = await getDb();
  const repo = new ProductRepository(db);
  return repo.find({ pStatus: 1 });
}

/** Mirrors `ProductRepository.findByCategory` — used by pages that need a
 * category's products without the sort/filter logic in
 * `filterAndSortHomeopathyProducts`. */
export async function getProductsByCategoryLive(pCat: number, pStatus = 1): Promise<Product[]> {
  const db = await getDb();
  const repo = new ProductRepository(db);
  return repo.findByCategory(pCat, pStatus);
}

function discountDepth(p: Product): number {
  const mrp = p.pMrp ?? 0;
  const price = p.pPrice ?? 0;
  if (!mrp || !price || mrp <= price) return 0;
  return (mrp - price) / mrp;
}

export async function filterAndSortHomeopathyProducts(
  filters: HomeopathyProductFilters
): Promise<Product[]> {
  const base =
    filters.categoryId !== undefined
      ? await getProductsByCategoryLive(filters.categoryId, 1)
      : await getActiveProducts();

  const sorted = [...base];
  switch (filters.sort) {
    case 'price-asc':
      sorted.sort((a, b) => (a.pPrice ?? 0) - (b.pPrice ?? 0));
      break;
    case 'price-desc':
      sorted.sort((a, b) => (b.pPrice ?? 0) - (a.pPrice ?? 0));
      break;
    case 'rating':
      sorted.sort((a, b) => (b.pRating ?? 0) - (a.pRating ?? 0));
      break;
    case 'newest':
      sorted.sort((a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bt - at;
      });
      break;
    case 'featured':
    default:
      sorted.sort((a, b) => {
        const ratingDiff = (b.pRating ?? 0) - (a.pRating ?? 0);
        if (ratingDiff !== 0) return ratingDiff;
        return discountDepth(b) - discountDepth(a);
      });
      break;
  }
  return sorted;
}

/** Related products: same `pCat`, excluding the product itself. */
export async function getRelatedHomeopathyProducts(
  product: Product,
  limit: number
): Promise<Product[]> {
  if (product.pCat === null || product.pCat === undefined) return [];
  const products = await getProductsByCategoryLive(product.pCat, 1);
  return products.filter((p) => p.legacyId !== product.legacyId).slice(0, limit);
}
