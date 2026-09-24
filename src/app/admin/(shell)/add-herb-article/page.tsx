import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { readAndClearFlash } from '@/lib/auth/flash';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { getDb } from '@/lib/mongodb/client';
import { PERMISSIONS } from '@/lib/auth/permissions';

export const metadata: Metadata = {
  title: 'Admin Panel | Add Herb Article',
};

/**
 * `/admin/add-herb-article` — GENUINELY NEW ADMIN SCREEN, no Laravel
 * equivalent (see `src/lib/herbArticles/schema.ts`'s header). Metadata
 * only (title/slug/excerpt/readTime/category) — the detail page's body
 * placeholder is unchanged by this feature, see that schema's header.
 */
export default async function AdminAddHerbArticlePage() {
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
        <h1>Add Herb Article</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Add Herb Article</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <div className="col-md-8">
            <div className="box box-success">
              <div className="box-header with-border">
                <h3 className="box-title">Article Info</h3>
              </div>
              <form method="post" action="/admin/save-herb-article">
                <input type="hidden" name="_token" value={csrfToken} />
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="title">Title</label>
                    <input type="text" name="title" className="form-control" required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="slug">
                      Slug (used in the URL — leave blank to generate from the title)
                    </label>
                    <input
                      type="text"
                      name="slug"
                      className="form-control"
                      placeholder="e.g. understanding-herb-forms"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="category">Category</label>
                    <input
                      type="text"
                      name="category"
                      className="form-control"
                      placeholder="e.g. Herbal Knowledge"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="readTime">Read Time</label>
                    <input
                      type="text"
                      name="readTime"
                      className="form-control"
                      placeholder="e.g. 4 min read"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="excerpt">Excerpt</label>
                    <textarea name="excerpt" className="form-control" rows={3} />
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
