import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { readAndClearFlash } from '@/lib/auth/flash';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { getDb } from '@/lib/mongodb/client';
import { PERMISSIONS } from '@/lib/auth/permissions';

export const metadata: Metadata = {
  title: 'Admin Panel | Add Disease',
};

/**
 * `/admin/add-disease` — GENUINELY NEW ADMIN SCREEN, no Laravel
 * equivalent (see `src/lib/diseases/schema.ts`'s header). Same layout
 * convention as `add-slider` (title/image/status form), since this is
 * the closest existing precedent for "small entity, one uploaded image,
 * an active/inactive toggle".
 */
export default async function AdminAddDiseasePage() {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.DISEASES_CREATE);

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
        <h1>Add Disease</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Add Disease</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <form method="post" action="/admin/save-disease" encType="multipart/form-data">
            <input type="hidden" name="_token" value={csrfToken} />
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
                      placeholder="e.g. Hair Dandruff"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="bookingUrl">Booking URL</label>
                    <input
                      type="text"
                      name="bookingUrl"
                      className="form-control"
                      placeholder="Where the &quot;Book Medicine&quot; button links to"
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
                    <label htmlFor="image">Image</label>
                    <input type="file" name="image" className="form-control" required />
                  </div>

                  <div className="form-group">
                    <label htmlFor="status">Status</label>
                    <select className="form-control" name="status" required defaultValue="">
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
