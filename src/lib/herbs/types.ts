/**
 * Herbs Store data model.
 *
 * This is a NEW, self-contained data model for the Herbs Store feature
 * (CR-003, §10.5 — "parallel model" decision). It is deliberately NOT a
 * variant of `@/lib/mongodb/schemas/product` (the legacy 75-column
 * `products` mirror): the legacy schema is frozen under migration-contract
 * F-20 and shares nothing conceptually with this feature's fields (herb
 * form, wellness tags, botanical name, structured variants).
 *
 * Shaped deliberately like a future MongoDB collection (`herbProducts`)
 * so a later swap from the static demo layer (`src/lib/herbs/data/*`) to
 * a real repository changes imports, not callers — same convention
 * `src/lib/demo/` already established for the rest of this app.
 */

export type HerbForm =
  | 'whole-herbs'
  | 'powders'
  | 'roots'
  | 'leaves'
  | 'seeds'
  | 'flowers'
  | 'gums-resins'
  | 'herbal-extracts'
  | 'herbal-oils'
  | 'herbal-tea'
  | 'herbal-combinations';

export type WellnessCategory =
  | 'hair-care'
  | 'skin-care'
  | 'digestion'
  | 'immunity'
  | 'joint-care'
  | 'stress-relaxation'
  | 'womens-wellness'
  | 'mens-wellness'
  | 'respiratory-wellness'
  | 'general-wellness'
  | 'weight-management'
  | 'heart-wellness'
  | 'brain-memory';

export interface HerbVariant {
  /** e.g. "50g", "100g", "250g", "1kg" */
  label: string;
  /** Absolute grams/units used only for internal sorting, not displayed */
  sortWeight: number;
  price: number;
  compareAtPrice?: number;
  sku: string;
  stock: number;
}

export interface HerbProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string;
  description: string;
  benefits: string[];
  ingredients: string[];
  botanicalName?: string;
  howToUse: string;
  precautions: string;
  /** Inline SVG placeholder art keys — see `@/components/herbs/HerbArt` */
  image: string;
  gallery: string[];
  form: HerbForm;
  categoryLabel: string;
  wellnessCategories: WellnessCategory[];
  variants: HerbVariant[];
  rating: number;
  reviewCount: number;
  stock: number;
  status: 'active' | 'out-of-stock' | 'draft';
  featured: boolean;
  bestseller: boolean;
  newArrival: boolean;
  tags: string[];
  metaTitle: string;
  metaDescription: string;
  createdAt: string;
  updatedAt: string;
}

export interface HerbFormCategory {
  form: HerbForm;
  label: string;
  description: string;
  icon: string;
}

export interface WellnessCategoryInfo {
  key: WellnessCategory;
  label: string;
  description: string;
  icon: string;
}

export interface HerbTestimonial {
  id: string;
  name: string;
  location: string;
  rating: number;
  quote: string;
}

export interface HerbArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  readTime: string;
  category: string;
}

export type SortOption = 'featured' | 'popular' | 'newest' | 'price-asc' | 'price-desc' | 'rating';

/** Lowest-price variant, used for card price display and price-sort. */
export function getLeadVariant(product: HerbProduct): HerbVariant | undefined {
  if (product.variants.length === 0) return undefined;
  return [...product.variants].sort((a, b) => a.price - b.price)[0];
}

export function getDiscountPercent(price: number, compareAt?: number): number | undefined {
  if (!compareAt || compareAt <= price) return undefined;
  return Math.round(((compareAt - price) / compareAt) * 100);
}
