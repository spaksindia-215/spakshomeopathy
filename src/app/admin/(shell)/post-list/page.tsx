import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getAllPosts } from '@/lib/demo';

/**
 * `/admin/post-list` — ported from `admin/post-list.blade.php` (143
 * lines), `AdminController@PostList`.
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

export default function AdminPostListPage() {
  const posts = getAllPosts();

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
                          <a
                            href={`/admin/destroy-post/${post.legacyId}`}
                            className="demo-destroy-link"
                          >
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

      {/* DEMO ONLY — see product-list's identical note. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
document.querySelectorAll('.demo-destroy-link').forEach(function (el) {
  el.addEventListener('click', function (e) {
    e.preventDefault();
    if (window.confirm('Are you sure you want to delete?')) {
      window.alert('Demo only — no real data was deleted.');
    }
  });
});
`,
        }}
      />
    </>
  );
}
