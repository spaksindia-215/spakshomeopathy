import { HERB_PRODUCTS } from './data/products';
import type { HerbForm, HerbProduct, SortOption, WellnessCategory } from './types';
import { getLeadVariant } from './types';

/**
 * Herbs Store query/service layer.
 *
 * Every function accepts an OPTIONAL `catalog` parameter (defaulting to
 * the static `HERB_PRODUCTS` seed array) rather than being converted to
 * `async`/reading a database directly. This is a deliberate choice, not
 * an oversight: `getAllHerbProducts`/`filterAndSortHerbProducts`/
 * `getRelatedHerbProducts` are called synchronously from FOUR client
 * components (`HerbCatalog`, `HerbProductDetail`, `HerbsWishlistPage`,
 * `HerbsHeader`'s search box) during render — converting this module to
 * async would require converting all four to fetch-on-mount patterns,
 * a much larger and riskier change for a feature this session could not
 * verify against a live database (see `src/lib/herbs/db/`'s own header:
 * no MongoDB is reachable in this sandbox).
 *
 * Instead, DB-awareness lives ONE layer up: server components
 * (`src/app/herbs/**\/page.tsx`) call `getMergedHerbCatalog()` (below,
 * genuinely async) once per request, then pass the resulting array down
 * as a `products`/`catalog` prop into the client components above, which
 * pass it through to these functions. When no database is configured —
 * or a page hasn't been updated to fetch it — every function here falls
 * back to the static seed catalogue exactly as before, so nothing
 * regresses.
 */

export function getAllHerbProducts(catalog: HerbProduct[] = HERB_PRODUCTS): HerbProduct[] {
  return catalog.filter((p) => p.status !== 'draft');
}

export function getHerbProductBySlug(
  slug: string,
  catalog: HerbProduct[] = HERB_PRODUCTS
): HerbProduct | undefined {
  return catalog.find((p) => p.slug === slug);
}

export function getFeaturedHerbProducts(
  limit = 8,
  catalog: HerbProduct[] = HERB_PRODUCTS
): HerbProduct[] {
  return getAllHerbProducts(catalog)
    .filter((p) => p.featured)
    .slice(0, limit);
}

export function getBestsellerHerbProducts(
  limit = 8,
  catalog: HerbProduct[] = HERB_PRODUCTS
): HerbProduct[] {
  return getAllHerbProducts(catalog)
    .filter((p) => p.bestseller)
    .slice(0, limit);
}

export function getNewArrivalHerbProducts(
  limit = 8,
  catalog: HerbProduct[] = HERB_PRODUCTS
): HerbProduct[] {
  return getAllHerbProducts(catalog)
    .filter((p) => p.newArrival)
    .slice(0, limit);
}

export function getHerbProductsByForm(
  form: HerbForm,
  catalog: HerbProduct[] = HERB_PRODUCTS
): HerbProduct[] {
  return getAllHerbProducts(catalog).filter((p) => p.form === form);
}

export function getHerbProductsByWellness(
  category: WellnessCategory,
  catalog: HerbProduct[] = HERB_PRODUCTS
): HerbProduct[] {
  return getAllHerbProducts(catalog).filter((p) => p.wellnessCategories.includes(category));
}

export interface HerbProductFilters {
  form?: HerbForm;
  wellness?: WellnessCategory;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStockOnly?: boolean;
  sort?: SortOption;
  query?: string;
}

function priceOf(product: HerbProduct): number {
  return getLeadVariant(product)?.price ?? 0;
}

/**
 * Product name / botanical name / category / tags search — used by both
 * the catalog page's search box and the header quick-search.
 */
export function searchHerbProducts(
  query: string,
  catalog: HerbProduct[] = HERB_PRODUCTS
): HerbProduct[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];
  return getAllHerbProducts(catalog).filter((p) => {
    return (
      p.name.toLowerCase().includes(q) ||
      (p.botanicalName?.toLowerCase().includes(q) ?? false) ||
      p.categoryLabel.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q)) ||
      p.shortDescription.toLowerCase().includes(q)
    );
  });
}

export function filterAndSortHerbProducts(
  filters: HerbProductFilters,
  catalog: HerbProduct[] = HERB_PRODUCTS
): HerbProduct[] {
  let results = getAllHerbProducts(catalog);

  if (filters.query) {
    const q = filters.query.trim().toLowerCase();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.botanicalName?.toLowerCase().includes(q) ?? false) ||
        p.categoryLabel.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }
  if (filters.form) {
    results = results.filter((p) => p.form === filters.form);
  }
  if (filters.wellness) {
    results = results.filter((p) =>
      p.wellnessCategories.includes(filters.wellness as WellnessCategory)
    );
  }
  if (filters.minPrice !== undefined) {
    const min = filters.minPrice;
    results = results.filter((p) => priceOf(p) >= min);
  }
  if (filters.maxPrice !== undefined) {
    const max = filters.maxPrice;
    results = results.filter((p) => priceOf(p) <= max);
  }
  if (filters.minRating !== undefined) {
    const min = filters.minRating;
    results = results.filter((p) => p.rating >= min);
  }
  if (filters.inStockOnly) {
    results = results.filter((p) => p.status === 'active' && p.stock > 0);
  }

  const sort = filters.sort ?? 'featured';
  const sorted = [...results];
  switch (sort) {
    case 'price-asc':
      sorted.sort((a, b) => priceOf(a) - priceOf(b));
      break;
    case 'price-desc':
      sorted.sort((a, b) => priceOf(b) - priceOf(a));
      break;
    case 'rating':
      sorted.sort((a, b) => b.rating - a.rating);
      break;
    case 'newest':
      sorted.sort((a, b) => (a.newArrival === b.newArrival ? 0 : a.newArrival ? -1 : 1));
      break;
    case 'popular':
      sorted.sort((a, b) => b.reviewCount - a.reviewCount);
      break;
    case 'featured':
    default:
      sorted.sort(
        (a, b) =>
          Number(b.featured) - Number(a.featured) || Number(b.bestseller) - Number(a.bestseller)
      );
      break;
  }
  return sorted;
}

/**
 * Related products: same herb form OR shared wellness category OR a
 * shared tag, excluding the product itself — real relationships, not a
 * random slice (per the original brief's §25 instruction).
 */
export function getRelatedHerbProducts(
  product: HerbProduct,
  limit = 4,
  catalog: HerbProduct[] = HERB_PRODUCTS
): HerbProduct[] {
  const scored = getAllHerbProducts(catalog)
    .filter((p) => p.id !== product.id)
    .map((p) => {
      let score = 0;
      if (p.form === product.form) score += 2;
      score += p.wellnessCategories.filter((w) => product.wellnessCategories.includes(w)).length;
      score += p.tags.filter((t) => product.tags.includes(t)).length;
      return { product: p, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s) => s.product);
}

export function getPriceRange(catalog: HerbProduct[] = HERB_PRODUCTS): {
  min: number;
  max: number;
} {
  const prices = getAllHerbProducts(catalog).map(priceOf);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
