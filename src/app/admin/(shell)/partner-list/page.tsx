import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { UserRepository } from '@/lib/mongodb/repositories/userRepository';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/partner-list` — Partner Panel feature. GENUINELY NEW, no Laravel
 * screen to mirror. Lists every `utype===5` (partner) account. Structurally
 * copies `admin-users-list/page.tsx`'s table layout.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Partners',
};

export default async function AdminPartnerListPage() {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.PARTNERS_MANAGE);

  const repo = new UserRepository(db);
  const partners = await repo.findAllPartners();
  const message = await readAndClearFlash('message');

  return (
    <>
      <AdminStylesheets />

      <section className="content-header">
        <h1>Partners</h1>
        <ol className="breadcrumb">
          <li>
            <a href="/admin/home">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Partners</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <div className="col-xs-12">
            <div className="box">
              <div className="box-header">
                <Link href="/admin/add-partner-user" className="btn btn-success btn-sm">
                  <i className="fa fa-plus"></i> Add Partner
                </Link>
              </div>
              <div className="box-body">
                <table className="table table-bordered table-hover">
                  <thead>
                    <tr>
                      <th style={{ width: '10%' }}>S.No</th>
                      <th style={{ width: '25%' }}>Name</th>
                      <th style={{ width: '25%' }}>Email</th>
                      <th style={{ width: '15%' }}>Mobile</th>
                      <th style={{ width: '15%' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partners.map((partner, i) => (
                      <tr key={partner.legacyId}>
                        <td>{i + 1}</td>
                        <td>{partner.name}</td>
                        <td>{partner.email}</td>
                        <td>{partner.mobile ?? '—'}</td>
                        <td>
                          {partner.status === 1 ? (
                            <span className="label label-success">Active</span>
                          ) : (
                            <span className="label label-default">Inactive</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {partners.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center">
                          No partners yet.
                        </td>
                      </tr>
                    )}
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
