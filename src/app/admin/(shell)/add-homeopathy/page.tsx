import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { readAndClearFlash } from '@/lib/auth/flash';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getDb } from '@/lib/mongodb/client';

/**
 * `/admin/add-homeopathy` — CR-006 Phase 4. GENUINELY NEW: no Laravel
 * form to port. Fields are limited to exactly `homeopathyMaster`'s real
 * 6 columns (`name`, `image`, `slug`, `status`, plus the system-managed
 * `legacyId`/`createdAt`) — no symptoms/causes/FAQ/treatment fields are
 * added here. Those belong to a future, separately-authorized schema
 * decision (Phase 5's medicine-disease design), not invented ahead of it.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Add Homeopathy Entry',
};

export default async function AdminAddHomeopathyPage() {
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
        <h1>Add Homeopathy Entry</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Add Homeopathy Entry</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <form method="post" action="/admin/save-homeopathy" encType="multipart/form-data">
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
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="image">Image</label>
                    <input type="file" className="form-control" id="image" name="image" />
                  </div>

                  <div className="form-group">
                    <label htmlFor="status">Status</label>
                    <select name="status" id="status" className="form-control" defaultValue="1">
                      <option value="1">Active</option>
                      <option value="0">Inactive</option>
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
