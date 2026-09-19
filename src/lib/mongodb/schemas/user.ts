/**
 * `users` collection schema.
 *
 * SOURCE: MariaDB `users` (12 columns) + `buyer_profile` (11 columns),
 * embedded per docs/M3-DATABASE-MAPPING.md §1.1 (Option A — buyer profile
 * data is read on nearly every buyer-authenticated page load, always
 * together with the user record, never independently).
 *
 * NOT included here: `seller_profile`/`banks` — kept as a SEPARATE
 * collection (`sellerProfiles`) per the same decision record, because that
 * data is read by exactly one orphaned admin page and never alongside a
 * user record in any live code path. See schemas/sellerProfile.ts.
 *
 * DR-04 (users.email unique index) — NOT YET APPROVED. This schema
 * validates shape only; it does not enforce uniqueness. See
 * docs/M3-OWNER-DECISION-RECORDS.md DR-04 and repositories/userRepository.ts
 * for where that decision, once made, would be applied.
 */

import { z } from 'zod';
import { legacyIdSchema, nullableStringSchema, statusCodeSchema, timestampSchema } from './common';

/**
 * `buyer_profile`, embedded. Source columns (docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md
 * §1.2): `id`, `uid`, `PinCode`, `FullAddress`, `HouseNo`, `Landmark`,
 * `State`, `Country`, `DeliveryType` (+ timestamps not separately tracked
 * here — see note on `created_at`/`updated_at` below).
 */
export const buyerProfileSchema = z.object({
  legacyId: legacyIdSchema,
  pinCode: nullableStringSchema,
  fullAddress: nullableStringSchema,
  houseNo: nullableStringSchema,
  landmark: nullableStringSchema,
  state: nullableStringSchema,
  country: nullableStringSchema,
  deliveryType: nullableStringSchema,
});

export type BuyerProfile = z.infer<typeof buyerProfileSchema>;

/**
 * `users`, top-level. Source columns
 * (docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md §1.1): `id`, `name`, `email`,
 * `mobile`, `email_verified_at`, `password`, `image`, `utype`, `status`,
 * `remember_token`, `created_at`, `updated_at`.
 *
 * `utype`: 1=admin, 2=seller (VESTIGIAL — can never log in, blueprint §5.2),
 * 3=buyer, 4=unused. Preserved as a plain integer, not an enum — the source
 * has no ENUM/CHECK constraint on this column either.
 *
 * `status`: 0=inactive/unverified, 1=active. Login requires status=1,
 * checked as PART OF THE CREDENTIAL MATCH itself
 * (`Auth::attempt(['email'=>...,'password'=>...,'status'=>1])`) — an
 * inactive user fails as "wrong credentials," not "account disabled."
 * This schema does not enforce that behavior (it's a login-flow concern,
 * not a document-shape concern) — noted here so the distinction isn't lost.
 *
 * `remember_token`: present in the schema (hidden by Eloquent, but the
 * column exists) though never actually used — no login form sends
 * "remember" (blueprint §5.5). Preserved for schema completeness, not
 * because it's needed.
 */
export const userSchema = z.object({
  legacyId: legacyIdSchema,
  name: z.string(),
  email: z.string(),
  mobile: nullableStringSchema,
  emailVerifiedAt: z.date().nullable(),
  password: z.string(),
  image: nullableStringSchema,
  utype: statusCodeSchema,
  status: statusCodeSchema,
  rememberToken: nullableStringSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,

  /** Present only for utype=3 (buyer) users with a matching buyer_profile
   * row. Absent (undefined), not null, when no such row exists — matches
   * the source's actual join behavior: a user with no buyer_profile row
   * simply has no row to join, not a row of nulls. */
  buyerProfile: buyerProfileSchema.optional(),

  /**
   * CR-006 Phase 9 (`docs/CR-006-PHASE-9-PLAN.md` §2.2) — ADDITIVE, NEW.
   * No source column to mirror (no `role`/RBAC concept exists in
   * Laravel at all — `permissions.ts`'s own header). Only meaningful for
   * `utype===1` (admin) users; a buyer document never has this field.
   *
   * `.optional()`, NOT required: every EXISTING admin user document (the
   * one real admin account in the migrated data) predates this field —
   * `resolveRole()` (`rbac-guard.ts`) falls back to `SUPER_ADMIN` when
   * absent, so that account keeps working exactly as it does today
   * without a backfill write. A NEW admin account created through
   * `/admin/add-admin-user` always has this set explicitly.
   */
  role: z
    .enum(['SUPER_ADMIN', 'ADMIN', 'CATALOG_MANAGER', 'CONTENT_MANAGER', 'ORDER_MANAGER'])
    .optional(),

  /**
   * Admin "forgot password" flow — ADDITIVE, NEW. No source column to
   * mirror (Laravel's own `/reset-password` page has no working backend
   * — `src/app/reset-password/page.tsx`'s own header discloses this).
   *
   * Only `passwordResetTokenHash` is ever stored — never the raw token
   * itself (same "never store the credential, only a hash of it"
   * posture `password.ts` already uses for the login password). The raw
   * token exists only in the emailed link and the request that redeems
   * it; a database compromise alone can never be used to reset an
   * account's password using this field.
   *
   * Both fields are cleared together (`null`) once the token is
   * consumed or expires — see `src/lib/auth/passwordReset.ts`.
   */
  passwordResetTokenHash: z.string().nullable().optional(),
  passwordResetExpiresAt: z.date().nullable().optional(),
});

export type User = z.infer<typeof userSchema>;
