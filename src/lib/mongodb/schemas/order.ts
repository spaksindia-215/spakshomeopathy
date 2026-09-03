/**
 * `orders`, `orderProducts`, `payments` collection schemas.
 *
 * DR-01 (APPROVED, 2026-08-16, docs/M3-OWNER-DECISION-RECORDS.md): THREE
 * SEPARATE collections, Option B — NOT one embedded order document. This
 * preserves the existing write-path shape (checkout inserts N independent
 * orderproducts rows + N independent payments rows in a loop) and preserves
 * P-03's three-independently-tracked-status-values inconsistency with zero
 * structural awkwardness. Do not collapse these into one collection without
 * a new, separately-approved decision.
 *
 * ★ GroupId is the TRUE order-linkage key, not any collection's own
 * `legacyId`/`_id`. `orders.GroupId`, `orderProducts.groupId`, and
 * `payments.gid` are the field that unifies "everything belonging to one
 * order" — reconstructed via N queries filtered by this value, matching the
 * source's own multi-query/join reconstruction pattern exactly
 * (docs/M3-DATABASE-MAPPING.md §1.4, docs/M3-MONGODB-ARCHITECTURE.md §3.2
 * Option B sketch).
 *
 * SOURCE COLUMNS: `Database/db_newhomo.sql` CREATE TABLE statements for
 * `orders`, `orderproducts`, `payments` (verified directly this session,
 * not re-derived from the earlier analysis document, to catch any
 * transcription drift before it entered a schema file).
 *
 * PRESERVED TYPE ANOMALY — DO NOT "FIX": `orders.SellPrice` is declared
 * `varchar(255)` in the source (a string column), while
 * `orderProducts.SellPrice`/sellPrice-equivalent is `int(11)` (a genuine
 * integer). These are NOT the same type despite the same conceptual meaning
 * — preserved here as string vs. number respectively, exactly as the
 * source declares them. Coercing `orders.SellPrice` to a number would be
 * exactly the kind of "obvious improvement" contract §10.2 forbids.
 *
 * PRESERVED SPELLING ANOMALIES (contract F-5 — no renaming): `DelaveryDate`,
 * `DelaveryBy` (both misspelled "Delavery" for "Delivery" in source) are
 * preserved verbatim as field names, not corrected to `deliveryDate`/
 * `deliveryBy`. `payments.qunt` (misspelled "quantity") likewise preserved
 * as `qunt`, not corrected to `quantity`.
 */

import { z } from 'zod';
import { legacyIdSchema, nullableIntSchema, nullableStringSchema, timestampSchema } from './common';

/**
 * `orders` — the order HEADER record. Source: 18 columns.
 *
 * `qr_transection_id` is NOT NULL with no DEFAULT in source — any insert
 * omitting it fails at the database level today; every live insert path
 * supplies it (docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md §6). Required here
 * to match.
 */
export const orderSchema = z.object({
  legacyId: legacyIdSchema,
  qrTransectionId: z.string(), // NOT NULL in source — preserved as required, and the
  // source's own misspelling ("transection" for "transaction") is preserved verbatim
  custId: nullableIntSchema, // references users.legacyId, by convention only (no FK in source)
  sellerId: nullableIntSchema, // references users.legacyId (seller path is VESTIGIAL/dead —
  // sellers can never log in, blueprint §5.2 — but the column exists and is preserved)
  groupId: nullableIntSchema, // ★ the true order-linkage key
  productId: nullableIntSchema, // references products.legacyId
  quantity: nullableIntSchema,
  sellPrice: nullableStringSchema, // source: varchar(255) — a STRING, not a number. See file header.
  deliveryPrice: nullableIntSchema, // P-09: always effectively 0 in live behavior — delivery
  // charge is hardcoded, the `shipping` table lookup is commented out and carries no authority
  totalPrice: nullableIntSchema,
  orderId: nullableIntSchema, // source: int(11) — NOT the same as legacyId; this is a
  // separately-generated order-number field, distinct from the row's own primary key
  orderNotes: nullableStringSchema,
  orderStatus: nullableIntSchema, // P-03: on admin cancel, this and orderProducts.orderStatus
  // get written 5; payments.orderStatus gets written 4 — preserve the inconsistency, do not
  // normalize all three to the same value
  payMode: nullableStringSchema,
  orderDate: nullableStringSchema, // source: varchar(255) — stored as a formatted string, not
  // a native date/timestamp type
  deliveryDate: nullableStringSchema, // source: varchar(255), same as orderDate
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type Order = z.infer<typeof orderSchema>;

/**
 * `orderProducts` — one row per cart line within an order. Source:
 * `orderproducts`, 16 columns.
 */
export const orderProductSchema = z.object({
  legacyId: legacyIdSchema,
  groupId: nullableIntSchema, // ★ links back to orders.groupId
  productId: nullableIntSchema, // references products.legacyId
  orderImage: nullableStringSchema,
  quantity: nullableIntSchema,
  sellPrice: nullableIntSchema, // source: int(11) — a NUMBER here, unlike orders.sellPrice.
  // Do not unify the two into one shared type.
  deliveryCharge: nullableIntSchema,
  totalPrice: nullableIntSchema,
  sellerId: nullableIntSchema,
  buyerId: nullableIntSchema, // references users.legacyId — the buyer's own order-history
  // page filters by this field (BuyerController.php:74-78)
  trackingCode: nullableStringSchema,
  delaveryDate: nullableStringSchema, // sic — preserved misspelling, see file header
  delaveryBy: nullableStringSchema, // sic — preserved misspelling, see file header
  orderStatus: nullableIntSchema, // P-03: independently tracked from orders.orderStatus
  // and payments.orderStatus — see orderSchema's note above
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type OrderProduct = z.infer<typeof orderProductSchema>;

/**
 * `payments` — one row per cart line's payment record (NOT one per order —
 * confirmed, HomeController.php inserts one payments row per cart-line
 * inside the same loop that creates each orderProducts row). Source:
 * `payments`, 18 columns.
 */
export const paymentSchema = z.object({
  legacyId: legacyIdSchema,
  pid: nullableIntSchema, // references products.legacyId
  qunt: nullableIntSchema, // sic — preserved misspelling ("quantity"), see file header
  gid: nullableIntSchema, // ★ links back to orders.groupId
  cid: nullableIntSchema, // references users.legacyId (customer)
  sid: nullableIntSchema, // references users.legacyId (seller — VESTIGIAL path, see orderSchema)
  amount: nullableIntSchema,
  totalAmount: nullableIntSchema,
  orderId: nullableStringSchema, // source: varchar(255) — NOTE: a STRING here, unlike
  // orders.orderId which is int(11). Two different columns, two different types,
  // both named "orderId" in their respective tables — preserved as-is, not unified.
  payStatus: nullableIntSchema,
  orderStatus: nullableIntSchema, // P-03: independently tracked — see orderSchema's note.
  // On admin cancel, THIS field gets written 4 while orders/orderProducts get 5.
  adminFee: nullableIntSchema, // P-17: computed and stored though no real payout occurs —
  // preserve the arithmetic exactly, do not recompute or omit
  sellerPay: nullableIntSchema, // P-17, same note
  discount: nullableIntSchema,
  payMode: nullableStringSchema,
  payDate: nullableStringSchema, // source: varchar(255), not a native date type
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type Payment = z.infer<typeof paymentSchema>;
