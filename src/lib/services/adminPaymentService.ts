/**
 * Admin payment read/write operations — CR-006 Phase 3.
 *
 * MIGRATION, NOT NEW PRODUCT: mirrors `AdminController::ManagePayment`
 * (the SINGULAR, ROUTED method), `SellerPayment`, `ChangePaymentStatus`
 * (AdminController.php:1392-1422), routes `admin/manage-payments`,
 * `admin/seller-payments/{sid}`, `admin/change-payment-status`.
 *
 * NOT PORTED: `ManagePayments` (PLURAL, AdminController.php:1360-1368) —
 * confirmed DEAD, unrouted code (`docs/M3-APPLICATION-MAPPING.md` row
 * #162: "a second, differently-cased method `ManagePayments` also
 * exists... not routed by any route"). Porting it would introduce
 * behavior that has no live counterpart — exactly what the contract
 * forbids ("do not add features Laravel doesn't have").
 *
 * REUSES: `PaymentRepository` (`orderRepository.ts`) — no new repository.
 *
 * PRESERVED SOURCE PECULIARITY: `admin/manage-payments.blade.php` and
 * `admin/seller-payments.blade.php` are byte-identical in their table
 * structure (both render the SAME columns from the SAME `$getPayments`
 * shape) — `seller-payments.blade.php` even keeps `manage-payments`'
 * page title/heading ("Manage Sellers" in one, but both show the same
 * "Seller Email"/"Product Name"/... columns). Reproduced as two thin,
 * near-identical page components rather than merged into one — matching
 * source's own two-separate-but-similar-views structure, not "cleaned up"
 * into a single parametrized view Laravel itself doesn't have.
 */

import type { Db } from 'mongodb';
import { PaymentRepository } from '../mongodb/repositories/orderRepository';
import { ProductRepository } from '../mongodb/repositories/productRepository';
import type { Product, Payment } from '../mongodb/schemas';
import { COLLECTIONS } from '../mongodb/collections';

/** One row of `/admin/manage-payments` or `/admin/seller-payments/{sid}` —
 * mirrors the fields both Blade views actually render (verified directly):
 * seller email, product name, quantity (`qunt`, source's own misspelling
 * — see `schemas/order.ts`'s header, not corrected here either), amount,
 * total amount, admin fee, seller payout, pay mode, pay date, pay/order
 * status (for the action-button's 3-way conditional). */
export interface AdminPaymentRow {
  paymentLegacyId: number;
  sellerEmail: string | null;
  productName: string | null;
  qunt: number | null;
  amount: number | null;
  totalAmount: number | null;
  adminFee: number | null;
  sellerPay: number | null;
  payMode: string | null;
  payDate: string | null;
  payStatus: number | null;
  orderStatus: number | null;
}

async function toRows(db: Db, payments: Payment[]): Promise<AdminPaymentRow[]> {
  const products = new ProductRepository(db);
  const productIds = payments.map((p) => p.pid).filter((id): id is number => id !== null);
  const productList = await products.findByLegacyIds(productIds);
  const productById = new Map<number, Product>(productList.map((p) => [p.legacyId, p]));

  // Batch seller-email lookup: `UserRepository` has a single-id
  // `findByLegacyId` but no `$in`-batch equivalent (unlike
  // `ProductRepository.findByLegacyIds`, used above) — adding one would be
  // a new method on an existing file, out of this phase's "no existing
  // file modified" scope (Phase 3 plan §2). A direct, minimal `$in`
  // collection read is used instead, matching the exact batching
  // technique `ProductRepository.findByLegacyIds` itself already
  // documents as the preferred DR-01 pattern.
  const sellerIds = payments.map((p) => p.sid).filter((id): id is number => id !== null);
  const sellers =
    sellerIds.length > 0
      ? await db
          .collection<{ legacyId: number; email: string }>(COLLECTIONS.users)
          .find({ legacyId: { $in: sellerIds } })
          .toArray()
      : [];
  const sellerEmailById = new Map(sellers.map((s) => [s.legacyId, s.email]));

  return payments.map((payment) => ({
    paymentLegacyId: payment.legacyId,
    sellerEmail: payment.sid !== null ? (sellerEmailById.get(payment.sid) ?? null) : null,
    productName: payment.pid !== null ? (productById.get(payment.pid)?.pName ?? null) : null,
    qunt: payment.qunt,
    amount: payment.amount,
    totalAmount: payment.totalAmount,
    adminFee: payment.adminFee,
    sellerPay: payment.sellerPay,
    payMode: payment.payMode,
    payDate: payment.payDate,
    payStatus: payment.payStatus,
    orderStatus: payment.orderStatus,
  }));
}

/**
 * Mirrors `AdminController::ManagePayment` (AdminController.php:1413-1422)
 * — ALL `payments` rows joined to `products`/`users`, ordered `id DESC`,
 * UNPAGINATED (same P-15 pattern as `getAdminOrderListView`).
 */
export async function getAdminPaymentsView(db: Db): Promise<AdminPaymentRow[]> {
  const paymentRepo = new PaymentRepository(db);
  const payments = await paymentRepo.find({});
  const sorted = [...payments].sort((a, b) => b.legacyId - a.legacyId);
  return toRows(db, sorted);
}

/**
 * Mirrors `AdminController::SellerPayment($sid)`
 * (AdminController.php:1392-1403) — `payments` filtered by `sid`.
 * LIVE-orphan per `docs/M3-APPLICATION-MAPPING.md` (no sidebar link) —
 * see `adminOrderService.ts`'s `getSellerOrdersView` for the same,
 * deliberate non-linking treatment.
 */
export async function getSellerPaymentsView(db: Db, sellerId: number): Promise<AdminPaymentRow[]> {
  const paymentRepo = new PaymentRepository(db);
  const payments = await paymentRepo.find({ sid: sellerId });
  const sorted = [...payments].sort((a, b) => b.legacyId - a.legacyId);
  return toRows(db, sorted);
}

/**
 * Mirrors `AdminController::ChangePaymentStatus`
 * (AdminController.php:1405-1411) EXACTLY:
 *   $payDate=date('d M, Y');
 *   DB::table('payments')->where('id','=',$payId)->update(['payStatus'=>2,'payDate'=>$payDate]);
 *
 * `payDate` is written as a formatted STRING (`d M, Y`, e.g. "12 Sep,
 * 2026"), matching `paymentSchema.payDate`'s own type (`nullableStringSchema`
 * — source: varchar(255), not a native date). Uses the server's current
 * date at call time, same as source's `date()` call (both are "now",
 * evaluated at request time — no timezone conversion applied by either).
 */
const PAID_STATUS = 2; // AdminController.php:1409 — `['payStatus'=>2, ...]`

function formatPayDate(now: Date): string {
  // `d M, Y` — e.g. "12 Sep, 2026". Matches PHP's date('d M, Y') format
  // exactly: zero-padded day, short month name, comma, 4-digit year.
  const day = String(now.getDate()).padStart(2, '0');
  const month = now.toLocaleString('en-US', { month: 'short' });
  const year = now.getFullYear();
  return `${day} ${month}, ${year}`;
}

export async function updatePaymentStatus(db: Db, paymentLegacyId: number): Promise<void> {
  const paymentRepo = new PaymentRepository(db);
  await paymentRepo.updateOne({ legacyId: paymentLegacyId } as Partial<Payment>, {
    payStatus: PAID_STATUS,
    payDate: formatPayDate(new Date()),
  });
}
