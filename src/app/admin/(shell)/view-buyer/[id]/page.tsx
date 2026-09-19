import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { UserRepository } from '@/lib/mongodb/repositories/userRepository';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/view-buyer/[id]` — ported from `admin/view-buyer.blade.php`,
 * `AdminController@ViewBuyer` (AdminController.php:992-999). `buyerProfile`
 * is embedded on the user document (see userSchema.ts), so the join against
 * `buyer_profile` in source is a single document read here.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | View Buyer',
};

export default async function AdminViewBuyerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.CUSTOMERS_VIEW);

  const { id } = await params;
  const legacyId = Number(id);
  const repo = new UserRepository(db);
  const buyer = Number.isFinite(legacyId) ? await repo.findByLegacyId(legacyId) : null;

  if (!buyer || buyer.utype !== 3) {
    notFound();
  }

  const message = await readAndClearFlash('message');

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css"
      />

      <section className="content-header">
        <h1>View Buyer</h1>
        <ol className="breadcrumb">
          <li>
            <a href="/admin/home">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">View Buyer</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <div className="col-xs-12">
            <div className="box">
              <div className="box-body">
                <table id="example2" className="table table-bordered table-hover">
                  <tbody>
                    <tr>
                      <th>Name</th>
                      <td>{buyer.name}</td>
                    </tr>
                    <tr>
                      <th>Email Id</th>
                      <td>{buyer.email}</td>
                    </tr>
                    <tr>
                      <th>Mobile No</th>
                      <td>{buyer.mobile}</td>
                    </tr>
                    <tr>
                      <th>Pin Code</th>
                      <td>{buyer.buyerProfile?.pinCode}</td>
                    </tr>
                    <tr>
                      <th>Full Address</th>
                      <td>{buyer.buyerProfile?.fullAddress}</td>
                    </tr>
                    <tr>
                      <th>House No</th>
                      <td>{buyer.buyerProfile?.houseNo}</td>
                    </tr>
                    <tr>
                      <th>Landmark</th>
                      <td>{buyer.buyerProfile?.landmark}</td>
                    </tr>
                    <tr>
                      <th>State</th>
                      <td>{buyer.buyerProfile?.state}</td>
                    </tr>
                    <tr>
                      <th>Country</th>
                      <td>{buyer.buyerProfile?.country}</td>
                    </tr>
                    <tr>
                      <th>Status</th>
                      <td>
                        {buyer.status === 1 ? (
                          <a
                            href={`/admin/update-user-status/${buyer.legacyId}`}
                            className="btn btn-danger"
                          >
                            Deactivate
                          </a>
                        ) : (
                          <a
                            href={`/admin/update-user-status/${buyer.legacyId}`}
                            className="btn btn-success"
                          >
                            Activate
                          </a>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      <script src="/admin-assets/bower_components/datatables.net/js/jquery.dataTables.min.js"></script>
      <script src="/admin-assets/bower_components/datatables.net-bs/js/dataTables.bootstrap.min.js"></script>
      <script
        dangerouslySetInnerHTML={{
          __html: `
$(function () {
$('#example2').DataTable({
'paging'      : true,
'lengthChange': false,
'searching'   : false,
'ordering'    : true,
'info'        : true,
'autoWidth'   : false
})
})
`,
        }}
      />
    </>
  );
}
