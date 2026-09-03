/**
 * Vestigial/dead-write table schemas — `productFeatures`, `productVariations`,
 * `productPkg` (DR-02, placement not yet approved — see collections.ts),
 * `baskets`, `sellerPayments` (dead-write only, per
 * docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md §10), `orderFullfill`,
 * `statusCodes`, `variations`, `passwordResets` (zero live reference of any
 * kind), `shipping` (P-09 — the one read call site is commented out,
 * carries no authority per contract §12.4).
 *
 * Grouped in one file because each is structurally simple (no non-trivial
 * relationships or embedding questions) — full individual treatment already
 * exists in docs/M3-DATABASE-MAPPING.md §2 and is cited, not repeated here.
 *
 * NONE of these are read or written by any live application code today.
 * This schema file exists so their real, existing data (contract NN-10 —
 * no data loss) can be migrated into a validated shape, not because any
 * M3-A repository will actually query them.
 */

import { z } from 'zod';
import { legacyIdSchema, nullableIntSchema, nullableStringSchema, timestampSchema } from './common';

/** Was `product_features`. Read-only in source-code terms (no write call
 * site found), yet has 6,938 rows of real legacy data. */
export const productFeatureSchema = z.object({
  legacyId: legacyIdSchema,
  uid: nullableIntSchema,
  pid: nullableIntSchema, // references products.legacyId, by convention only
  pFeature: nullableStringSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type ProductFeature = z.infer<typeof productFeatureSchema>;

/** Was `product_variations`. Same read-only-in-code pattern, 147 rows. */
export const productVariationSchema = z.object({
  legacyId: legacyIdSchema,
  pid: nullableIntSchema,
  vColor: nullableStringSchema,
  vSize: nullableStringSchema,
  vDesign: nullableStringSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type ProductVariation = z.infer<typeof productVariationSchema>;

/** Was `product_pkg`. Zero call sites of any kind in the 7 live
 * controllers, yet 1,256 rows of real legacy data. */
export const productPkgSchema = z.object({
  legacyId: legacyIdSchema,
  pid: nullableIntSchema,
  packageSize: nullableStringSchema,
  packagePrice: nullableStringSchema, // source: varchar(255) — a string, not numeric
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type ProductPkg = z.infer<typeof productPkgSchema>;

/** Was `baskets`. Written only by the DEAD `HomeController::SuccessOrder`
 * (unrouted in any live navigation path); never read by any controller.
 * Uses a SECOND, INCONSISTENT naming convention (camelCase `custId`/
 * `sellerId`/`pid` vs. the live order-placement path's PascalCase
 * `CustId`/`SellerId`/`GroupId`) — preserved verbatim, not normalized to
 * match the live convention (docs/M3-DATABASE-MAPPING.md §2 extension). */
export const basketSchema = z.object({
  legacyId: legacyIdSchema,
  basketId: nullableIntSchema,
  custId: nullableIntSchema,
  sellerId: nullableIntSchema,
  pid: nullableIntSchema,
  quantity: nullableIntSchema,
  sellPrice: nullableStringSchema, // source: varchar(255)
  totalPrice: nullableIntSchema,
  orderId: nullableIntSchema, // source: int(11)
  orderNotes: nullableStringSchema,
  orderStatus: nullableIntSchema,
  payMode: nullableStringSchema,
  orderDate: nullableStringSchema,
  deliveryDate: nullableStringSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type Basket = z.infer<typeof basketSchema>;

/** Was `sellerpayment`. Same dead-write-only pattern as baskets. Note
 * `amount`/`fee`/`tax`/`discount`/`payable`/`payStatus` are ALL
 * `varchar(255)` in source, not numeric — preserved as strings. */
export const sellerPaymentSchema = z.object({
  legacyId: legacyIdSchema,
  uid: nullableIntSchema,
  bid: nullableIntSchema,
  amount: nullableStringSchema,
  fee: nullableStringSchema,
  tax: nullableStringSchema,
  discount: nullableStringSchema,
  payable: nullableStringSchema,
  orderId: nullableStringSchema, // source: varchar(255) here (unlike baskets.orderId, int)
  payStatus: nullableStringSchema, // source: varchar(255), not numeric — an anomaly against
  // every other payStatus-named column in the schema, which are all int
  orderStatus: nullableIntSchema,
  payMode: nullableStringSchema,
  payDate: nullableStringSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type SellerPayment = z.infer<typeof sellerPaymentSchema>;

/** Was `order_fullfill`. MyISAM engine in source. Zero call sites despite
 * 276 rows. `uid`/`pid`/`status` are all NOT NULL in source (unusual for
 * this vestigial group — most other vestigial tables are fully nullable). */
export const orderFullfillSchema = z.object({
  legacyId: legacyIdSchema,
  uid: z.number().int(), // NOT NULL in source
  pid: z.number().int(), // NOT NULL in source
  status: z.number().int(), // NOT NULL in source
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
});
export type OrderFullfill = z.infer<typeof orderFullfillSchema>;

/** Was `statuscode`. A small lookup table, seemingly intended as a
 * status-code dictionary, never consulted by any query. 6 rows.
 *
 * Named `statusCodeEntrySchema` (not `statusCodeSchema`) to avoid colliding
 * with `common.ts`'s `statusCodeSchema`, which is an unrelated, reusable
 * single-field primitive for status-code-valued columns elsewhere in this
 * project — this is a whole-document schema for the `statusCodes`
 * collection itself. */
export const statusCodeEntrySchema = z.object({
  legacyId: legacyIdSchema,
  statusName: nullableStringSchema,
  statusValue: nullableStringSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type StatusCodeEntry = z.infer<typeof statusCodeEntrySchema>;

/** Was `variation`. Zero call sites, zero rows — doubly vestigial. */
export const variationSchema = z.object({
  legacyId: legacyIdSchema,
  vColor: nullableStringSchema,
  vSize: nullableStringSchema,
  sizeUnit: nullableStringSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type VariationEntry = z.infer<typeof variationSchema>;

/**
 * Was `password_resets`. CONFIRMED: no `id` column at all in source
 * (docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md §3) — stock Laravel migration
 * shape, never actually used by the live (custom, encrypt($email)-based)
 * password-reset flow (blueprint §5.6). No `legacyId` field here, unlike
 * every other schema in this file — there is no source `id` value to
 * preserve, because none exists.
 */
export const passwordResetSchema = z.object({
  email: z.string(), // NOT NULL in source
  token: z.string(), // NOT NULL in source
  createdAt: z.date().nullable(),
});
export type PasswordReset = z.infer<typeof passwordResetSchema>;

/** Was `shipping`. P-09: the one read call site in source
 * (`CartController.php:380`) is commented out and carries no authority —
 * delivery charge stays hardcoded 0 in the live application regardless of
 * this collection's content. 67 rows of real (if unused) legacy data. */
export const shippingSchema = z.object({
  legacyId: legacyIdSchema,
  sellerId: nullableIntSchema,
  stateName: nullableStringSchema,
  dayRange: nullableStringSchema,
  amount: nullableIntSchema,
  shippingType: nullableStringSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type Shipping = z.infer<typeof shippingSchema>;
