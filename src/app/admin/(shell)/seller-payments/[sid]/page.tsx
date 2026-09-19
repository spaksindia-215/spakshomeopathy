import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { getSellerPaymentsView } from '@/lib/services/adminPaymentService';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/seller-payments/{sid}` — CR-006 Phase 3. Ported from
 * `admin/seller-payments.blade.php`, `AdminController@SellerPayment($sid)`
 * (`AdminController.php:1392-1403`).
 *
 * PRESERVED MISLABEL: source's `<title>`/`<h1>`/breadcrumb all literally
 * read "Manage Sellers" (verified directly — a DIFFERENT copy-paste
 * artifact than `manage-payments.blade.php`'s own correct "Manage
 * Payments" heading, even though both views render the identical table
 * structure/columns). Reproduced verbatim below, NOT corrected to
 * "Seller Payments".
 *
 * LIVE-ORPHAN: no sidebar link in source — not added here either, same
 * treatment as `seller-orders/[sid]`.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Seller Payment',
};

export default async function AdminSellerPaymentsPage({
  params,
}: {
  params: Promise<{ sid: string }>;
}) {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.ORDERS_VIEW);

  const { sid } = await params;
  const sellerId = Number(sid);

  const rows = await getSellerPaymentsView(db, sellerId);
  const message = await readAndClearFlash('message');

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css"
      />

      <section className="content-header">
        {/* PRESERVED MISLABEL — see file header. Not "Seller Payments". */}
        <h1>Manage Sellers</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Manage Sellers</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
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
