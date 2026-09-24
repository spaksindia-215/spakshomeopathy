import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { readAndClearFlash } from '@/lib/auth/flash';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { getDb } from '@/lib/mongodb/client';
import { PERMISSIONS } from '@/lib/auth/permissions';

export const metadata: Metadata = {
  title: 'Admin Panel | Add Video',
};

/**
 * `/admin/add-video` — GENUINELY NEW ADMIN SCREEN, no Laravel equivalent
 * (see `src/lib/videos/schema.ts`'s header). For `/video` (singular) only
 * — NOT `/videos` (plural), which stays the contract-governed broken page
 * it always was, untouched by this feature.
 */
export default async function AdminAddVideoPage() {
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
        <h1>Add Video</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Add Video</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <div className="col-md-8">
            <div className="box box-success">
              <div className="box-header with-border">
                <h3 className="box-title">Video Info</h3>
              </div>
              <form method="post" action="/admin/save-video">
                <input type="hidden" name="_token" value={csrfToken} />
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="title">Title</label>
                    <input
                      type="text"
                      name="title"
                      className="form-control"
                      placeholder="Video title, shown as the embed's caption"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="youtubeUrl">YouTube URL or Video ID</label>
                    <input
                      type="text"
                      name="youtubeUrl"
                      className="form-control"
                      placeholder="https://www.youtube.com/watch?v=... or the 11-character video ID"
                      required
                    />
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
