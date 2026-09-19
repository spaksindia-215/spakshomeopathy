import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { HomeopathyMasterRepository } from '@/lib/mongodb/repositories/homeopathyMasterRepository';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { readAndClearFlash } from '@/lib/auth/flash';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';

/**
 * `/admin/edit-homeopathy/[id]` — CR-006 Phase 4. GENUINELY NEW, see
 * `add-homeopathy/page.tsx`'s header for the full disclosure. Same
 * field set as Add.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Edit Homeopathy Entry',
};

export default async function AdminEditHomeopathyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.DISEASES_EDIT);

  const { id } = await params;
  const legacyId = Number(id);

  const repo = new HomeopathyMasterRepository(db);
  const entry = Number.isFinite(legacyId) ? await repo.findByLegacyId(legacyId) : null;

  if (!entry) {
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
        <h1>Edit Homeopathy Entry</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Edit Homeopathy Entry</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <form method="post" action="/admin/update-homeopathy" encType="multipart/form-data">
            <input type="hidden" name="_token" value={csrfToken} />
            <div className="col-md-6">
              <div className="box box-success">
                <div className="box-header with-border">
                  <h3 className="box-title">Homeopathy Entry Info</h3>
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
                      defaultValue={entry.name ?? ''}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="old_image">Old Image</label>
                    <br />
                    <img
                      src={`/uploaded_files/homeopathy/${entry.image ?? ''}`}
                      style={{ height: '100px', width: '100px' }}
                      alt=""
                    />
                    <input type="hidden" name="old_image" value={entry.image ?? ''} />
                  </div>

                  <div className="form-group">
                    <label htmlFor="image">Image</label>
                    <input type="file" className="form-control" id="image" name="image" />
                  </div>

                  <div className="form-group">
                    <label htmlFor="status">Status</label>
                    <select
                      name="status"
                      id="status"
                      className="form-control"
                      defaultValue={entry.status ?? 1}
                    >
                      <option value="1">Active</option>
                      <option value="0">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="box-footer">
                  <input type="hidden" name="id" value={entry.legacyId} />
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
