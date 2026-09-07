import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { PostRepository } from '@/lib/mongodb/repositories/postRepository';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/post-list` — ported from `admin/post-list.blade.php` (143
 * lines), `AdminController@PostList`.
 *
 * M5-E: switched from `@/lib/demo` to live `spaks_dev` read
 * (`PostRepository.findAllByTitleAscending`, mirroring source's
 * `orderBy('post_title','ASC')` — NOT `id DESC` like every other list
 * this project has built), now that the write path is real. Success
 * flash now rendered (source's `session()->has('message')` block,
 * `post-list.blade.php:56`, was previously unwired). Destroy link now
 * routes to the real `admin/destroy-post/[post_id]/route.ts` — the
 * previous demo-only confirm()/alert() click-intercept script is
 * REMOVED, since the link now performs a genuine action, matching every
 * other now-real destroy link in this project.
 *
 * PAGINATION NOT IMPLEMENTED — DISCLOSED GAP, same class as `categories`:
 * source uses `paginate(20)` (`AdminController.php:770`) against ~414
 * real rows (per `docs/M5-PREFLIGHT-AUDIT.md`) — production pagination
 * boundaries are crossed many times over. This page renders the FULL
 * unpaginated list. Flagged explicitly in
 * `docs/GATE-REPORT-M5-E-POSTS.md`.
 *
 * PRESERVED DEFECTS, verified directly this session:
 *   - Status column: dead `href="#"` badges (Active/"Deativate", typo
 *     preserved) — same pattern as `product-list`.
 *   - `$sno++` sits correctly INSIDE the `@foreach` loop — S.No
 *     increments correctly per row (this page does NOT share the
 *     `enquires-list` off-by-scope bug, despite superficial similarity).
 *   - DataTables CSS/JS is loaded but never initialized (`.DataTable()`
 *     is never called in source) — reproduced as inert includes.
 *   - Double-`class` attribute bug on both edit and delete `<i>` icons
 *     (same unavoidable JSX simplification as `product-list`).
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Post List',
};

export default async function AdminPostListPage() {
  const db = await getDb();
  const repo = new PostRepository(db);
  const posts = await repo.findAllByTitleAscending();
  const message = await readAndClearFlash('message');

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css"
      />

      <section className="content-header">
        <h1>Post List</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Post List</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <div className="col-xs-12">
            <div className="box">
              <div className="box-body">
                <table id="example2" className="table table-bordered table-hover">
                  <thead>
                    <tr>
                      <th style={{ width: '10%' }}>S.No</th>
                      <th style={{ width: '25%' }}>Title</th>
                      <th style={{ width: '10%' }}>Image</th>
                      <th style={{ width: '20%' }}>Status</th>
                      <th style={{ width: '10%' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((post, i) => (
                      <tr key={post.legacyId}>
                        <td>{i + 1}</td>
                        <td>{post.postTitle}</td>
                        <td>
                          <img
                            src={`/uploaded_files/post/${post.postImage ?? ''}`}
                            style={{ height: '100px', width: '100px' }}
                            alt=""
                          />
                        </td>
                        <td>
                          {post.postStatus === 1 && (
                            <a href="#" className="btn btn-success">
                              Active
                            </a>
                          )}
                          {post.postStatus === 0 && (
                            <a href="#" className="btn btn-danger">
                              Deativate
                            </a>
                          )}
                        </td>
                        <td>
                          <Link href={`/admin/edit-post/${post.legacyId}`}>
                            <i className="fa fa-pencil btn btn-info btn-sm"></i>
                          </Link>
                          &nbsp;&nbsp;&nbsp;&nbsp;
                          <a href={`/admin/destroy-post/${post.legacyId}`}>
                            <i className="fa fa-trash btn btn-danger btn-sm"></i>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <center>
                  <div></div>
                </center>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
