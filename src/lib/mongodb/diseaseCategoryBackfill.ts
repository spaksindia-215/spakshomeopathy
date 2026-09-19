/**
 * Pure computation for `scripts/backfill-disease-category-ids.ts` — CR-006
 * Phase 5. Extracted so it can be unit-tested directly, following this
 * codebase's own established pattern of keeping a CLI script's actual
 * logic in `src/lib/` (e.g. `migrate-to-mongodb.ts`'s use of
 * `getAcceptedDocuments`) rather than inlining it where only an
 * end-to-end script run could exercise it.
 */

/**
 * The value `diseaseCategoryIds` should be backfilled to for a product
 * whose current `pCat` is `pCat` — `[pCat]` when a category is set,
 * `[]` when it isn't. See `schemas/product.ts`'s own doc comment on
 * `diseaseCategoryIds` for the full justification (this preserves every
 * product's EXISTING single-disease association exactly).
 */
export function diseaseCategoryIdsFor(pCat: number | null | undefined): number[] {
  return pCat !== null && pCat !== undefined ? [pCat] : [];
}
