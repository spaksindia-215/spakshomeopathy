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

/** Related products: same `pCat`, or other cosmetics for cosmetic items. */
export async function getRelatedHomeopathyProducts(
  product: Product,
  limit: number
): Promise<Product[]> {
  // If this is a cosmetic product, return other cosmetic products
  if (
    'cosmeticType' in product ||
    (product.legacyId && product.legacyId >= 8000 && product.legacyId <= 8050)
  ) {
    try {
      const { getCosmeticsCatalog } = await import('@/lib/cosmetics/catalog');
      const cosmetics = await getCosmeticsCatalog();
      return cosmetics.filter((p) => p.legacyId !== product.legacyId).slice(0, limit);
    } catch {
      // fallback
    }
  }

  if (product.pCat === null || product.pCat === undefined) return [];
  const products = await getProductsByCategoryLive(product.pCat, 1);
  return products.filter((p) => p.legacyId !== product.legacyId).slice(0, limit);
}

/**
 * Find a product by its slug across MongoDB products collection,
 * admin-added Mother Tincture database, cosmetics catalog, and demo fixture fallback.
 */
export async function getProductBySlugLive(slug: string): Promise<Product | null> {
  if (!slug) return null;

  // 1. Query MongoDB products collection (all 397+ live products)
  try {
    const db = await getDb();
    const repo = new ProductRepository(db);
    const product = await repo.findBySlug(slug);
    if (product) return product;
  } catch (err) {
    console.error('Failed to query product from MongoDB by slug:', err);
  }

  // 2. Query Cosmetics catalog (curated + DB cosmetics)
  try {
    const { getCosmeticsCatalog } = await import('@/lib/cosmetics/catalog');
    const cosmetics = await getCosmeticsCatalog();
    if (cosmetics && cosmetics.length > 0) {
      const decoded = decodeURIComponent(slug).toLowerCase();
      const cosmetic = cosmetics.find(
        (p) =>
          p.pSlug === slug ||
          p.pSlug === decodeURIComponent(slug) ||
          p.pSlug?.toLowerCase() === decoded ||
          String(p.legacyId) === slug
      );
      if (cosmetic) return cosmetic;
    }
  } catch (err) {
    console.error('Failed to query cosmetic product by slug:', err);
  }

  // 3. Query admin-added Mother Tincture products
  try {
    const { readMotherTinctureProductsFromDb } = await import('@/lib/motherTincture/db/service');
    const mtDocs = await readMotherTinctureProductsFromDb();
    if (mtDocs && mtDocs.length > 0) {
      const decoded = decodeURIComponent(slug).toLowerCase();
      const mt = mtDocs.find(
        (p) =>
          p.pSlug === slug ||
          p.pSlug === decodeURIComponent(slug) ||
          p.pSlug?.toLowerCase() === decoded
      );
      if (mt) return mt;
    }
  } catch (err) {
    console.error('Failed to query mother tincture product by slug:', err);
  }

  // 4. Fallback to demo fixture products
  const { getProductBySlug: getDemoProductBySlug, getAllProducts } = await import(
    '@/lib/demo/products'
  );
  const decoded = decodeURIComponent(slug);
  const demo =
    getDemoProductBySlug(slug) ??
    getDemoProductBySlug(decoded) ??
    getAllProducts().find(
      (p) =>
        p.pSlug?.toLowerCase() === slug.toLowerCase() ||
        p.pSlug?.toLowerCase() === decoded.toLowerCase()
    );
  if (demo) return demo;

  return null;
}

