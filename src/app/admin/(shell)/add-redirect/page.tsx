import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { readAndClearFlash } from '@/lib/auth/flash';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getDb } from '@/lib/mongodb/client';

/**
 * `/admin/add-redirect` — CR-006 Phase 8. GENUINELY NEW: no Laravel form
 * to port. Fields limited to exactly `redirectDocSchema`'s real columns.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Add Redirect',
};

export default async function AdminAddRedirectPage() {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.REDIRECTS_MANAGE);

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
        <h1>Add Redirect</h1>
        <ol className="breadcrumb">
          <li>
            <a href="/admin/home">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li>
            <a href="/admin/redirects-list">Redirects</a>
          </li>
          <li className="active">Add Redirect</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <form method="post" action="/admin/save-redirect">
            <input type="hidden" name="_token" value={csrfToken} />
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
                      placeholder="/old-page"
                      required
                    />
                    <p className="text-muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                      Must start with &quot;/&quot;, e.g. /old-product-slug
                    </p>
                  </div>

                  <div className="form-group">
                    <label htmlFor="toPath">To Path</label>
                    <input
                      type="text"
                      className="form-control"
                      id="toPath"
                      name="toPath"
                      placeholder="/new-page"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="statusCode">Status Code</label>
                    <select
                      name="statusCode"
                      id="statusCode"
                      className="form-control"
                      defaultValue="301"
                    >
                      <option value="301">301 (Permanent)</option>
                      <option value="302">302 (Temporary)</option>
                    </select>
                  </div>
                </div>

                <div className="box-footer">
                  <button type="submit" className="btn btn-success">
                    Save
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
