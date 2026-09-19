import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { UserRepository } from '@/lib/mongodb/repositories/userRepository';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { readAndClearFlash } from '@/lib/auth/flash';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS, ROLES } from '@/lib/auth/permissions';

/**
 * `/admin/edit-admin-user/[id]` — CR-006 Phase 9. Role assignment only —
 * this screen does not edit name/email/password (an admin user's own
 * profile/password change goes through the existing buyer-shared
 * `profileService` flow if ever wired for admins; out of this phase's
 * narrow scope, per the plan's §4 "create + role-assign only").
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Edit Admin User',
};

export default async function AdminEditAdminUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.ROLES_MANAGE);

  const { id } = await params;
  const legacyId = Number(id);

  const repo = new UserRepository(db);
  const admin = Number.isFinite(legacyId) ? await repo.findByLegacyId(legacyId) : null;

  if (!admin || admin.utype !== 1) {
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
        <h1>Edit Admin User</h1>
        <ol className="breadcrumb">
          <li>
            <a href="/admin/home">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li>
            <a href="/admin/admin-users-list">Admin Users</a>
          </li>
          <li className="active">Edit Admin User</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <form method="post" action="/admin/update-admin-user-role">
            <input type="hidden" name="_token" value={csrfToken} />
            <input type="hidden" name="id" value={admin.legacyId} />
            <div className="col-md-6">
              <div className="box box-success">
                <div className="box-header with-border">
                  <h3 className="box-title">{admin.name}</h3>
                </div>
                <div className="box-body">
                  <p className="text-muted">{admin.email}</p>
                  <div className="form-group">
                    <label htmlFor="role">Role</label>
                    <select
                      name="role"
                      id="role"
                      className="form-control"
                      defaultValue={admin.role ?? ROLES.SUPER_ADMIN}
                    >
                      {Object.values(ROLES).map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
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
