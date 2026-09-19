import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { UserRepository } from '@/lib/mongodb/repositories/userRepository';

/**
 * `/admin/users-list` — ported from `admin/users-list.blade.php` (146
 * lines), `AdminController@UsersList`.
 *
 * NAMING INVERSION, confirmed against source (`AdminController@UsersList`
 * line 1228): filters `utype=2` — SELLERS, per `schemas/user.ts`'s own
 * header ("2=seller, VESTIGIAL — can never log in") — NOT buyers, despite
 * the page's generic "Users" naming. The sidebar's "Manage Users" nav link
 * goes to a separate route, `/admin/manage-buyers` (`utype=3`). This page
 * mirrors the real, literal `users-list` route/controller — not the
 * sidebar's more intuitive label. URL-only: no sidebar entry points here.
 *
 * CONFIRMED ZERO REAL ROWS: `utype=2` has 0 rows in production (1 admin,
 * 818 buyers, 0 sellers — verified against the real dump). Renders
 * honestly empty via live `UserRepository.findAllSellers()`, not padded
 * with invented seller accounts.
 *
 * FLAGSHIP PRESERVED DEFECT: the View action link is literally
 * `view-product/{id}` (source line 84) — a copy-paste leftover from the
 * Product module, not a real user-detail route. Reproduced as a link to
 * that exact (nonexistent-for-users) destination, not redirected
 * somewhere sensible like a `view-user` route that doesn't exist in
 * source.
 *
 * No Create or Edit action exists anywhere in source for this module —
 * List only. Not invented here either.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Users List',
};

export default async function AdminUsersListPage() {
  const db = await getDb();
  const repo = new UserRepository(db);
  const users = await repo.findAllSellers();

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css"
      />

      <section className="content-header">
        <h1>Users List</h1>
        <ol className="breadcrumb">
          <li>
            <a href="/admin/home">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Users List</li>
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
                      <th>S.No</th>
                      <th>Name</th>
                      <th>Email Id</th>
                      <th>Mobile No</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, i) => (
                      <tr key={user.legacyId}>
                        <td>{i + 1}</td>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td>{user.mobile}</td>
                        <td>{user.status === 1 ? 'Active' : 'Inactive'}</td>
                        <td>
                          {/* PRESERVED DEFECT: literal view-product link — see file header. */}
                          <a href={`/admin/view-product/${user.legacyId}`}>
                            <i className="fa fa-eye"></i>
                          </a>
                          &nbsp;&nbsp;&nbsp;&nbsp;
                          <a href={`/admin/destroy-user/${user.legacyId}`}>
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
