import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { getAdminOrderListView } from '@/lib/services/adminOrderService';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { readAndClearFlash } from '@/lib/auth/flash';
import { encryptGroupId } from '@/lib/auth/orderToken';

/**
 * `/admin/order-list` — CR-006 Phase 3. Ported from
 * `admin/order-list.blade.php` (169 lines), `AdminController@ManageOrders`
 * (`AdminController.php:1311-1320`). MIGRATION, not new product — see
 * `docs/CR-006-ANALYSIS-PHASE1.md` §1 and `docs/CR-006-PHASE-3-PLAN.md`.
 *
 * Already linked from `AdminSidebar.tsx` ("Manage Orders" →
 * `/admin/order-list`) — this page closes what was previously a dead link
 * in the migrated admin (confirmed in Phase 1 analysis).
 *
 * DATA SOURCE: `getAdminOrderListView` (`adminOrderService.ts`), reusing
 * the existing `OrderProductRepository`/`ProductRepository` — the same
 * live MongoDB layer the buyer-side `/manage-orders` page already uses.
 *
 * STATUS LABELS: source's exact 6-way chain over `OrderStatus`
 * (verified against `order-list.blade.php:83-98`) — 0=Pending,
 * 1=Confirm, 2=Shipped, 3=Completed, 4=Refund, 5=Cancelled — same
 * un-corrected English as the buyer-side page (`manage-orders/page.tsx`),
 * reproduced identically per contract F-17/NN-4.
 *
 * SHIP/CANCEL LINKS: rendered only when `OrderStatus != 5 && != 3`
 * (source line 104), matching exactly — not simplified to a different
 * condition. `GroupId` is encrypted into the query string via
 * `encryptGroupId` (source: `encrypt($row->GroupId)`) — reusing the same
 * token mechanism the buyer-side cancel flow already established
 * (`src/lib/auth/orderToken.ts`), not a new one.
 *
 * PRESERVED: unpaginated (P-15), no search/sort UI beyond the inert
 * DataTables include (source never calls `.DataTable()` on this page's
 * table id — verified: `order-list.blade.php`'s script block DOES call it
 * on `#example2`, so — unlike `product-list`/`cat-list` — this one IS
 * live-initialized in source; reproduced with a real init script below).
 *
 * RBAC: gated by `requireAdminSession()` (unchanged) composed with
 * `requirePermissionForSession(db, session, PERMISSIONS.ORDERS_VIEW)`
 * (Phase 2's mechanism, first real use). Role resolution became real in
 * Phase 9 (`rbac-guard.ts`) — before that, every admin session implicitly
 * resolved to Super Admin, so this check had no observable effect on the
 * one real admin account.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Order List',
};

const STATUS_LABEL: Record<number, string> = {
  0: 'Pending',
  1: 'Confirm',
  2: 'Shipped',
  3: 'Completed',
  4: 'Refund',
  5: 'Cancelled',
};

/** Mirrors source's literal condition (`order-list.blade.php:104`):
 * `$row->OrderStatus != 5 && $row->OrderStatus != 3` — not an enumerated
 * allow-list, so any status value other than 3/5 (not just 0/1/2/4)
 * correctly shows the actions, matching source's own two-negative-checks
 * shape exactly. */
function isActionable(orderStatus: number): boolean {
  return orderStatus !== 5 && orderStatus !== 3;
}

export default async function AdminOrderListPage() {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.ORDERS_VIEW);

  const rows = await getAdminOrderListView(db);
  const message = await readAndClearFlash('message');

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css"
      />

      <section className="content-header">
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
          {message !== null && <div className="alert alert-success">{message}</div>}
          <div className="col-xs-12">
            <div className="box">
              <div className="box-body">
                <table id="example2" className="table table-bordered table-hover">
                  <thead>
                    <tr>
                      <th style={{ width: '5%' }}>S.No</th>
                      <th style={{ width: '20%' }}>Product Title</th>
                      <th style={{ width: '10%' }}>Image</th>
                      <th style={{ width: '10%' }}>Quantity</th>
                      <th style={{ width: '10%' }}>Price</th>
                      <th style={{ width: '10%' }}>Total Price</th>
                      <th style={{ width: '10%' }}>Status</th>
                      <th style={{ width: '20%' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={row.orderLineLegacyId}>
                        <td>{i + 1}</td>
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
                        </td>
                        <td>
                          {row.orderStatus !== null &&
                            isActionable(row.orderStatus) &&
                            row.groupId !== null && (
                              <>
                                <a
                                  href={`/admin/change-order-status?order_id=${encryptGroupId(row.groupId)}`}
                                  className="btn btn-success"
                                >
                                  Shipped?
                                </a>{' '}
                                <a
                                  href={`/admin/cancel-order?cncl_id=${encryptGroupId(row.groupId)}`}
                                  className="btn btn-info"
                                >
                                  Cancel?
                                </a>{' '}
                              </>
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
