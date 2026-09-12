/**
 * Query/derivation helpers for the `/homeopathy` storefront. This is a
 * thin presentation-layer helper on top of the REAL data accessors in
 * `@/lib/demo/products` and `@/lib/demo/categories` — it does not define
 * a parallel schema or invent any product/category content. Every
 * function here operates on the real `Product`/`Category` types from
 * `@/lib/mongodb/schemas`.
 *
 * DEVIATION NOTE: the curated demo dataset behind `getAllProducts()` has
 * 125 real active products (`pStatus: 1`) — not the 287 total rows the
 * task brief assumed (287 is the full generated-fixture row count before
 * the demo curation/status filtering the accessors themselves apply).
 * Likewise `getFeaturedProducts()`, `getTopProducts()` and
 * `getTrendingProducts()` all return an empty array because every row's
 * `pFeatured`/`pTop`/`pTrending` flag is `null` in this curated set (not
 * populated during curation). Rather than render empty homepage sections,
 * "Featured" / "Bestsellers" / "New Arrivals" below are derived
 * deterministically from real fields that ARE populated on every row
 * (`pRating`, discount depth from `pMrp` vs `pPrice`, and `createdAt`),
 * exactly as a real storefront would rank by rating/discount/recency
 * when explicit merchandising flags aren't set — no product data is
 * invented, only the derivation is: it always resolves against the real
 * catalogue.
 */

import { getAllProducts, getProductsByCategory } from '@/lib/demo/products';
import type { Product } from '@/lib/mongodb/schemas';

export type SortOption = 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'rating';

export const SORT_LABELS: Record<SortOption, string> = {
  featured: 'Featured',
  newest: 'Newest',
  'price-asc': 'Price: Low to High',
  'price-desc': 'Price: High to Low',
  rating: 'Rating',
};

/** All active (`pStatus: 1`) real products — the base catalogue for the
 * storefront. `getAllProducts()` already returns only curated rows, all
 * of which are `pStatus: 1` in the current dataset, but this filter is
 * kept explicit so behavior stays correct if that ever changes. */
export function getActiveProducts(): Product[] {
  return getAllProducts().filter((p) => p.pStatus === 1);
}

function discountDepth(p: Product): number {
  const mrp = p.pMrp ?? 0;
  const price = p.pPrice ?? 0;
  if (!mrp || !price || mrp <= price) return 0;
  return (mrp - price) / mrp;
}

/** Deterministic "featured" ranking — see file header DEVIATION NOTE.
 * Highest rating first, then deepest discount, stable by name otherwise. */
export function getHomeopathyFeaturedProducts(limit: number, pool?: Product[]): Product[] {
  const source = pool ?? getActiveProducts();
  return [...source]
    .sort((a, b) => {
      const ratingDiff = (b.pRating ?? 0) - (a.pRating ?? 0);
      if (ratingDiff !== 0) return ratingDiff;
      return discountDepth(b) - discountDepth(a);
    })
    .slice(0, limit);
}

/** Deterministic "bestsellers" ranking — highest rating, deepest discount
 * as tiebreaker, offset from the featured slice so the homepage's
 * Featured/Bestsellers sections don't show identical products. */
export function getHomeopathyBestsellers(limit: number, pool?: Product[]): Product[] {
  const source = pool ?? getActiveProducts();
  const ranked = [...source].sort((a, b) => {
    const ratingDiff = (b.pRating ?? 0) - (a.pRating ?? 0);
    if (ratingDiff !== 0) return ratingDiff;
    return discountDepth(b) - discountDepth(a);
  });
  return ranked.slice(limit, limit * 2);
}

/** Real `createdAt`-based "new arrivals". */
export function getHomeopathyNewArrivals(limit: number, pool?: Product[]): Product[] {
  const source = pool ?? getActiveProducts();
  return [...source]
    .sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bt - at;
    })
    .slice(0, limit);
}

export interface HomeopathyProductFilters {
  /** `Category.legacyId` — resolves against `product.pCat`. */
  categoryId?: number;
  sort?: SortOption;
}

export function filterAndSortHomeopathyProducts(filters: HomeopathyProductFilters): Product[] {
  const base =
    filters.categoryId !== undefined
      ? getProductsByCategory(filters.categoryId, 1)
      : getActiveProducts();

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

export function getHomeopathyPriceRange(pool?: Product[]): { min: number; max: number } {
  const source = pool ?? getActiveProducts();
  const prices = source.map((p) => p.pPrice ?? 0).filter((p) => p > 0);
  if (prices.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/** Related products: same `pCat`, excluding the product itself. */
export function getRelatedHomeopathyProducts(product: Product, limit: number): Product[] {
  if (product.pCat === null || product.pCat === undefined) return [];
  return getProductsByCategory(product.pCat, 1)
    .filter((p) => p.legacyId !== product.legacyId)
    .slice(0, limit);
}

/** One disease "bucket" within a category — see `groupProductsByDisease`. */
export interface DiseaseGroup {
  /** Raw `pHeading` value shared by every product in this group (e.g.
   * "Arthritis"), used as the display label. */
  heading: string;
  /** URL-safe form of `heading`, used as the route param in
   * `/homeopathy/category/[slug]/[disease]` — lowercased/hyphenated, not a
   * stored slug (no such field exists on `categories`/`products` for this
   * disease grouping, it's derived purely for routing). */
  key: string;
  products: Product[];
}

/** Turns `key` (from a `/homeopathy/category/[slug]/[disease]` route param)
 * back into a comparable form — mirrors the encoding in
 * `groupProductsByDisease` so a group can be found by its route param. */
export function diseaseKeyFromHeading(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Groups a category's products by `pHeading` — the disease/condition name
 * shown as each product card's green label (e.g. "Arthritis", "Back
 * pain"). `categories` (the `type: 'N'` disease tree) has no stored
 * subcategory table of its own, so the disease grouping a shopper expects
 * under a category (Bones -> Arthritis -> the Arthritis medicine) is
 * derived here from the real, populated `pHeading` field rather than
 * inventing a new taxonomy. In the current catalogue every disease within
 * a category maps to exactly one product, but this groups correctly if a
 * category ever carries more than one product per disease.
 */
export function groupProductsByDisease(products: Product[]): DiseaseGroup[] {
  const groups = new Map<string, DiseaseGroup>();
  for (const p of products) {
    const heading = (p.pHeading || '').trim();
    if (!heading) continue;
    const key = diseaseKeyFromHeading(heading);
    const existing = groups.get(key);
    if (existing) existing.products.push(p);
    else groups.set(key, { heading, key, products: [p] });
  }
  return [...groups.values()].sort((a, b) => a.heading.localeCompare(b.heading));
}

/** Plain-text excerpt from `pDesc`'s HTML for card/PDP short-description
 * slots — every real product's `pShortDesc` field is null in this
 * dataset, so the short description is derived from `pDesc` (stripped of
 * HTML tags) rather than left blank, falling back to `pHeading`. */
export function getShortDescription(product: Product, maxLength = 160): string {
  const source = product.pShortDesc || product.pDesc || product.pHeading || '';
  const text = source
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}
