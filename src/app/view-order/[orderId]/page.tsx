import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';
import { requireBuyerSession } from '@/lib/auth/guard';
import { getDb } from '@/lib/mongodb/client';
import { getBuyerOrderDetail } from '@/lib/services/orderService';

/**
 * `/view-order/[orderId]` — ported from `GET view-order/{orderId}`
 * (`routes/web.php:113`, inside `checkBuyer`) → `BuyerController@ViewOrder`
 * (`BuyerController.php:85-91`).
 *
 * **B-12 CORRECTION — see `docs/B-12-RESOLUTION.md` for the full record.**
 * Source is broken on two independent axes (verified this session): (1)
 * `orders.pid` does not exist as a column (the original, previously
 * documented B-12), and (2) `return view('view-orders')` resolves to a
 * Blade file that does not exist at the path Laravel's view resolution
 * would check (only `buyer/view-orders.blade.php` and
 * `admin/buyer/view-orders.blade.php` exist, neither reachable by a bare
 * `view('view-orders')` call). Either failure alone makes every real
 * request to this route fail; owner decision (this session): do NOT
 * reproduce either crash — reconstruct the INTENDED order-detail lookup
 * against the actual migrated data model instead.
 *
 * URL PARAMETER MEANING — A DELIBERATE, DOCUMENTED CHOICE: source's route
 * param is named `{orderId}` and is used as `orders.id` (the ORDERS
 * table's own row primary key) in the (broken) query. This page keeps the
 * SAME PARAMETER NAME (`orderId`) for URL-shape continuity, but its VALUE
 * is treated as the order's **GroupId** — the schema's own documented
 * "TRUE order-linkage key" (`schemas/order.ts` header), not `orders.id`/
 * `legacyId`. Reasoning: source's `orders.id` (i.e. `orders.legacyId`) is
 * the ORDER-HEADER row's own primary key, which is meaningless without
 * also knowing the GroupId to find the associated `orderProducts`/
 * `payments` rows anyway — B-12's join was ALREADY attempting (however
 * incorrectly) to pull in `products` data via a `pid` that should have
 * been `productId`, itself implying the intent was "show this order's
 * product," which is fundamentally a GroupId-keyed operation in this
 * schema (one order = one GroupId = N orderProducts lines = N payments
 * rows). Using GroupId directly, rather than looking up `orders.legacyId`
 * only to immediately re-derive its GroupId, is the more direct
 * implementation of the same intent — not a redesign of the data model
 * (still reads from the same three collections, still keyed by the same
 * GroupId every other order-reconstruction function in this codebase
 * already uses).
 *
 * OWNERSHIP CHECK: `getBuyerOrderDetail()` verifies the order belongs to
 * the authenticated buyer (via `orderProducts.buyerId`, matching
 * `ManageOrders`' own ownership-filter column) before returning any data
 * — a nonexistent OR not-owned order both render this page's 404 state,
 * indistinguishably (no enumeration surface). Source has no ownership
 * check to preserve (verified — `ViewOrder` has neither a WHERE-buyer
 * clause nor a session-based filter), so this is the M4
 * buyer-orders-slice task's explicit "verify the requested order belongs
 * to the current buyer" requirement, not a reproduction of an existing
 * source check.
 *
 * FIELDS SHOWN: no Laravel view to mirror field-for-field (see above) —
 * shows exactly the data `getBuyerOrderDetail` actually returns: the
 * order header (GroupId, transaction id, status, pricing), each
 * orderProducts line with its associated product (name/slug/image), and
 * associated payment records. Does not invent fields beyond what these
 * three collections actually carry.
 *
 * ROUTE PROTECTION: gated by `requireBuyerSession()`, mirroring
 * `checkBuyer` (`view-order/{orderId}` is one of its routes,
 * `web.php:113`).
 */
export const metadata: Metadata = {
  title: 'Spakshomeopathy - View Order',
};

const STATUS_LABEL: Record<number, string> = {
  0: 'Pending',
  1: 'Confirm',
  2: 'Shipped',
  3: 'Completed',
  4: 'Refund',
  5: 'Cancelled',
};

export default async function ViewOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const session = await requireBuyerSession();
  const { orderId } = await params;

  const groupId = Number(orderId);
  if (!Number.isInteger(groupId)) {
    // Malformed URL segment (non-numeric) — not a source branch to
    // mirror (source's own broken query would have thrown regardless of
    // input shape); a clean 404 is the closest faithful "this doesn't
    // resolve to anything" outcome.
    notFound();
  }

  const db = await getDb();
  const detail = await getBuyerOrderDetail(db, groupId, session.userId);

  if (!detail || !detail.order) {
    // Covers BOTH "no such order" and "not this buyer's order" —
    // deliberately indistinguishable, see file header.
    notFound();
  }

  const { order, lines, payments } = detail;

  return (
    <div className="page-wrapper">
      <PublicStylesheets />
      <PublicHeader />

      <div className="row">
        <div className="col-12">
          <div className="breadcrumb-wrap">
            <nav aria-label="breadcrumb">
              <ul className="breadcrumb">
                <li className="breadcrumb-item">
                  <Link href="/">Home</Link>
                </li>
                <li className="breadcrumb-item">
                  <Link href="/manage-orders">My Orders</Link>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  View Order
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>

      <section className="cart-section sec-pad pb-0">
        <div className="container">
          <div className="inner-container">
            <table className="table table-bordered">
              <tbody>
                <tr>
                  <th>Group Id</th>
                  <td>{order.groupId}</td>
                </tr>
                <tr>
                  <th>Transaction Id</th>
                  <td>{order.qrTransectionId}</td>
                </tr>
                <tr>
                  <th>Order Status</th>
                  <td>
                    {order.orderStatus !== null
                      ? (STATUS_LABEL[order.orderStatus] ?? order.orderStatus)
                      : '—'}
                  </td>
                </tr>
                <tr>
                  <th>Total Price</th>
                  <td>₹{order.totalPrice}</td>
                </tr>
                <tr>
                  <th>Order Date</th>
                  <td>{order.orderDate}</td>
                </tr>
                <tr>
                  <th>Delivery Date</th>
                  <td>{order.deliveryDate}</td>
                </tr>
                <tr>
                  <th>Pay Mode</th>
                  <td>{order.payMode}</td>
                </tr>
              </tbody>
            </table>

            <h3>Products</h3>
            <table className="table table-bordered">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Sell Price</th>
                  <th>Total Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.legacyId}>
                    <td>
                      {line.product?.pSlug ? (
                        <a
                          href={`/product-details/${line.product.pSlug}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {line.product.pName}
                        </a>
                      ) : (
                        (line.product?.pName ?? '—')
                      )}
                    </td>
                    <td>{line.quantity}</td>
                    <td>₹{line.sellPrice}</td>
                    <td>₹{line.totalPrice}</td>
                    <td>
                      {line.orderStatus !== null
                        ? (STATUS_LABEL[line.orderStatus] ?? line.orderStatus)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {payments.length > 0 && (
              <>
                <h3>Payment</h3>
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th>Amount</th>
                      <th>Pay Mode</th>
                      <th>Pay Status</th>
                      <th>Pay Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.legacyId}>
                        <td>₹{payment.amount}</td>
                        <td>{payment.payMode}</td>
                        <td>{payment.payStatus === 1 ? 'Paid' : 'Pending'}</td>
                        <td>{payment.payDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <div className="result"></div>
          </div>
        </div>
      </section>
      <br />
      <br />

      <PublicFooter />
      <PublicScripts />
    </div>
  );
}
