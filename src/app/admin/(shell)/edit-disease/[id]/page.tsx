import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { DiseaseRepository } from '@/lib/diseases/repository';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { readAndClearFlash } from '@/lib/auth/flash';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';

export const metadata: Metadata = {
  title: 'Admin Panel | Edit Disease',
};

/**
 * `/admin/edit-disease/[id]` — GENUINELY NEW ADMIN SCREEN, no Laravel
 * equivalent (see `src/lib/diseases/schema.ts`'s header). Same
 * keep-existing-image-unless-a-new-file-is-supplied convention as
 * `edit-slider/[id]`.
 */
export default async function AdminEditDiseasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.DISEASES_EDIT);

  const { id } = await params;
  const legacyId = Number(id);

  const repo = new DiseaseRepository(db);
  const disease = Number.isFinite(legacyId) ? await repo.findByLegacyId(legacyId) : null;

  if (!disease) {
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
        <h1>Edit Disease</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Edit Disease</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <form method="post" action="/admin/update-disease" encType="multipart/form-data">
            <input type="hidden" name="_token" value={csrfToken} />
            <input type="hidden" name="disease_id" value={disease.legacyId} />
            <input type="hidden" name="old_image" value={disease.image} />

            <div className="col-md-6">
              <div className="box box-success">
                <div className="box-header with-border">
                  <h3 className="box-title">Disease Info</h3>
                </div>
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="title">Title</label>
                    <input
                      type="text"
                      name="title"
                      className="form-control"
                      defaultValue={disease.title}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="bookingUrl">Booking URL</label>
                    <input
                      type="text"
                      name="bookingUrl"
                      className="form-control"
                      defaultValue={disease.bookingUrl}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="box box-info">
                <div className="box-header with-border">
                  <h3 className="box-title">Image &amp; Status</h3>
                </div>
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="image">Image (leave blank to keep current)</label>
                    <input type="file" name="image" className="form-control" />
                  </div>

                  <div className="form-group">
                    <label>Current Image</label>
                    <br />
                    <img
                      src={`/uploaded_files/diseases/${disease.image}`}
                      height={80}
                      width={80}
                      alt=""
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="status">Status</label>
                    <select
                      className="form-control"
                      name="status"
                      required
                      defaultValue={disease.status}
                    >
                      <option value="">--Select--</option>
                      <option value="1">Active</option>
                      <option value="0">Inactive</option>
                    </select>
                  </div>

                  <div className="box-footer">
                    <button type="submit" name="submit" className="btn btn-success">
                      Submit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
