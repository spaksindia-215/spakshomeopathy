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
});

export type User = z.infer<typeof userSchema>;
