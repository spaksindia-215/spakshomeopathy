/**
 * `sellerProfiles` collection schema.
 *
 * SOURCE: MariaDB `seller_profile` (12 columns) + `banks` (8 columns),
 * combined into one collection per docs/M3-DATABASE-MAPPING.md §1.1 — both
 * are VESTIGIAL (write path active at registration; read only by one
 * orphaned admin page, `AdminController::ViewSeller`, no sidebar link),
 * both keyed 1:1 by `uid`, joined in source only at that one read site.
 *
 * KNOWN DATA ANOMALY (docs/M3-DATA-MIGRATION-MAP.md §1): `seller_profile`
 * has 16 rows, `banks` has 17 — a 1-row mismatch, meaning at least one `uid`
 * has one without the other. This schema makes `banks` fields optional to
 * accommodate that possibility faithfully, rather than assuming every
 * seller profile has a matching bank record.
 *
 * This entire collection describes an account type (`utype=2`, seller)
 * that can never actually log in (blueprint §5.2 — no seller route ever
 * loads, `routes/seller.php` is never mapped). It is preserved per NN-8
 * (no feature removal) despite being unreachable in practice.
 */

import { z } from 'zod';
import { legacyIdSchema, nullableStringSchema } from './common';

export const sellerProfileSchema = z.object({
  /** References `users.legacyId` (the source `seller_profile.uid` /
   * `banks.uid` column) — see docs/M3-DATABASE-MAPPING.md §3.1 on why
   * this is a reference, not an embed, into `users`: seller data is never
   * read alongside a user record in any live code path, unlike buyer
   * profile data. */
  userId: legacyIdSchema,

  /** From `seller_profile`. */
  legacyId: legacyIdSchema,
  displayName: nullableStringSchema,
  signature: nullableStringSchema,
  permanentAddress: nullableStringSchema,
  storeAddress: nullableStringSchema,
  adharCard: nullableStringSchema,
  panCard: nullableStringSchema,
  gstNumber: nullableStringSchema,
  gstFile: nullableStringSchema,

  /** From `banks`, optional — see the row-count mismatch note above. */
  bank: z
    .object({
      legacyId: legacyIdSchema,
      accNumber: nullableStringSchema,
      branchName: nullableStringSchema,
      bankStatement: nullableStringSchema,
      ifscCode: nullableStringSchema,
    })
    .optional(),
});

export type SellerProfile = z.infer<typeof sellerProfileSchema>;
