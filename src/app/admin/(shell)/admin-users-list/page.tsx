import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { UserRepository } from '@/lib/mongodb/repositories/userRepository';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS, ROLES } from '@/lib/auth/permissions';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/admin-users-list` — CR-006 Phase 9
 * (`docs/CR-006-PHASE-9-PLAN.md` §2.4). GENUINELY NEW: no admin-user
 * management screen exists in Laravel — the one real admin account was
 * never manageable through any UI, only provisioned directly in the
 * database. Lists every `utype===1` account; role is shown as "Super
 * Admin (implicit)" for the pre-Phase-9 account(s) with no `role` field
 * set, matching `resolveRole()`'s own fallback.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Admin Users',
};

export default async function AdminUsersListPage() {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.USERS_MANAGE);

  const repo = new UserRepository(db);
  const admins = await repo.findAllAdmins();
  const message = await readAndClearFlash('message');

  return (
    <>
      <AdminStylesheets />

      <section className="content-header">
        <h1>Admin Users</h1>
        <ol className="breadcrumb">
          <li>
            <a href="/admin/home">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Admin Users</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <div className="col-xs-12">
            <div className="box">
              <div className="box-header">
                <Link href="/admin/add-admin-user" className="btn btn-success btn-sm">
                  <i className="fa fa-plus"></i> Add Admin User
                </Link>
              </div>
              <div className="box-body">
                <table className="table table-bordered table-hover">
                  <thead>
                    <tr>
                      <th style={{ width: '10%' }}>S.No</th>
                      <th style={{ width: '30%' }}>Name</th>
                      <th style={{ width: '30%' }}>Email</th>
                      <th style={{ width: '20%' }}>Role</th>
                      <th style={{ width: '10%' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((admin, i) => (
                      <tr key={admin.legacyId}>
                        <td>{i + 1}</td>
                        <td>{admin.name}</td>
                        <td>{admin.email}</td>
                        <td>
                          {admin.role ? (
                            ROLES[admin.role as keyof typeof ROLES]
                          ) : (
                            <em className="text-muted">Super Admin (implicit)</em>
                          )}
                        </td>
                        <td>
                          <Link href={`/admin/edit-admin-user/${admin.legacyId}`}>
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
    </>
  );
}
