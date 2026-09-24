import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { readAndClearFlash } from '@/lib/auth/flash';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { getDb } from '@/lib/mongodb/client';
import { PERMISSIONS } from '@/lib/auth/permissions';

export const metadata: Metadata = {
  title: 'Admin Panel | Add Testimonial',
};

/**
 * `/admin/add-testimonial` — GENUINELY NEW ADMIN SCREEN, no Laravel
 * equivalent (see `src/lib/testimonials/schema.ts`'s header). One shared
 * pool feeding both the Herbs and Homeopathy storefronts — `sections`
 * checkboxes mark which one(s) a testimonial appears on.
 */
export default async function AdminAddTestimonialPage() {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.CONTENT_CREATE);

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
        <h1>Add Testimonial</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Add Testimonial</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <div className="col-md-8">
            <div className="box box-success">
              <div className="box-header with-border">
                <h3 className="box-title">Testimonial Info</h3>
              </div>
              <form method="post" action="/admin/save-testimonial">
                <input type="hidden" name="_token" value={csrfToken} />
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="name">Customer Name</label>
                    <input type="text" name="name" className="form-control" required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="location">Location</label>
                    <input type="text" name="location" className="form-control" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="rating">Rating (1-5)</label>
                    <select className="form-control" name="rating" required defaultValue="5">
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="quote">Quote</label>
                    <textarea name="quote" className="form-control" rows={4} required />
                  </div>
                  <div className="form-group">
                    <label>Show On</label>
                    <div className="checkbox">
                      <label>
                        <input type="checkbox" name="sections" value="herbs" defaultChecked /> Herbs
                        Store
                      </label>
                    </div>
                    <div className="checkbox">
                      <label>
                        <input type="checkbox" name="sections" value="homeopathy" /> Homeopathy Store
                      </label>
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="status">Status</label>
                    <select className="form-control" name="status" required defaultValue="">
                      <option value="">--Select--</option>
                      <option value="1">Active</option>
                      <option value="0">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="box-footer">
                  <button type="submit" name="submit" className="btn btn-success">
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
