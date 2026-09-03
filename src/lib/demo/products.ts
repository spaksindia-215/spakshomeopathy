/**
 * Product demo-data accessors — the UI/visual demo milestone's stand-in
 * for a real repository call (src/lib/mongodb/repositories/productRepository.ts
 * already exists for the real MongoDB path; this file exists so pages can
 * be built and demoed BEFORE that repository has a live database to query).
 *
 * Every function here is deliberately shaped like the equivalent
 * repository method would be — `getProductBySlug` mirrors
 * `ProductRepository.findBySlug`, `getProductsByCategory` mirrors
 * `ProductRepository.findByCategory` — so that swapping a page from demo
 * data to the real repository later is a signature-compatible change to
 * one import line, not a page rewrite. See this directory's `index.ts`
 * for the full "how this gets replaced later" note.
 *
 * DATA SOURCE: `products.generated.ts`, produced by
 * `scripts/generate-demo-fixtures.ts` from the REAL production SQL dump
 * (Database/db_newhomo.sql) via the same extraction/transformation/
 * validation pipeline every M3 migration tool uses. Not invented content.
 */

import { DEMO_PRODUCTS } from './products.generated';
import type { Product } from '../mongodb/schemas';

export function getAllProducts(): Product[] {
  return DEMO_PRODUCTS;
}

/** Mirrors `ProductRepository.findBySlug` — HomeController::ProductDetail. */
export function getProductBySlug(slug: string): Product | undefined {
  return DEMO_PRODUCTS.find((p) => p.pSlug === slug);
}

export function getProductByLegacyId(legacyId: number): Product | undefined {
  return DEMO_PRODUCTS.find((p) => p.legacyId === legacyId);
}

/** Mirrors `ProductRepository.findByCategory` — GetCatProducts/GetAllProducts/
 * TopProducts's pCat-filtered listings. `pCat` is overloaded (see
 * schemas/product.ts's file header) — caller must know which category-tree
 * reading applies, exactly as the real repository method requires. */
export function getProductsByCategory(pCat: number, pStatus = 1): Product[] {
  return DEMO_PRODUCTS.filter((p) => p.pCat === pCat && p.pStatus === pStatus);
}

/** Mirrors `HomeController@GetAllProducts` (`/poducts-list/{cat_slug}`):
 * filters by `p_ocat` (the ORIGINAL category, a separate overloaded field
 * from `pCat` — see schemas/product.ts), not `p_cat`. */
export function getProductsByOcat(pOcat: number, pStatus = 1): Product[] {
  return DEMO_PRODUCTS.filter((p) => p.pOcat === pOcat && p.pStatus === pStatus);
}

/** Mirrors `HomeController@TopProducts`: p_top=1 AND p_status=1. */
export function getTopProducts(): Product[] {
  return DEMO_PRODUCTS.filter((p) => p.pTop === 1 && p.pStatus === 1);
}

/** `p_trending=1 AND p_status=1` — used by pages surfacing trending items. */
export function getTrendingProducts(): Product[] {
  return DEMO_PRODUCTS.filter((p) => p.pTrending === 1 && p.pStatus === 1);
}

/** `p_featured=1 AND p_status=1`. */
export function getFeaturedProducts(): Product[] {
  return DEMO_PRODUCTS.filter((p) => p.pFeatured === 1 && p.pStatus === 1);
}
