import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { readAndClearFlash } from '@/lib/auth/flash';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getDb } from '@/lib/mongodb/client';

/**
 * `/admin/add-partner-user` — Partner Panel feature. GENUINELY NEW, no
 * Laravel form to port. Structurally copies `add-admin-user/page.tsx`
 * (same box/box-header/box-body form, CSRF token, flash message) minus the
 * `role` field, since partner accounts have no RBAC role.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Add Partner',
};

export default async function AdminAddPartnerUserPage() {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.PARTNERS_MANAGE);

  const csrfToken = generateCsrfToken();
  const message = await readAndClearFlash('message');

  return (
    <>
      <AdminStylesheets />

      <section className="content-header">
        <h1>Add Partner</h1>
        <ol className="breadcrumb">
          <li>
            <a href="/admin/home">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li>
            <a href="/admin/partner-list">Partners</a>
          </li>
          <li className="active">Add Partner</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <form method="post" action="/admin/save-partner-user">
            <input type="hidden" name="_token" value={csrfToken} />
            <div className="col-md-6">
              <div className="box box-success">
                <div className="box-header with-border">
                  <h3 className="box-title">Partner Info</h3>
                </div>
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="name">Name</label>
                    <input
                      type="text"
                      className="form-control"
                      id="name"
                      name="name"
                      placeholder="Enter Name"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      name="email"
                      placeholder="Enter Email"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="mobile">Mobile</label>
                    <input
                      type="text"
                      className="form-control"
                      id="mobile"
                      name="mobile"
                      placeholder="Enter Mobile Number"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                      type="password"
                      className="form-control"
                      id="password"
                      name="password"
                      required
                      minLength={8}
                    />
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
