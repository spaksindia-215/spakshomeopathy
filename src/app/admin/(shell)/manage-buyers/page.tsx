import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { UserRepository } from '@/lib/mongodb/repositories/userRepository';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/manage-buyers` — the sidebar's "Manage Users" link. Ported from
 * `admin/manage-buyers.blade.php`, `AdminController@GetBuyers`
 * (AdminController.php:986-990): every `utype===3` (buyer) account.
 *
 * This page previously did not exist at all — the sidebar link 404'd.
 * Not to be confused with `/admin/users-list` (a separate, correctly
 * literal port of the differently-named `users-list` route, which lists
 * `utype===2` sellers — see that page's own header).
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Manage Buyers',
};

export default async function AdminManageBuyersPage() {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.CUSTOMERS_VIEW);

  const repo = new UserRepository(db);
  const buyers = await repo.findAllBuyers();
  const message = await readAndClearFlash('message');

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css"
      />

      <section className="content-header">
        <h1>Manage Buyers</h1>
        <ol className="breadcrumb">
          <li>
            <a href="/admin/home">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Manage Buyers</li>
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
                      <th>S.No</th>
                      <th>Name</th>
                      <th>Email Id</th>
                      <th>Mobile No</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buyers.map((buyer, i) => (
                      <tr key={buyer.legacyId}>
                        <td>{i + 1}</td>
                        <td>{buyer.name}</td>
                        <td>{buyer.email}</td>
                        <td>{buyer.mobile}</td>
                        <td>
                          <a href={`/admin/view-buyer/${buyer.legacyId}`}>
                            <i className="fa fa-eye"></i>
                          </a>
                          &nbsp;&nbsp;&nbsp;&nbsp;
                          <a href={`/admin/destroy-user/${buyer.legacyId}`}>
                            <i className="fa fa-trash"></i>
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
