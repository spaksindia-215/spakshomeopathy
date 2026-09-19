import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { getAdminOrderDetail } from '@/lib/services/adminOrderService';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/view-order/{orderId}` — CR-006 Phase 3. Ported from
 * `admin/view-orders.blade.php`, `AdminController@ViewOrder($OrderPid)`
 * (`AdminController.php:1336-1345` — route param named `orderId`, the
 * method's own internal variable named `$OrderPid`; a cosmetic source
 * mismatch, no behavioral effect, per `docs/M3-APPLICATION-MAPPING.md`
 * row #138's own note).
 *
 * LOOKUP KEY: `orderproducts.id` (the ORDER LINE's own legacyId), NOT the
 * order GroupId — see `getAdminOrderDetail`'s own header in
 * `adminOrderService.ts` for the full citation confirming this against
 * both the controller's query and the linking Blade views.
 *
 * BUYER_PROFILE CORRECTION: this page was originally going to be deferred
 * (see `docs/CR-006-PHASE-3-BUYER-PROFILE-GAP.md`) on the mistaken belief
 * that `buyer_profile` had no MongoDB representation. It does — embedded
 * on `users.buyerProfile` (`schemas/user.ts`) — so this page is built in
 * this same phase, not deferred. See `getAdminOrderDetail`'s header for
 * the full correction record.
 *
 * FIELDS RENDERED: exactly what `view-orders.blade.php` renders (verified
 * directly) — buyer name/mobile/email, full address/pincode/house
 * no/landmark/state (all from `buyer_profile`), product name, HSN code,
 * quantity, delivery charge, total price (formatted with ₹), order date
 * (source: `\Carbon\Carbon::parse($getOrder->created_at)->format('d M,
 * Y')` — reproduced with the equivalent JS date formatting below, same
 * `d M, Y` shape as `updatePaymentStatus`'s own `formatPayDate`), and
 * order status via the SAME 6-way label chain as `order-list.blade.php`
 * (0=Pending...5=Cancelled, verified byte-for-byte identical between the
 * two views — unlike `seller-orders.blade.php`'s divergent 4/5 swap).
 *
 * NOT RENDERED (source has no field for it / this page doesn't need it):
 * `hsn_code` — rendered by source even when null/absent, same here.
 *
 * B-12-STYLE NULL-GUARD: `getAdminOrderDetail` returns `null` if the
 * order line doesn't exist — source's own unguarded `->first()` would
 * instead crash trying to read properties off a null object (the Blade
 * view has no `@if($getOrder)` guard). This page shows a minimal "not
 * found" state instead of reproducing that crash, matching this
 * codebase's established B-12-resolution precedent (see
 * `docs/B-12-RESOLUTION.md`) — preserve the user-visible OUTCOME
 * (something clearly went wrong), not the literal PHP fatal-error page,
 * which carries no fidelity-relevant behavior worth reproducing.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | View Order',
};

const STATUS_LABEL: Record<number, string> = {
  0: 'Pending',
  1: 'Confirm',
  2: 'Shipped',
  3: 'Completed',
  4: 'Refunded',
  5: 'Cancelled',
};

function formatOrderDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  return `${day} ${month}, ${year}`;
}

export default async function AdminViewOrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.ORDERS_VIEW);

  const { orderId } = await params;
  const orderLineLegacyId = Number(orderId);

  const order = Number.isFinite(orderLineLegacyId)
    ? await getAdminOrderDetail(db, orderLineLegacyId)
    : null;
  const message = await readAndClearFlash('message');

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css"
      />

      <section className="content-header">
        <h1>View Order</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">View Order</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          <div className="col-xs-12">
            <div className="box">
              <div className="box-body">
                {message !== null && <div className="alert alert-success">{message}</div>}

                {order === null ? (
                  // No source equivalent to mirror literally — see file
                  // header's B-12-STYLE NULL-GUARD note.
                  <p>Order not found.</p>
                ) : (
                  <table className="table table-bordered table-hover">
                    <tbody>
                      <tr>
                        <th>Buyer Name</th>
                        <th>{order.buyerName}</th>
                      </tr>
                      <tr>
                        <th>Mobile No</th>
                        <th>{order.buyerMobile}</th>
                      </tr>
                      <tr>
                        <th>Email Id</th>
                        <th>{order.buyerEmail}</th>
                      </tr>
                      <tr>
                        <th>Full Address</th>
                        <th>{order.fullAddress}</th>
                      </tr>
                      <tr>
                        <th>Pin Code</th>
                        <th>{order.pinCode}</th>
                      </tr>
                      <tr>
                        <th>House No</th>
                        <th>{order.houseNo}</th>
                      </tr>
                      <tr>
                        <th>Landmark</th>
                        <th>{order.landmark}</th>
                      </tr>
                      <tr>
                        <th>State</th>
                        <th>{order.state}</th>
                      </tr>
                      <tr>
                        <th>Product Name</th>
                        <th>{order.productName}</th>
                      </tr>
                      <tr>
                        <th>HSN Code</th>
                        <th>{order.hsnCode}</th>
                      </tr>
                      <tr>
                        <th>Quantity</th>
                        <th>{order.quantity}</th>
                      </tr>
                      <tr>
                        <th>Delivery Charge</th>
                        <th>{order.deliveryCharge}</th>
                      </tr>
                      <tr>
                        <th>Price</th>
                        <th>₹{order.totalPrice}</th>
                      </tr>
                      <tr>
                        <th>Order Date</th>
                        <th>{formatOrderDate(order.createdAt)}</th>
                      </tr>
                      <tr>
                        <th>Order Status</th>
                        <th>
                          {order.orderStatus !== null && (
                            <button className="btn btn-info">
                              {STATUS_LABEL[order.orderStatus]}
                            </button>
                          )}
                        </th>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
