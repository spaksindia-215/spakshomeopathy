/**
 * Pure, client-safe derivation helpers for the `/homeopathy` storefront —
 * ranking, filtering-by-already-fetched-pool, grouping, and text
 * excerpting. No MongoDB/Node-only imports belong in this file: it is
 * imported directly by `'use client'` components (`HomeopathyCatalog`,
 * `QuickViewModal`). The MongoDB-backed fetchers (`getActiveProducts()`,
 * `getProductsByCategoryLive()`, etc.) live in `./liveQueries.ts`, a
 * server-only sibling module — see that file's header for why the split
 * exists and what replaced the 125-row curated demo fixture these once
 * read from.
 */

import type { Product } from '@/lib/mongodb/schemas';
import { extractYoutubeVideoId } from '@/lib/videos/schema';

export type SortOption = 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'rating';

export const SORT_LABELS: Record<SortOption, string> = {
  featured: 'Featured',
  newest: 'Newest',
  'price-asc': 'Price: Low to High',
  'price-desc': 'Price: High to Low',
  rating: 'Rating',
};

function discountDepth(p: Product): number {
  const mrp = p.pMrp ?? 0;
  const price = p.pPrice ?? 0;
  if (!mrp || !price || mrp <= price) return 0;
  return (mrp - price) / mrp;
}

/** Deterministic "featured" ranking — see file header DEVIATION NOTE.
 * Highest rating first, then deepest discount, stable by name otherwise.
 * `pool` is required (not fetched internally) since this is also called
 * from client components, which cannot reach MongoDB directly — callers
 * fetch with `getActiveProducts()` server-side and pass the result down. */
export function getHomeopathyFeaturedProducts(limit: number, pool: Product[]): Product[] {
  const source = pool;
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
export function getHomeopathyBestsellers(limit: number, pool: Product[]): Product[] {
  const source = pool;
  const ranked = [...source].sort((a, b) => {
    const ratingDiff = (b.pRating ?? 0) - (a.pRating ?? 0);
    if (ratingDiff !== 0) return ratingDiff;
    return discountDepth(b) - discountDepth(a);
  });
  return ranked.slice(limit, limit * 2);
}

/** Real `createdAt`-based "new arrivals". */
export function getHomeopathyNewArrivals(limit: number, pool: Product[]): Product[] {
  const source = pool;
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

export function getHomeopathyPriceRange(pool: Product[]): { min: number; max: number } {
  const prices = pool.map((p) => p.pPrice ?? 0).filter((p) => p > 0);
  if (prices.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...prices), max: Math.max(...prices) };
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

export interface ProductVideoInfo {
  videoId: string;
  url: string;
  title: string;
  isCustom: boolean;
}

export interface ProductVideoQueryOptions {
  /** Product title or name */
  title?: string | null;
  /** Primary category or type (e.g. 'Face Wash', 'Skincare', 'Cosmetics', 'Homeopathy') */
  category?: string | null;
  /** Active botanical / pharmaceutical ingredients (e.g. ['Echinacea', 'Thuja']) */
  activeIngredients?: string[] | string | null;
  /** Product tags or disease labels */
  tags?: string[] | string | null;
  /** SKU or product ID */
  sku?: string | number | null;
  /** Additional search keywords */
  searchTerms?: string | null;
}

/**
 * Resolves the most relevant YouTube video for any homeopathy/cosmetics product:
 * 1. If `product.videoLink` is provided, parses and uses that custom video URL.
 * 2. If `product.pDesc` already contains a YouTube embed, extracts its ID.
 * 3. Dynamically filters by product title, active ingredients, category, and tags
 *    using strict relevance checking.
 * 4. If no strictly matching clinical or product-specific video is found, returns
 *    `null` so the video section is hidden entirely instead of showing an
 *    unrelated generic or clinical fallback (such as spine/back pain tutorials).
 */
export function getProductRelatedVideo(
  product: Product,
  options?: ProductVideoQueryOptions
): ProductVideoInfo | null {
  // 1. Explicit product videoLink
  if (product.videoLink) {
    const customId = extractYoutubeVideoId(product.videoLink);
    if (customId) {
      return {
        videoId: customId,
        url: `https://www.youtube.com/watch?v=${customId}`,
        title: product.pHeading || product.pName || 'Product',
        isCustom: true,
      };
    }
  }

  // 2. Check if pDesc already has a youtube embed ID
  if (product.pDesc) {
    const embedId = extractYoutubeVideoId(product.pDesc);
    if (embedId) {
      return {
        videoId: embedId,
        url: `https://www.youtube.com/watch?v=${embedId}`,
        title: product.pHeading || product.pName || 'Product',
        isCustom: true,
      };
    }
  }

  // 3. Compile contextual search parameters & active ingredients
  const passedTitle = options?.title ?? product.pName ?? product.pHeading ?? '';
  const passedCategory =
    options?.category ??
    (product as { cosmeticType?: string })?.cosmeticType ??
    '';
  const passedIngredients = Array.isArray(options?.activeIngredients)
    ? options.activeIngredients.join(' ')
    : options?.activeIngredients ?? '';
  const passedTags = Array.isArray(options?.tags)
    ? options.tags.join(' ')
    : options?.tags ?? '';
  const passedSearchTerms = options?.searchTerms ?? product.searchTerms ?? '';

  const heading = product.pHeading || product.pName || 'Medicine';

  const searchCorpus = [
    passedTitle,
    passedCategory,
    passedIngredients,
    passedTags,
    passedSearchTerms,
    product.pHeading ?? '',
    product.pName ?? '',
    product.pShortDesc ?? '',
    product.pDesc ?? '',
    product.pSlug ?? '',
  ]
    .join(' ')
    .toLowerCase();

  const matches = (pattern: RegExp) => pattern.test(searchCorpus);

  // Identify skincare, face wash, cosmetics, cleanser, or topical beauty products
  const isSkincareOrCosmetic = matches(
    /\b(face\s*wash|cleanser|cleansing|skincare|skin\s*care|face\s*care|cosmetic|blemish|acne|pimple|blackhead|whitehead|pore|sebum|face\s*cream|glow\s*cream|sunscreen|photoprotection|spf|lotion|serum|complexion|radiance|kumkumadi|ubtan|haldi|chandan|neem|tulsi|echinacea|thuja|berberis|silicea|salicylic|niacinamide|ceramide|hyaluronic)\b/i
  );

  // Hair fall, Dandruff, Scalp, Alopecia, Hair Oil, Hair Tonic
  if (
    matches(
      /\b(hair\s*fall|hair\s*loss|hair\s*tonic|hair\s*oil|dandruff|alopecia|bald|scalp|kesh|bhringraj|jaborandi)\b/i
    )
  ) {
    return {
      videoId: 'kRhNIVf6qUg',
      url: 'https://www.youtube.com/watch?v=kRhNIVf6qUg',
      title: `${heading} — Related Hair Care & Scalp Treatment Guide`,
      isCustom: false,
    };
  }

  // Back pain, Spine, Spondylitis, Sciatica (Strict check: never match skincare/cosmetics)
  if (
    !isSkincareOrCosmetic &&
    matches(
      /\b(spondyl|back\s*pain|spine|vertebra|cervical|sciatica|slip\s*disc|lumbar|sacroiliac)\b/i
    )
  ) {
    return {
      videoId: 'lbK28woDbgk',
      url: 'https://www.youtube.com/watch?v=lbK28woDbgk',
      title: `${heading} — Related Spine & Back Pain Care Guide`,
      isCustom: false,
    };
  }

  // Arthritis / Joint pain / Gout / Rheumatoid
  if (
    !isSkincareOrCosmetic &&
    matches(/\b(arthritis|rheumatoid|osteoarthritis|gout|joint\s*pain|swollen\s*joint|uric\s*acid)\b/i)
  ) {
    return {
      videoId: '90lb6TwFMX4',
      url: 'https://www.youtube.com/watch?v=90lb6TwFMX4',
      title: `${heading} — Related Arthritis & Joint Care Guide`,
      isCustom: false,
    };
  }

  // Female health, Vaginitis, PCOD, Periods, Leucorrhoea
  if (
    !isSkincareOrCosmetic &&
    matches(
      /\b(female|vaginit|pcod|pcos|leucorrh|uter|ovary|period|menses|menopaus|white\s*discharge)\b/i
    )
  ) {
    return {
      videoId: '_ev-w9J347g',
      url: 'https://www.youtube.com/watch?v=_ev-w9J347g',
      title: `${heading} — Related Women's Health Treatment Guide`,
      isCustom: false,
    };
  }

  // Diabetes, Sugar, Thyroid, Lifestyle, Blood Pressure
  if (
    !isSkincareOrCosmetic &&
    matches(/\b(diabet|sugar|madhumeh|thyroid|obesity|hypertens|cholesterol|high\s*bp)\b/i)
  ) {
    return {
      videoId: '-cyfQkEp510',
      url: 'https://www.youtube.com/watch?v=-cyfQkEp510',
      title: `${heading} — Related Diabetes & Lifestyle Health Guide`,
      isCustom: false,
    };
  }

  // Headache, Migraine, Brain, Neurological, Stress
  if (
    !isSkincareOrCosmetic &&
    matches(/\b(headache|migraine|brain|stress|anxiety|insomnia|vertigo)\b/i)
  ) {
    return {
      videoId: 'ABYZYvUdiZo',
      url: 'https://www.youtube.com/watch?v=ABYZYvUdiZo',
      title: `${heading} — Related Headache & Neurological Relief Guide`,
      isCustom: false,
    };
  }

  // Male health, Prostate
  if (
    !isSkincareOrCosmetic &&
    matches(/\b(prostate|erectile|hydrocele)\b/i)
  ) {
    return {
      videoId: 'JLsDnhwTRzM',
      url: 'https://www.youtube.com/watch?v=JLsDnhwTRzM',
      title: `${heading} — Related Men's Health & Prostate Guide`,
      isCustom: false,
    };
  }

  // Stomach, Gastric, Acidity, Digestion, Piles, Liver, Cholera
  if (
    !isSkincareOrCosmetic &&
    matches(
      /\b(stomach|digest|gastric|acidity|piles|constipat|fistula|fissure|diarrh|cholera|liver|bowel|gerd|ulcer|vomit)\b/i
    )
  ) {
    return {
      videoId: 'Yklv9k_W-8A',
      url: 'https://www.youtube.com/watch?v=Yklv9k_W-8A',
      title: `${heading} — Related Stomach & Digestion Care Guide`,
      isCustom: false,
    };
  }

  // Ganglion Cysts / Wrist lumps
  if (
    !isSkincareOrCosmetic &&
    matches(/\b(ganglion|ganglion\s*cyst|wrist\s*cyst|wrist\s*lump)\b/i)
  ) {
    return {
      videoId: 'znEUQ1nL4DM',
      url: 'https://www.youtube.com/watch?v=znEUQ1nL4DM',
      title: `${heading} — Related Ganglion & Cyst Treatment Guide`,
      isCustom: false,
    };
  }

  // Strict relevance check: if no relevant product or clinical video matches,
  // return null so the video section is hidden entirely.
  return null;
}
