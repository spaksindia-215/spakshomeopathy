import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { RedirectRepository } from '@/lib/redirects/repository';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { readAndClearFlash } from '@/lib/auth/flash';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';

/**
 * `/admin/edit-redirect/[id]` — CR-006 Phase 8. GENUINELY NEW, see
 * `add-redirect/page.tsx`'s header. Same field set as Add.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Edit Redirect',
};

export default async function AdminEditRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.REDIRECTS_MANAGE);

  const { id } = await params;

  const repo = new RedirectRepository(db);
  const redirect = await repo.findById(id);

  if (!redirect) {
    notFound();
  }

  const csrfToken = generateCsrfToken();
  const message = await readAndClearFlash('message');

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/bootstrap/dist/css/bootstrap.min.css"
      />

      <section className="content-header">
        <h1>Edit Redirect</h1>
        <ol className="breadcrumb">
          <li>
            <a href="/admin/home">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li>
            <a href="/admin/redirects-list">Redirects</a>
          </li>
          <li className="active">Edit Redirect</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <form method="post" action="/admin/update-redirect">
            <input type="hidden" name="_token" value={csrfToken} />
            <input type="hidden" name="id" value={redirect.id} />
            <div className="col-md-6">
              <div className="box box-success">
                <div className="box-header with-border">
                  <h3 className="box-title">Redirect Info</h3>
                </div>
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="fromPath">From Path</label>
                    <input
                      type="text"
                      className="form-control"
                      id="fromPath"
                      name="fromPath"
                      defaultValue={redirect.fromPath}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="toPath">To Path</label>
                    <input
                      type="text"
                      className="form-control"
                      id="toPath"
                      name="toPath"
                      defaultValue={redirect.toPath}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="statusCode">Status Code</label>
                    <select
                      name="statusCode"
                      id="statusCode"
                      className="form-control"
                      defaultValue={redirect.statusCode}
                    >
                      <option value="301">301 (Permanent)</option>
                      <option value="302">302 (Temporary)</option>
                    </select>
                  </div>
                </div>

                <div className="box-footer">
                  <button type="submit" className="btn btn-success">
                    Update
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
