import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { getAdminPaymentsView } from '@/lib/services/adminPaymentService';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/manage-payments` — CR-006 Phase 3. Ported from
 * `admin/manage-payments.blade.php`, `AdminController@ManagePayment`
 * (the SINGULAR, ROUTED method — see `adminPaymentService.ts`'s header
 * for the disclosure of the dead, unrouted `ManagePayments` plural, NOT
 * ported here).
 *
 * LIVE-ORPHAN per `docs/M3-APPLICATION-MAPPING.md` row #162 — no sidebar
 * link in source; not added here either.
 *
 * ACTION COLUMN: source's exact 3-way conditional
 * (`manage-payments.blade.php:264-270`) — `orderStatus!=3` -> disabled
 * "Pending"; `orderStatus==3 && payStatus!=2` -> live "Pending" link;
 * `orderStatus==3 && payStatus==2` -> disabled "Paid". Reproduced exactly,
 * including the disabled-link-as-inert-anchor pattern (`href="#"
 * class="... disabled"`), not converted to a `<button disabled>`.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Manage Payment',
};

export default async function AdminManagePaymentsPage() {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.ORDERS_VIEW);

  const rows = await getAdminPaymentsView(db);
  const message = await readAndClearFlash('message');

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css"
      />

      <section className="content-header">
        <h1>Manage Payments</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Manage Payments</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {/* Source's alert class is `alert-danger` here despite the
              message being a success confirmation — a genuine, preserved
              source styling quirk (verified: `manage-payments.blade.php:225`
              uses `alert-danger`, unlike `view-orders.blade.php`'s
              `alert-success` for the analogous message). Not corrected. */}
          {message !== null && <div className="alert alert-danger">{message}</div>}
          <div className="col-xs-12">
            <div className="box">
              <div className="box-body">
                <table id="example2" className="table table-bordered table-hover">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Seller Email</th>
                      <th>Product Name</th>
                      <th>Quantity</th>
                      <th>Amount</th>
                      <th>Total Amount</th>
                      <th>Admin Fee</th>
                      <th>Recived</th>
                      <th>Pay Mode</th>
                      <th>Transfer Date</th>
                      <th>Pay Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={row.paymentLegacyId}>
                        <td>{i + 1}</td>
                        <td>{row.sellerEmail}</td>
                        <td>{row.productName}</td>
                        <td>{row.qunt}</td>
                        <td>₹{row.amount}</td>
                        <td>₹{row.totalAmount}</td>
                        <td>₹{row.adminFee}</td>
                        <td>{row.sellerPay}</td>
                        <td>{row.payMode}</td>
                        <td>{row.payDate}</td>
                        <td>
                          {row.orderStatus !== 3 && (
                            <a href="#" className="btn btn-info disabled">
                              Pending
                            </a>
                          )}
                          {row.orderStatus === 3 && row.payStatus !== 2 && (
                            <a
                              href={`/admin/change-payment-status?payId=${row.paymentLegacyId}`}
                              className="btn btn-primary"
                            >
                              Pending
                            </a>
                          )}
                          {row.orderStatus === 3 && row.payStatus === 2 && (
                            <a href="#" className="btn btn-success disabled">
                              Paid
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      <script
        dangerouslySetInnerHTML={{
          __html: `
$(function () {
  $('#example2').DataTable({
    paging: true,
    lengthChange: false,
    searching: false,
    ordering: true,
    info: true,
    autoWidth: false
  });
});
`,
        }}
      />
    </>
  );
}
