/**
 * Buyer order read-reconstruction — a thin service wrapper over the
 * ALREADY-EXISTING `OrderRepository`/`getOrderByGroupId`/
 * `getOrderGroupIdsForBuyer` (src/lib/mongodb/repositories/orderRepository.ts,
 * built M3-A). No new repository, no new collection, no new schema — this
 * file exists to demonstrate what a service layer looks like over
 * established repositories, and to answer the owner's specific emphasis
 * on the orders/orderProducts/payments group (docs/M4-PREPARATION.md).
 *
 * MIRRORS: `BuyerController@ManageOrders` and `BuyerController@ViewOrder`
 * (public_html/app/Http/Controllers/BuyerController.php:71-91), behind the
 * `checkBuyer` middleware — routes `GET manage-orders` / `GET
 * view-order/{orderId}` (docs/M3-APPLICATION-MAPPING.md rows #58/#59).
 *
 * ============================================================================
 * DR-01 NOTE (see docs/M4-PREPARATION.md for the full callout): this file's
 * functions assume orders/orderProducts/payments as THREE SEPARATE
 * collections, per the current owner instruction for this phase ("keep
 * them as three separate collections; do not embed them"). Separately:
 * `docs/M3-OWNER-DECISION-RECORDS.md` states plainly "No decision below is
 * approved" for DR-01, while `src/lib/mongodb/schemas/order.ts`'s own
 * header comment claims "DR-01 (APPROVED, 2026-08-16)" — a pre-existing
 * contradiction between those two files, discovered this phase, NOT
 * introduced or resolved here (neither file is edited by this phase). Both
 * of the contradicting statements already agree on the same shape (three
 * collections), so this file's own correctness is unaffected either way —
 * flagged for a future cleanup pass, not silently resolved.
 * ============================================================================
 *
 * ManageOrders SOURCE (VERIFIED, public_html/, BuyerController.php:71-82):
 *   $uid=Auth::user()->id;
 *   DB::table('orderproducts')
 *     ->join('products','orderproducts.ProductId','products.id')
 *     ->join('orders','orders.GroupId','orderproducts.GroupId')
 *     ->select('orderproducts.*','products.*','orderproducts.id as OrderPid','orders.qr_transection_id')
 *     ->where('orderproducts.BuyerId',$uid)
 *     ->orderBy('orderproducts.id','DESC')
 *     ->paginate(20);
 *
 * DOCUMENTED DIFFERENCE / SCOPE LIMIT: the real Laravel query is a 3-table
 * join (orderproducts ⋈ products ⋈ orders) with ordering and pagination.
 * `getBuyerOrderGroupIds` below reuses the EXISTING
 * `getOrderGroupIdsForBuyer` helper, which returns only the distinct
 * GroupIds for a buyer (via `orderProducts.buyerId`, the same filter
 * column `ManageOrders` uses) — it does NOT join in product data, does not
 * sort, and does not paginate. Extending it to fully match `ManageOrders`'
 * shape (product join + sort + pagination) is real, additional work
 * deliberately deferred — adding it here would exceed this phase's "small,
 * independently verifiable slice" scope (it would require pulling
 * `ProductRepository` into this file and designing pagination semantics
 * not yet touched anywhere in this codebase). This is named explicitly so
 * it is not mistaken for a completed 1:1 mirror.
 *
 * ViewOrder SOURCE (VERIFIED, public_html/, BuyerController.php:85-91):
 *   DB::table('orders')->join('products','products.id','orders.pid')
 *     ->where('orders.id','=',$orderId)->first();
 *
 * This is cataloged **Broken (B-12)** — `orders.pid` does not exist as a
 * column (verified directly against schemas/order.ts and the source
 * CREATE TABLE — the real field is `ProductId`/`productId`). ADDITIONALLY
 * DISCOVERED THIS SLICE (not previously documented anywhere): `ViewOrder`
 * also returns `view('view-orders')`, but NO top-level
 * `resources/views/view-orders.blade.php` FILE EXISTS on disk — only
 * `buyer/view-orders.blade.php` and `admin/buyer/view-orders.blade.php`,
 * neither of which Laravel's standard view-resolution (`config/view.php`'s
 * default, unmodified, `resource_path('views')`-only paths) would ever
 * select for a bare `view('view-orders')` call. `/view-order/{orderId}` is
 * therefore broken TWICE over on live Laravel — a SQL join error (B-12)
 * AND a missing-view error, independently, either of which alone would
 * make every real request fail. See `docs/B-12-RESOLUTION.md` for the
 * full owner-authorized correction record.
 *
 * ===========================================================================
 * M4 BUYER-ORDERS SLICE (this session) — owner-authorized B-12 correction.
 * The three functions below (`getBuyerManageOrdersView`,
 * `getBuyerOrderDetail`, `cancelBuyerOrder`) are the REAL, wired
 * implementations backing `/manage-orders`, `/view-order/[orderId]`, and
 * `/cancel-order`. `getBuyerOrderGroupIds`/`getBuyerOrderView` above (the
 * ORIGINAL M4-PREP functions) are LEFT IN PLACE, UNMODIFIED, still
 * covered by their own pre-existing tests — they are superseded for
 * PRODUCTION USE by the ownership-checked versions below, not deleted,
 * per this project's "append, don't silently replace" convention (same
 * pattern GATE-REPORT-M4-AUTH.md's addenda follow). The key functional
 * difference: `getBuyerOrderView` (above) does NOT check that the
 * GroupId belongs to the calling buyer — anyone who knew a valid GroupId
 * could reconstruct ANY order through it. `getBuyerOrderDetail` (below)
 * closes that gap, which the M4 buyer-orders-slice task requires
 * ("verify the requested order belongs to the current buyer").
 * ===========================================================================
 */

import type { Db } from 'mongodb';
import {
  getOrderByGroupId,
  getOrderGroupIdsForBuyer,
  getOwnedOrderByGroupId,
  cancelOwnedOrder,
  type ReconstructedOrder,
} from '../mongodb/repositories/orderRepository';
import { ProductRepository } from '../mongodb/repositories/productRepository';
import type { Product } from '../mongodb/schemas';

/**
 * Mirrors `ManageOrders`' buyer filter (`orderproducts.BuyerId`) — see file
 * header for the documented scope limit versus the real 3-table join.
 */
export async function getBuyerOrderGroupIds(db: Db, buyerId: number): Promise<number[]> {
  return getOrderGroupIdsForBuyer(db, buyerId);
}

/**
 * A correct order/lines/payments reconstruction for one GroupId — the
 * intent behind `ViewOrder`, without reproducing its B-12 crash. See file
 * header for the full reasoning.
 *
 * NO OWNERSHIP CHECK — see `getBuyerOrderDetail` below for the
 * ownership-checked version this slice adds. Retained unmodified for its
 * own pre-existing tests (`tests/services/orderService.test.ts`).
 */
export async function getBuyerOrderView(db: Db, groupId: number): Promise<ReconstructedOrder> {
  return getOrderByGroupId(db, groupId);
}

/** One row of the `/manage-orders` listing — mirrors the SELECTed columns
 * of `ManageOrders`' 3-table join (`orderproducts.*`, `products.*`,
 * `orderproducts.id as OrderPid`, `orders.qr_transection_id`), narrowed to
 * exactly the fields `manage-orders.blade.php` actually renders
 * (`qr_transection_id`, `p_slug`, `p_name`, `quantity`, `SellPrice`,
 * `TotalPrice`, `OrderStatus`, plus `GroupId` for the cancel-link target —
 * verified directly against the Blade view this session, not assumed). */
export interface ManageOrdersRow {
  groupId: number;
  orderLineLegacyId: number;
  qrTransectionId: string;
  productSlug: string | null;
  productName: string | null;
  quantity: number | null;
  sellPrice: number | null;
  totalPrice: number | null;
  orderStatus: number | null;
}

/**
 * Mirrors `ManageOrders`'s FULL 3-table join (`orderproducts` ⋈
 * `products` ⋈ `orders`), buyer-filtered, DESC-ordered — the piece
 * `getBuyerOrderGroupIds` above deliberately left unbuilt (see that
 * function's own file-header note, "extending it... deliberately
 * deferred"). Built this slice as the actual `/manage-orders` page's data
 * source.
 *
 * DOCUMENTED DIFFERENCE: Laravel performs this as ONE SQL join; here it
 * is `getOrderGroupIdsForBuyer` (already DESC-ordered, see that
 * function's own header) + a batch `ProductRepository.findByLegacyIds`
 * ($in) + per-GroupId `orders`/`orderProducts` lookups combined in
 * application code — same DR-01 Option B application-level-join pattern
 * every other order-reconstruction function in this codebase already
 * uses, not a new technique invented for this slice.
 *
 * PAGINATION: source paginates 20/page (`->paginate(20)`). NOT
 * implemented — see `getOrderGroupIdsForBuyer`'s own header: real
 * `spaks_dev` data confirms no buyer has more than 11 order lines
 * (verified this session via a read-only aggregation), so a 20-per-page
 * cutoff is never actually reached by any real account today. Flagged,
 * not silently assumed irrelevant forever.
 */
export async function getBuyerManageOrdersView(
  db: Db,
  buyerId: number
): Promise<ManageOrdersRow[]> {
  const groupIds = await getOrderGroupIdsForBuyer(db, buyerId);
  if (groupIds.length === 0) return [];

  const products = new ProductRepository(db);
  const rows: ManageOrdersRow[] = [];

  // One reconstruction per GroupId (small, bounded N per real account —
  // see PAGINATION note above); batches product lookups within each.
  for (const groupId of groupIds) {
    const { order, lines } = await getOrderByGroupId(db, groupId);
    if (!order) continue; // defensive — a GroupId from orderProducts with no matching orders row
    const productIds = lines.map((l) => l.productId).filter((id): id is number => id !== null);
    const productList = await products.findByLegacyIds(productIds);
    const productById = new Map<number, Product>(productList.map((p) => [p.legacyId, p]));

    for (const line of lines) {
      const product = line.productId !== null ? productById.get(line.productId) : undefined;
      rows.push({
        groupId,
        orderLineLegacyId: line.legacyId,
        qrTransectionId: order.qrTransectionId,
        productSlug: product?.pSlug ?? null,
        productName: product?.pName ?? null,
        quantity: line.quantity,
        sellPrice: line.sellPrice,
        totalPrice: line.totalPrice,
        orderStatus: line.orderStatus,
      });
    }
  }

  return rows;
}

/**
 * Ownership-checked order-detail reconstruction — the B-12 correction's
 * actual `/view-order/[orderId]` data source. See
 * `docs/B-12-RESOLUTION.md` for the full mapping from the broken Laravel
 * lookup to this one.
 *
 * Returns `null` if the order doesn't exist OR doesn't belong to
 * `buyerId` — indistinguishable from the caller's perspective, matching
 * `getOwnedOrderByGroupId`'s own documented reasoning (no ownership/
 * existence enumeration surface).
 */
/** One `orderProducts` line, joined with its associated `Product` (or
 * `null` if not found — matches `manage-orders`' own tolerance for a
 * missing product join target, not a thrown error). */
export type OrderDetailLine = ReconstructedOrder['lines'][number] & {
  product: Product | null;
};

export interface BuyerOrderDetail {
  order: NonNullable<ReconstructedOrder['order']>;
  lines: OrderDetailLine[];
  payments: ReconstructedOrder['payments'];
}

export async function getBuyerOrderDetail(
  db: Db,
  groupId: number,
  buyerId: number
): Promise<BuyerOrderDetail | null> {
  const owned = await getOwnedOrderByGroupId(db, groupId, buyerId);
  if (!owned || !owned.order) return null;

  const products = new ProductRepository(db);
  const productIds = owned.lines.map((l) => l.productId).filter((id): id is number => id !== null);
  const productList = await products.findByLegacyIds(productIds);
  const productById = new Map<number, Product>(productList.map((p) => [p.legacyId, p]));

  const lines: OrderDetailLine[] = owned.lines.map((line) => ({
    ...line,
    product: line.productId !== null ? (productById.get(line.productId) ?? null) : null,
  }));

  return {
    order: owned.order,
    payments: owned.payments,
    lines,
  };
}

/**
 * Mirrors `BuyerController::CancelOrder` — see
 * `cancelOwnedOrder`'s own header (`orderRepository.ts`) for the full
 * source citation, the exact status-value verification (uniformly `4`
 * across all three collections for the BUYER path specifically), and the
 * ownership-check deviation-from-source disclosure.
 *
 * Returns `false` if the order doesn't exist or isn't owned by this
 * buyer (no write performed) — the caller (`cancel-order/route.ts`) maps
 * this to the same `message` flash source uses for its one success case,
 * adjusted for the failure case since source has no failure branch to
 * mirror (it never checks ownership, so it never HAS a rejection path —
 * see `cancelOwnedOrder`'s own header for why inventing a REJECTION
 * message here is a deliberate, owner-authorized addition, not a
 * fidelity violation).
 */
export async function cancelBuyerOrder(db: Db, groupId: number, buyerId: number): Promise<boolean> {
  return cancelOwnedOrder(db, groupId, buyerId);
}
