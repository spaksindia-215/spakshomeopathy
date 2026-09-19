import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { RedirectRepository } from '@/lib/redirects/repository';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/redirects-list` — CR-006 Phase 8
 * (`docs/CR-006-PHASE-8-PLAN.md` §2.3). GENUINELY NEW ADMIN SCREEN, NO
 * LARAVEL EQUIVALENT — see `src/lib/redirects/schema.ts`'s header.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Redirects',
};

export default async function AdminRedirectsListPage() {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.REDIRECTS_MANAGE);

  const repo = new RedirectRepository(db);
  const redirects = await repo.findAll();

  const message = await readAndClearFlash('message');

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css"
      />

      <section className="content-header">
        <h1>Redirects</h1>
        <ol className="breadcrumb">
          <li>
            <a href="/admin/home">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Redirects</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <div className="col-xs-12">
            <div className="box">
              <div className="box-header">
                <p style={{ margin: 0, fontSize: 12.5, color: '#888' }}>
                  {redirects.length} redirect(s). Takes effect immediately, but may take up to 60
                  seconds to be picked up by site traffic (in-memory cache).
                </p>
                <div style={{ marginTop: 10 }}>
                  <Link href="/admin/add-redirect" className="btn btn-success btn-sm">
                    <i className="fa fa-plus"></i> Add Redirect
                  </Link>
                </div>
              </div>
              <div className="box-body">
                <table id="example2" className="table table-bordered table-hover">
                  <thead>
                    <tr>
                      <th style={{ width: '8%' }}>S.No</th>
                      <th style={{ width: '30%' }}>From</th>
                      <th style={{ width: '30%' }}>To</th>
                      <th style={{ width: '12%' }}>Status</th>
                      <th style={{ width: '20%' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {redirects.map((r, i) => (
                      <tr key={r.id}>
                        <td>{i + 1}</td>
                        <td>
                          <code>{r.fromPath}</code>
                        </td>
                        <td>
                          <code>{r.toPath}</code>
                        </td>
                        <td>{r.statusCode}</td>
                        <td>
                          <Link href={`/admin/edit-redirect/${r.id}`}>
                            <i className="fa fa-pencil btn btn-info btn-sm"></i>
                          </Link>
                          &nbsp;&nbsp;
                          <a href={`/admin/destroy-redirect/${r.id}`}>
                            <i className="fa fa-trash btn btn-danger btn-sm"></i>
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
