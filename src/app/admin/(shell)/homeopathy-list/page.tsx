import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { HomeopathyMasterRepository } from '@/lib/mongodb/repositories/homeopathyMasterRepository';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/homeopathy-list` — CR-006 Phase 4.
 *
 * GENUINELY NEW ADMIN SCREEN, NOT A PORT: `tbl_homeopathy` has no admin
 * list/add/edit screen anywhere in Laravel — see
 * `homeopathyMasterRepository.ts`'s header for the full citation. This
 * page, `add-homeopathy`, and `edit-homeopathy/[id]` exist only in this
 * Next.js application; there is no Blade view they mirror.
 *
 * NOT THE SAME MODULE AS `cat-list`: `cat-list` manages the `categories`
 * collection (disease `type='N'` AND herb `type='H'` rows together,
 * already complete). This page manages the SEPARATE `homeopathyMaster`
 * collection (was `tbl_homeopathy`) — a flat, 150-row list currently used
 * only as a blog-post tagging dropdown. Do not merge or confuse the two.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Homeopathy List',
};

export default async function AdminHomeopathyListPage() {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.DISEASES_VIEW);

  const repo = new HomeopathyMasterRepository(db);
  const entries = await repo.findAllDescending();
  const message = await readAndClearFlash('message');

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css"
      />

      <section className="content-header">
        <h1>Homeopathy List</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Homeopathy List</li>
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
                      <th style={{ width: '10%' }}>S.No</th>
                      <th style={{ width: '30%' }}>Name</th>
                      <th style={{ width: '15%' }}>Image</th>
                      <th style={{ width: '20%' }}>Status</th>
                      <th style={{ width: '25%' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, i) => (
                      <tr key={entry.legacyId}>
                        <td>{i + 1}</td>
                        <td>{entry.name}</td>
                        <td>
                          <img
                            src={`/uploaded_files/homeopathy/${entry.image ?? ''}`}
                            style={{ height: '100px', width: '100px' }}
                            alt=""
                          />
                        </td>
                        <td>
                          {entry.status === 1 && <span className="btn btn-success">Active</span>}
                          {entry.status !== 1 && <span className="btn btn-danger">Inactive</span>}
                        </td>
                        <td>
                          <Link href={`/admin/edit-homeopathy/${entry.legacyId}`}>
                            <i className="fa fa-pencil btn btn-info btn-sm"></i>
                          </Link>
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
