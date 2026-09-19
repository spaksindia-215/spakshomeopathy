/**
 * Admin order read/write operations — CR-006 Phase 3.
 *
 * MIGRATION, NOT NEW PRODUCT: mirrors `AdminController::ManageOrders`,
 * `SellerOrders`, `ChangeOrderStatus`, `CancelOrder`
 * (public_html/app/Http/Controllers/AdminController.php:1311-1357),
 * routes `admin/order-list`, `admin/seller-orders/{sid}`,
 * `admin/change-order-status`, `admin/cancel-order`
 * (M3 catalog rows #136, #137, #139, and the unnumbered admin cancel-order
 * row — see `docs/CR-006-ANALYSIS-PHASE1.md` §1 for the full citation and
 * the correction of this project's earlier, mistaken "Orders is new"
 * assumption).
 *
 * REUSES, DOES NOT DUPLICATE: `OrderRepository`/`OrderProductRepository`/
 * `PaymentRepository`/`getOrderByGroupId` (`orderRepository.ts`, built
 * M3-A) — the exact repositories the buyer-side `orderService.ts` already
 * uses. No new repository class, no new collection, no new schema.
 *
 * DELIBERATELY SEPARATE FROM THE BUYER-SIDE FUNCTIONS OF THE SAME SHAPE:
 * `adminCancelOrder` below is NOT `cancelBuyerOrder`
 * (`orderService.ts`) with an admin flag bolted on. They are genuinely
 * different Laravel controller methods with different behavior:
 *   - Buyer `CancelOrder` (BuyerController.php:93-100): writes `4`
 *     uniformly to orders/orderProducts/payments, AND (per this project's
 *     owner-authorized B-12/M4 buyer-orders-slice addition) checks the
 *     caller owns the order first.
 *   - Admin `CancelOrder` (AdminController.php:1349-1357): writes `5` to
 *     orders/orderProducts but `4` to payments (P-03's documented
 *     mismatch), and performs NO ownership check in source — an admin can
 *     cancel any order, which is the correct behavior for an admin
 *     action, not a gap to close.
 * Merging these into one parametrized function would risk one path's
 * behavior leaking into the other; kept as two independent
 * implementations, exactly as source keeps them as two independent
 * controller methods.
 *
 * PRESERVED DEFECTS (do not "fix" while porting — contract's defect-
 * preservation mandate, restated in `CR-006-ANALYSIS-PHASE1.md` §1):
 *   - `shipOrder` writes `orderProducts.orderStatus=3` ONLY — `orders` is
 *     NOT touched on ship (AdminController.php:1381-1386, verified: only
 *     one `DB::table('orderproducts')->...->update(...)` call, no second
 *     call against `orders`). A real, preserved asymmetry versus cancel,
 *     which touches all three collections.
 *   - `adminCancelOrder` writes `5` to `orders`/`orderProducts` but `4` to
 *     `payments` — P-03's inconsistency, preserved verbatim, not
 *     normalized to a single value.
 *
 * RBAC: every function here is called from a route that itself calls
 * `requirePermission(session, PERMISSIONS.ORDERS_VIEW | ORDERS_UPDATE)`
 * (Phase 2's mechanism, first real use) — this file has no session/auth
 * awareness of its own, matching every other service file's separation of
 * concerns in this codebase (auth happens at the route/page boundary, not
 * inside the service).
 */

import type { Db } from 'mongodb';
import {
  OrderRepository,
  OrderProductRepository,
  PaymentRepository,
  getOrderByGroupId,
  type ReconstructedOrder,
} from '../mongodb/repositories/orderRepository';
import { ProductRepository } from '../mongodb/repositories/productRepository';
import { UserRepository } from '../mongodb/repositories/userRepository';
import type { Product } from '../mongodb/schemas';

/**
 * One row of `/admin/order-list` — mirrors `ManageOrders`'s join
 * (`orderproducts` ⋈ `products`), narrowed to exactly the fields
 * `admin/order-list.blade.php` renders (verified directly against that
 * view): product title/slug, image (from `orderProducts.orderImage`, NOT
 * a product field — confirmed: source's `OrderImage` column lives on
 * `orderproducts`, populated at checkout time, not looked up from
 * `products` per-render), quantity, sell price, total price, status, plus
 * `groupId`/`orderLineLegacyId` for the ship/cancel/view action links.
 */
export interface AdminOrderListRow {
  orderLineLegacyId: number;
  groupId: number | null;
  productSlug: string | null;
  productName: string | null;
  orderImage: string | null;
  quantity: number | null;
  sellPrice: number | null;
  totalPrice: number | null;
  orderStatus: number | null;
}

/**
 * Mirrors `AdminController::ManageOrders` exactly: ALL `orderproducts`
 * rows joined to `products`, NO filter, ordered `id DESC`
 * (AdminController.php:1311-1320). UNPAGINATED, matching source — this is
 * one of the "~10 admin lists have no pagination" confirmed in
 * `CR-006-ANALYSIS-PHASE1.md` §1 (blueprint P-15). Not adding pagination
 * here reproduces that limitation rather than "improving" it, per the
 * contract's non-objective on performance/UX improvements.
 *
 * DOCUMENTED DIFFERENCE (same DR-01 pattern as every other order query in
 * this codebase): source performs one SQL join; this fetches ALL
 * `orderProducts` documents, sorts by `legacyId` DESC in application code
 * (== `orderproducts.id DESC`), then batch-fetches the referenced
 * products via `$in` — not N sequential single-product lookups.
 */
export async function getAdminOrderListView(db: Db): Promise<AdminOrderListRow[]> {
  const lineRepo = new OrderProductRepository(db);
  const products = new ProductRepository(db);

  const lines = await lineRepo.find({});
  const sortedLines = [...lines].sort((a, b) => b.legacyId - a.legacyId);

  const productIds = sortedLines.map((l) => l.productId).filter((id): id is number => id !== null);
  const productList = await products.findByLegacyIds(productIds);
  const productById = new Map<number, Product>(productList.map((p) => [p.legacyId, p]));

  return sortedLines.map((line) => {
    const product = line.productId !== null ? productById.get(line.productId) : undefined;
    return {
      orderLineLegacyId: line.legacyId,
      groupId: line.groupId,
      productSlug: product?.pSlug ?? null,
      productName: product?.pName ?? null,
      orderImage: line.orderImage,
      quantity: line.quantity,
      sellPrice: line.sellPrice,
      totalPrice: line.totalPrice,
      orderStatus: line.orderStatus,
    };
  });
}

/** Same row shape as `AdminOrderListRow`, plus the seller's email —
 * mirrors `SellerOrders`'s extra `users` join (AdminController.php:1322-1332,
 * `->join('users','users.id','orderproducts.SellerId')`), rendered by
 * `admin/seller-orders.blade.php` as `{{$row->email}}`. Seller accounts
 * are VESTIGIAL (blueprint §5.2 — no seller can ever log in), so this
 * function's real-world output is expected to be empty/sparse on live
 * data; reproduced faithfully regardless, since the query itself is live
 * and LIVE-orphan (no sidebar link, but reachable and correct if visited
 * directly), not dead. */
export interface SellerOrderListRow extends AdminOrderListRow {
  sellerEmail: string | null;
}

/**
 * Mirrors `AdminController::SellerOrders($sid)`
 * (AdminController.php:1322-1332) — `orderproducts` filtered by
 * `SellerId`, joined to `products` and `users`. LIVE-orphan per
 * `docs/M3-APPLICATION-MAPPING.md` row #137 (no sidebar link in source) —
 * this function/page exists and is correct, but is deliberately not
 * linked from `AdminSidebar.tsx`, matching source exactly (see
 * `CR-006-PHASE-3-PLAN.md` §1/§8 — resisting the temptation to "improve"
 * discoverability beyond what Laravel itself provides).
 */
export async function getSellerOrdersView(db: Db, sellerId: number): Promise<SellerOrderListRow[]> {
  const lineRepo = new OrderProductRepository(db);
  const products = new ProductRepository(db);

  const lines = await lineRepo.find({ sellerId });
  const sortedLines = [...lines].sort((a, b) => b.legacyId - a.legacyId);

  const productIds = sortedLines.map((l) => l.productId).filter((id): id is number => id !== null);
  const productList = await products.findByLegacyIds(productIds);
  const productById = new Map<number, Product>(productList.map((p) => [p.legacyId, p]));

  // Seller email lookup — reuses the ALREADY-EXISTING
  // `UserRepository.findByLegacyId()` (no new repository method needed;
  // this file adds no new file to `mongodb/repositories/`).
  const sellerDoc = await new UserRepository(db).findByLegacyId(sellerId);

  return sortedLines.map((line) => {
    const product = line.productId !== null ? productById.get(line.productId) : undefined;
    return {
      orderLineLegacyId: line.legacyId,
      groupId: line.groupId,
      productSlug: product?.pSlug ?? null,
      productName: product?.pName ?? null,
      orderImage: line.orderImage,
      quantity: line.quantity,
      sellPrice: line.sellPrice,
      totalPrice: line.totalPrice,
      orderStatus: line.orderStatus,
      sellerEmail: sellerDoc?.email ?? null,
    };
  });
}

/**
 * Mirrors `AdminController::ChangeOrderStatus`
 * (AdminController.php:1381-1386) EXACTLY: `orderProducts.orderStatus`
 * set to `3` for the given GroupId. `orders` is deliberately NOT updated
 * — see file header's PRESERVED DEFECTS note. No ownership check (source
 * has none — this is an admin-wide action over any order, by design).
 *
 * Returns `void` — source's own `ChangeOrderStatus` performs no
 * existence check before updating (an update against a non-matching
 * GroupId is simply a zero-row no-op in both SQL and MongoDB), so this
 * function does not report success/failure either, matching that
 * unconditional behavior.
 */
const SHIPPED_STATUS = 3; // AdminController.php:1384 — `['OrderStatus'=>3]`

export async function shipOrder(db: Db, groupId: number): Promise<void> {
  const lineRepo = new OrderProductRepository(db);
  await lineRepo.updateStatusByGroupId(groupId, SHIPPED_STATUS);
}

/**
 * Mirrors `AdminController::CancelOrder` (AdminController.php:1349-1357)
 * EXACTLY: `orders`/`orderProducts` set to `5`, `payments` set to `4` —
 * P-03's documented mismatch, preserved verbatim (see file header). No
 * ownership check, matching source (an admin action over any order).
 *
 * Distinct from `cancelBuyerOrder`/`cancelOwnedOrder` — see file header.
 */
const ADMIN_CANCELLED_ORDER_STATUS = 5; // AdminController.php:1352 — orders/orderProducts
const ADMIN_CANCELLED_PAYMENT_STATUS = 4; // AdminController.php:1355 — payments (P-03 mismatch)

export async function adminCancelOrder(db: Db, groupId: number): Promise<void> {
  const orderRepo = new OrderRepository(db);
  const lineRepo = new OrderProductRepository(db);
  const paymentRepo = new PaymentRepository(db);

  await Promise.all([
    orderRepo.updateStatusByGroupId(groupId, ADMIN_CANCELLED_ORDER_STATUS),
    lineRepo.updateStatusByGroupId(groupId, ADMIN_CANCELLED_ORDER_STATUS),
    paymentRepo.updateStatusByGroupId(groupId, ADMIN_CANCELLED_PAYMENT_STATUS),
  ]);
}

/**
 * CORRECTION (recorded here, not silently): this function was originally
 * planned to be deferred, on the mistaken belief that `buyer_profile` had
 * no MongoDB representation in this codebase (see
 * `docs/CR-006-PHASE-3-BUYER-PROFILE-GAP.md` for the full record of that
 * mistake and its correction). Direct inspection of `schemas/user.ts`
 * found `buyer_profile` IS already modeled — embedded as an optional
 * `buyerProfile` field on the `users` document (DR-01-style Option A
 * decision, `docs/M3-DATABASE-MAPPING.md` §1.1: "buyer profile data is
 * read... always together with the user record"). No new schema,
 * collection, or repository is needed; `UserRepository.findByLegacyId()`
 * already returns it. This function was built once that was confirmed,
 * not deferred.
 *
 * Mirrors `AdminController::ViewOrder($OrderPid)`
 * (AdminController.php:1336-1345):
 *   DB::table('orderproducts')
 *     ->select('orderproducts.*','products.*','users.*','buyer_profile.*','orderproducts.id as OrderPid')
 *     ->join('products','orderproducts.ProductId','products.id')
 *     ->join('users','orderproducts.BuyerId','users.id')
 *     ->join('buyer_profile','orderproducts.BuyerId','buyer_profile.uid')
 *     ->where('orderproducts.id','=',$OrderPid)->first();
 *
 * Looked up by `orderproducts.id` (the ORDER LINE's own legacyId), NOT by
 * GroupId — a genuine difference from every other order-detail function
 * in this codebase (buyer-side `getBuyerOrderDetail`/`getOrderByGroupId`
 * both key off GroupId). Reproduced exactly as source does: the route
 * parameter is literally the order-line id (confirmed:
 * `order-list.blade.php:109` links `admin/view-order/{{$row->OrderPid}}`,
 * where `OrderPid` is `orderproducts.id as OrderPid` from the SAME query
 * — i.e. the order LINE's id, not the order GroupId).
 *
 * Returns `null` if no matching order line exists, OR its `productId`/
 * `buyerId` doesn't resolve to a real product/user — source's own
 * `->first()` would return `null` and the Blade view would then throw
 * trying to read properties off it (an unguarded null-object dereference,
 * the SAME class of defect as B-12, not separately catalogued but
 * structurally identical). This function returns `null` cleanly instead
 * of reproducing that crash, matching this codebase's established
 * B-12-resolution precedent (`getBuyerOrderDetail`'s own header) of
 * "preserve the result users would see, not the literal crash mechanism."
 */
export interface AdminOrderDetail {
  orderLineLegacyId: number;
  groupId: number | null;
  productName: string | null;
  hsnCode: string | null;
  quantity: number | null;
  deliveryCharge: number | null;
  totalPrice: number | null;
  orderStatus: number | null;
  createdAt: Date;
  buyerName: string | null;
  buyerMobile: string | null;
  buyerEmail: string | null;
  fullAddress: string | null;
  pinCode: string | null;
  houseNo: string | null;
  landmark: string | null;
  state: string | null;
}

export async function getAdminOrderDetail(
  db: Db,
  orderLineLegacyId: number
): Promise<AdminOrderDetail | null> {
  const lineRepo = new OrderProductRepository(db);
  const line = await lineRepo.findOne({ legacyId: orderLineLegacyId });
  if (!line) return null;

  const [product, buyer] = await Promise.all([
    line.productId !== null ? new ProductRepository(db).findByLegacyId(line.productId) : null,
    line.buyerId !== null ? new UserRepository(db).findByLegacyId(line.buyerId) : null,
  ]);

  return {
    orderLineLegacyId: line.legacyId,
    groupId: line.groupId,
    productName: product?.pName ?? null,
    hsnCode: product?.hsnCode ?? null,
    quantity: line.quantity,
    deliveryCharge: line.deliveryCharge,
    totalPrice: line.totalPrice,
    orderStatus: line.orderStatus,
    createdAt: line.createdAt,
    buyerName: buyer?.name ?? null,
    buyerMobile: buyer?.mobile ?? null,
    buyerEmail: buyer?.email ?? null,
    fullAddress: buyer?.buyerProfile?.fullAddress ?? null,
    pinCode: buyer?.buyerProfile?.pinCode ?? null,
    houseNo: buyer?.buyerProfile?.houseNo ?? null,
    landmark: buyer?.buyerProfile?.landmark ?? null,
    state: buyer?.buyerProfile?.state ?? null,
  };
}

export { getOrderByGroupId, type ReconstructedOrder };
