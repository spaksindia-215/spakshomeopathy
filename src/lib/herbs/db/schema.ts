/**
 * Zod schema for the `herbProducts` MongoDB collection — the persistence
 * shape backing the Herbs Store's product catalogue (CR-003 §10.5:
 * "Parallel model. A new `herbProducts` MongoDB collection... fully
 * separate from the legacy `products` table/schema").
 *
 * Deliberately NOT added to `src/lib/mongodb/schemas/` or
 * `src/lib/mongodb/collections.ts` — those files are a governed,
 * 1:1-traced artifact of the 34-table legacy MariaDB schema (see
 * `collections.ts`'s own header). This schema has no Laravel table to
 * trace to; it is net-new surface area, kept in its own module tree
 * (`src/lib/herbs/db/`) so that separation stays structurally obvious,
 * not just a comment.
 *
 * Field shape mirrors `@/lib/herbs/types`'s `HerbProduct` /
 * `HerbVariant` interfaces exactly, so a document read from this
 * collection is assignable to the same type the static demo catalogue
 * (`@/lib/herbs/data/products`) already produces — no page or component
 * needs to change shape when the data source changes.
 */

import { z } from 'zod';

export const herbFormSchema = z.enum([
  'whole-herbs',
  'powders',
  'roots',
  'leaves',
  'seeds',
  'flowers',
  'gums-resins',
  'herbal-extracts',
  'herbal-oils',
  'herbal-tea',
  'herbal-combinations',
]);

/**
 * Loosened from a closed `z.enum([...13 literals])` to a plain non-empty
 * string in CR-006 Phase 6 (`docs/CR-006-PHASE-6-PLAN.md` §2.2): the
 * wellness taxonomy is now database-backed
 * (`./wellnessCategorySchema.ts`'s `wellnessCategories` collection), so
 * new categories can be added by an admin without a code change — a
 * closed compile-time enum would reject any key added after this file
 * was written. Referential validity (does this key correspond to a real,
 * active category) is enforced at the admin-form layer, which only offers
 * keys from `WellnessCategoryRepository.findAllActive()`, not at this
 * Zod-schema layer — same "don't tighten validation beyond source"
 * convention Phase 5 used for `diseaseCategoryIds`.
 */
export const wellnessCategorySchema = z.string().min(1);

export const herbVariantSchema = z.object({
  label: z.string().min(1),
  sortWeight: z.number(),
  price: z.number().nonnegative(),
  compareAtPrice: z.number().nonnegative().optional(),
  sku: z.string(),
  stock: z.number().int().nonnegative(),
});

export const herbProductDocSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  sku: z.string(),
  shortDescription: z.string(),
  description: z.string(),
  benefits: z.array(z.string()),
  ingredients: z.array(z.string()),
  botanicalName: z.string().optional(),
  howToUse: z.string(),
  precautions: z.string(),
  image: z.string(),
  gallery: z.array(z.string()),
  form: herbFormSchema,
  categoryLabel: z.string(),
  wellnessCategories: z.array(wellnessCategorySchema),
  variants: z.array(herbVariantSchema),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative(),
  status: z.enum(['active', 'out-of-stock', 'draft']),
  featured: z.boolean(),
  bestseller: z.boolean(),
  newArrival: z.boolean(),
  tags: z.array(z.string()),
  metaTitle: z.string(),
  metaDescription: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type HerbProductDoc = z.infer<typeof herbProductDocSchema>;
