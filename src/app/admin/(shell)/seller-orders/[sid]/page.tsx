import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { getSellerOrdersView } from '@/lib/services/adminOrderService';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { encryptGroupId } from '@/lib/auth/orderToken';

/**
 * `/admin/seller-orders/{sid}` — CR-006 Phase 3. Ported from
 * `admin/seller-orders.blade.php` — titled "Order List" in source
 * (verified: the Blade `<title>`/`<h1>`/breadcrumb all literally read
 * "Order List", not "Seller Orders" — a copy-paste artifact from
 * `order-list.blade.php`, reproduced verbatim below, NOT corrected),
 * `AdminController@SellerOrders($sid)` (`AdminController.php:1322-1332`).
 *
 * LIVE-ORPHAN: no sidebar link in source (`docs/M3-APPLICATION-MAPPING.md`
 * row #137) — deliberately NOT added to `AdminSidebar.tsx` by this phase,
 * matching Laravel exactly. Reachable only by direct URL, same as on the
 * real site.
 *
 * STATUS LABELS: source's OWN, DIFFERENT 6-way chain versus
 * `order-list.blade.php` — verified directly: 4=Cancelled, 5=Refund
 * (SWAPPED relative to order-list's 4=Refund, 5=Cancelled). This is a
 * genuine, separate copy-paste divergence between the two views, not a
 * transcription error here — reproduced exactly as source has it.
 *
 * CANCEL LINK: rendered only when `OrderStatus==0 || ==1 || ==2`
 * (source line 100) — note this is a DIFFERENT condition shape than
 * order-list's `!=5 && !=3` (an inclusion list here vs. an exclusion
 * check there) and this page has NO "Shipped?" action at all (only
 * Cancel) — both differences preserved, not unified with order-list's page.
 *
 * VIEW LINK: points at `/admin/view-order/{orderLineLegacyId}`, matching
 * source's `url('admin/view-order/'.$row->OrderPid)` exactly — this page
 * exists (`view-order/[orderId]/page.tsx`, this same phase; see
 * `docs/CR-006-PHASE-3-BUYER-PROFILE-GAP.md` for the corrected record of
 * why it was briefly thought to need deferring, and why it didn't).
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Order List', // PRESERVED MISLABEL — see file header
};

const STATUS_LABEL: Record<number, string> = {
  0: 'Pending',
  1: 'Confirm',
  2: 'Shipped',
  3: 'Completed',
  4: 'Cancelled',
  5: 'Refund',
};

const CANCELLABLE_STATUSES = new Set([0, 1, 2]);

export default async function AdminSellerOrdersPage({
  params,
}: {
  params: Promise<{ sid: string }>;
}) {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.ORDERS_VIEW);

  const { sid } = await params;
  const sellerId = Number(sid);

  const rows = await getSellerOrdersView(db, sellerId);

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css"
      />

      <section className="content-header">
        {/* PRESERVED MISLABEL — see file header. Not "Seller Orders". */}
        <h1>Order List</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Order List</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          <div className="col-xs-12">
            <div className="box">
              <div className="box-body">
                <table id="example2" className="table table-bordered table-hover">
                  <thead>
                    <tr>
                      <th style={{ width: '5%' }}>S.No</th>
                      <th style={{ width: '10%' }}>Seller Id</th>
                      <th style={{ width: '20%' }}>Product Title</th>
                      <th style={{ width: '10%' }}>Image</th>
                      <th style={{ width: '10%' }}>Quantity</th>
                      <th style={{ width: '10%' }}>Price</th>
                      <th style={{ width: '10%' }}>Total Price</th>
                      <th style={{ width: '20%' }}>Status</th>
                      <th style={{ width: '5%' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={row.orderLineLegacyId}>
                        <td>{i + 1}</td>
                        <td>{row.sellerEmail}</td>
                        <td>
                          {row.productSlug !== null ? (
                            <a href={`/detail/${row.productSlug}`} target="_blank" rel="noreferrer">
                              {row.productName}
                            </a>
                          ) : (
                            row.productName
                          )}
                        </td>
                        <td>
                          <img
                            src={`/uploaded_files/products/${row.orderImage ?? ''}`}
                            style={{ height: '100px', width: '100px' }}
                            alt=""
                          />
                        </td>
                        <td>{row.quantity}</td>
                        <td>₹{row.sellPrice}</td>
                        <td>₹{row.totalPrice}</td>
                        <td>
                          {row.orderStatus !== null && (
                            <button className="btn btn-info">
                              {STATUS_LABEL[row.orderStatus]}
                            </button>
                          )}
                          {row.orderStatus !== null &&
                            CANCELLABLE_STATUSES.has(row.orderStatus) &&
                            row.groupId !== null && (
                              <>
                                {' '}
                                <a
                                  href={`/admin/cancel-order?cncl_id=${encryptGroupId(row.groupId)}`}
                                  className="btn btn-danger"
                                >
                                  Cancel?
                                </a>
                              </>
                            )}
                        </td>
                        <td>
                          <a
                            className="btn btn-secondary"
                            href={`/admin/view-order/${row.orderLineLegacyId}`}
                          >
                            <i className="fa fa-eye" aria-hidden="true"></i>
                          </a>
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
