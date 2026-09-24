/**
 * `products` collection schema.
 *
 * SOURCE: MariaDB `products` — VERIFIED 75 COLUMNS, not the blueprint's
 * stated 83 (BCN-DB-01, docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md §13,
 * re-confirmed against the verified production export in
 * docs/GATE-REPORT-M3.md §7). Full column list:
 * `Database/db_newhomo.sql:18352-18422`.
 *
 * F-20 (contract): "Normalizing the 83-column products table or its 10
 * inline variant slots" is FORBIDDEN. This schema does not restructure the
 * 10 variant slots into an array — each slot's fields are individually
 * named, exactly mirroring the source column names (translated to
 * camelCase, not renamed in meaning).
 *
 * `product_images`, `product_review`, `product_specification` are embedded
 * as arrays per docs/M3-DATABASE-MAPPING.md §1.2 (Option A — every one of
 * 11 join sites reads products+images together; zero live code path reads
 * any of the three independently of its parent product).
 *
 * `product_features`/`product_variations`/`product_pkg` (also 1:N by
 * convention on products.id) are NOT embedded and NOT referenced here —
 * they are VESTIGIAL, read by no live code, and DR-02 (their collection
 * placement) is not yet approved. See collections.ts.
 *
 * `p_cat` OVERLOADED MEANING (docs/M3-DATABASE-MAPPING.md §1.2): resolves
 * against `categories.id` in some controller methods, `productCategories.id`
 * (was product_category) in others — preserved as a plain number field,
 * NOT split into two differently-named fields. Which collection a given
 * value resolves against is pure application logic (which controller/route
 * is reading it), unaffected by storage engine — do not "fix" this by
 * disambiguating the field.
 *
 * `diseaseCategoryIds` (CR-006 Phase 5, docs/CR-006-PHASE-5-PLAN.md §2.1,
 * docs/D-11-FOLLOWUP-CR006-SCHEMA-AUTHORIZATION.md): the ONE additive,
 * genuinely new field in this schema — no source column. See its own
 * inline doc comment below for the full justification. `pCat` is
 * UNCHANGED by this addition.
 */

import { z } from 'zod';
import { legacyIdSchema, nullableIntSchema, nullableStringSchema, timestampSchema } from './common';

/** Embedded, was `product_images` (5 columns: id, p_id, p_image + timestamps
 * not tracked separately in source per DATABASE-ANALYSIS-MARIADB-SOURCE.md
 * §1). */
export const productImageSchema = z.object({
  legacyId: legacyIdSchema,
  pImage: nullableStringSchema,
});

/** Embedded, was `product_review` (9 columns). Currently 0 rows in
 * production (docs/M3-DATA-MIGRATION-MAP.md §1) — the array will be empty
 * on every migrated product, which is the correct parity outcome for a
 * 0-row source table, not a bug. */
export const productReviewSchema = z.object({
  legacyId: legacyIdSchema,
  rName: nullableStringSchema,
  rEmail: nullableStringSchema,
  rRating: nullableIntSchema,
  rReview: nullableStringSchema,
  rStatus: nullableIntSchema,
});

/** Embedded, was `product_specification` (6 columns). `pId` is NOT NULL in
 * source (docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md §6) — the only
 * FK-by-convention column in the schema that is itself non-nullable, though
 * still unconstrained (no FK). Embedding makes this note moot (the
 * "foreign key" is now structural, not a column) but preserved here for
 * traceability. */
export const productSpecificationSchema = z.object({
  legacyId: legacyIdSchema,
  pHeading: nullableStringSchema,
  pSpecification: nullableStringSchema,
});

/**
 * One variant slot's shape (slots 2-10 share this shape exactly; slot 1
 * has a different, larger set of fields — see productSchema below). Source
 * columns per slot N: `p_imageN` (text), `p_nameN` (varchar 400, except
 * slot 9 which is varchar 600 — the ONE width anomaly among the variant
 * name columns, preserved as a plain string field since MongoDB has no
 * column-width concept to preserve or violate).
 */
const variantSlotSchema = z.object({
  pImage: nullableStringSchema,
  pName: nullableStringSchema,
  pMrp: nullableIntSchema,
  pPrice: nullableIntSchema,
  pDesc: nullableStringSchema,
});

export type VariantSlot = z.infer<typeof variantSlotSchema>;

export const productSchema = z.object({
  legacyId: legacyIdSchema,

  // Category/type/flag columns
  pCat: nullableIntSchema, // OVERLOADED — see file header note, do not split
  pSubcat: nullableIntSchema,
  pOcat: nullableIntSchema, // source: int(21)
  ptype: nullableIntSchema, // source: int(21)
  pTop: nullableIntSchema, // source: int(21)
  pTrending: nullableIntSchema, // source: int(21)
  pFeatured: nullableIntSchema, // source: int(21)
  uid: nullableIntSchema, // source: int(21) — ALWAYS NULL in practice (confirms B-07/B-08, the
  // products.uid⋈users.id join in AdminController::ActiveProducts/InactiveProducts).
  // Preserve as always-null, do not populate it to "fix" the join.

  // Slot 1 (the base product identity — different field set from slots 2-10)
  pName: nullableStringSchema,
  pHeading: z.string(), // NOT NULL in source — the only required business column
  pBestimg: nullableStringSchema, // slot 1's image — NOT `p_image` (that column doesn't exist;
  // see BCN-DB-01, resolves the 75-vs-83-column blueprint discrepancy)
  pMrp: nullableIntSchema,
  pPrice: nullableIntSchema,
  pQuantity: nullableIntSchema,
  pRating: nullableIntSchema,
  pShortDesc: nullableStringSchema,
  pDesc: nullableStringSchema,
  pColor: nullableStringSchema,
  pSize: nullableStringSchema,
  videoLink: nullableStringSchema,
  reffNo: nullableIntSchema, // source: int(21)
  hsnCode: nullableStringSchema,
  shippingTime: nullableStringSchema,
  searchTerms: nullableStringSchema,
  pSlug: nullableStringSchema,
  pDesc1: nullableStringSchema, // slot 1's SECOND description field — source has both
  // p_desc and p_desc1 for slot 1 only; slots 2-10 have one desc field each

  // Slots 2-10 — named explicitly, NOT an array (F-20: do not restructure)
  slot2: variantSlotSchema,
  slot3: variantSlotSchema,
  slot4: variantSlotSchema,
  slot5: variantSlotSchema,
  slot6: variantSlotSchema,
  slot7: variantSlotSchema,
  slot8: variantSlotSchema,
  slot9: variantSlotSchema,
  slot10: variantSlotSchema,

  pStatus: nullableIntSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,

  // Embedded 1:N children (docs/M3-DATABASE-MAPPING.md §1.2)
  images: z.array(productImageSchema),
  reviews: z.array(productReviewSchema),
  specifications: z.array(productSpecificationSchema),

  /**
   * CR-006 Phase 5 (docs/CR-006-PHASE-5-PLAN.md §2.1;
   * docs/D-11-FOLLOWUP-CR006-SCHEMA-AUTHORIZATION.md). ADDITIVE, NEW —
   * no source column to mirror. `pCat` (above) is a Laravel-source field
   * and MUST remain untouched: it is a single scalar, one disease
   * category per product, and every EXISTING read path that depends on
   * it (`GetCatProducts`'s marketplace-tree reading,
   * `ActiveProducts`/`InactiveProducts`, `ManageOrders`'s admin-list
   * join, etc.) keeps working unchanged.
   *
   * `diseaseCategoryIds` is a NEW capability layered on top: multiple
   * `categories` (type='N') ids per product, closing the specific gap
   * Phase 1's analysis flagged (a medicine associated with several
   * conditions, e.g. "Arnica Montana → Muscle Pain, Joint Pain, Injury,
   * Bruising" — impossible with `pCat` alone, since it holds one value).
   *
   * `.optional()`, NOT required — an existing product document that
   * predates this field must still validate (this codebase's own
   * established "don't tighten validation beyond what's actually
   * populated" convention, same reasoning as `buyerProfile.optional()`
   * on `userSchema`). A one-time, NOT-YET-RUN backfill script
   * (`scripts/backfill-disease-category-ids.ts`) sets this to `[pCat]`
   * (or `[]`) for every existing product — until that backfill runs, a
   * migrated product legitimately has no `diseaseCategoryIds` field at
   * all, which callers must handle (see
   * `ProductRepository.findByDiseaseCategoryIds`'s own header).
   */
  diseaseCategoryIds: z.array(z.number().int()).optional(),

  /**
   * Partner Panel feature. GENUINELY NEW, ADDITIVE — no source column,
   * not related to `uid` (above), which stays permanently unused per its
   * own comment. References `users.legacyId` for the partner (`utype=5`)
   * who submitted this product via `/admin/save-product`. `null`/absent
   * for every product created by an admin — `.optional()` so every
   * existing product document (all of which predate this field) keeps
   * validating unchanged.
   */
  createdByUserId: z.number().int().nullable().optional(),
});

export type Product = z.infer<typeof productSchema>;
export type ProductImage = z.infer<typeof productImageSchema>;
export type ProductReview = z.infer<typeof productReviewSchema>;
export type ProductSpecification = z.infer<typeof productSpecificationSchema>;
