/**
 * Zod schema for the `wellnessCategories` MongoDB collection — CR-006
 * Phase 6 (`docs/CR-006-PHASE-6-PLAN.md` §2.1/§3).
 *
 * GENUINELY NEW ADMIN SURFACE, NOT A MIGRATION: this taxonomy has no
 * Laravel table to trace to. It replaces the hardcoded
 * `WELLNESS_CATEGORIES` constant in `@/lib/herbs/data/taxonomy` with a
 * database-backed, admin-manageable collection, following the exact
 * "net-new, kept in its own module tree" precedent `./schema.ts`
 * (`herbProductDocSchema`) already established for this parallel model —
 * NOT added to `src/lib/mongodb/schemas/`, which is a governed, 1:1-traced
 * artifact of the legacy MariaDB schema.
 *
 * `key` is the same stable slug values the static constant already used
 * (e.g. "hair-care") — existing herb documents' `wellnessCategories`
 * arrays reference these keys and are NOT migrated or renamed; the seed
 * script (`scripts/seed-wellness-categories.ts`) populates this
 * collection with matching keys so every existing reference keeps
 * resolving to a real category.
 */

import { z } from 'zod';

export const wellnessCategoryDocSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  description: z.string(),
  icon: z.string(),
  /** Controls display order on `/herbs/wellness` and in the admin picker. */
  sortOrder: z.number().int(),
  /** Soft-delete flag — 'hidden' categories are excluded from the public
   * page and the admin herb-tagging picker but are NOT deleted, so
   * existing herb documents referencing the key don't dangle. See
   * Phase 6 plan §5/§7.2. */
  status: z.enum(['active', 'hidden']),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type WellnessCategoryDoc = z.infer<typeof wellnessCategoryDocSchema>;
