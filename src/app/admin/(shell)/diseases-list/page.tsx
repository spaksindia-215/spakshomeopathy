import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { DiseaseRepository } from '@/lib/diseases/repository';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { readAndClearFlash } from '@/lib/auth/flash';

export const metadata: Metadata = {
  title: 'Admin Panel | Diseases List',
};

/**
 * `/admin/diseases-list` — GENUINELY NEW ADMIN SCREEN, no Laravel
 * equivalent (see `src/lib/diseases/schema.ts`'s header). Same layout
 * convention as `slider-list`.
 */
export default async function AdminDiseasesListPage() {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.DISEASES_VIEW);

  const repo = new DiseaseRepository(db);
  const diseases = await repo.findAllDescending();
  const message = await readAndClearFlash('message');

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css"
      />

      <section className="content-header">
        <h1>Diseases List</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Diseases List</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <div className="col-xs-12">
            <div className="box">
              <div className="box-body">
                <table className="table table-bordered table-hover">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Title</th>
                      <th>Image</th>
                      <th>Booking URL</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diseases.map((disease, i) => (
                      <tr key={disease.legacyId}>
                        <td>{i + 1}</td>
                        <td>{disease.title}</td>
                        <td>
                          <img
                            src={`/uploaded_files/diseases/${disease.image}`}
                            height={80}
                            width={80}
                            alt=""
                          />
                        </td>
                        <td>{disease.bookingUrl}</td>
                        <td>{disease.status === 1 ? 'Active' : 'Inactive'}</td>
                        <td>
                          <Link href={`/admin/edit-disease/${disease.legacyId}`}>
                            <i className="fa fa-pencil btn btn-info btn-sm"></i>
                          </Link>{' '}
                          <a href={`/admin/destroy-disease/${disease.legacyId}`}>
                            <i className="fa fa-trash btn btn-danger btn-sm"></i>
                          </a>
                        </td>
                      </tr>
                    ))}
                    {diseases.length === 0 && (
                      <tr>
                        <td colSpan={6}>No diseases added yet.</td>
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
