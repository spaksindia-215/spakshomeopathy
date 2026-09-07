import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { BlogRepository } from '@/lib/mongodb/repositories/blogRepository';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/blog-list` — ported from `admin/blog-list.blade.php` (146
 * lines), `AdminController@BlogList`. Blog module is entirely absent
 * from the sidebar nav (confirmed, `AdminSidebar.tsx` has no Blog entry)
 * — a real live-but-orphaned module, not reproduced with an added nav
 * link.
 *
 * M5-E: switched from `@/lib/demo` to live `spaks_dev` read
 * (`BlogRepository.findAllDescending`), now that the write path is real —
 * avoids the half-migrated trap. Success flash now rendered (source has
 * a `session()->has('message')` block, `blog-list.blade.php:56`,
 * previously unwired). No pagination in source for this list
 * (`AdminController::BlogList` uses plain `orderBy('id','desc')->get()`,
 * no `paginate()` — confirmed directly this slice, unlike `CategorytList`'s
 * `paginate(20)`), so there is no pagination gap to disclose here.
 *
 * PRESERVED DEFECTS, verified directly this session:
 *   - Status column prints raw PHP-ternary strings, NOT badges: lowercase
 *     `"active"` when status==1, capitalized `"Inactive"` when status==0
 *     — two different casings, no `<a>`/badge styling at all. Reproduced
 *     as plain text with the exact same casing.
 *   - Image falls back to `assets/img/no-image.png` (a PUBLIC-site asset
 *     path, not an admin-assets one — confirmed exactly as written in
 *     source) when `blog_image` is empty — the only List page in this
 *     module set with an explicit image fallback.
 *   - Delete link has NO `confirm()` dialog (unlike `product-list`/
 *     `post-list`'s delete links) — a genuinely plain, unconfirmed link
 *     in source. Reproduced as inert (demo has no backend either way),
 *     but without adding a confirm dialog that source doesn't have.
 *   - LIVE `.DataTable()` init on `#example2` (same options as
 *     `product-view`/`blog-category-list`), plus the same dead
 *     `$('#example1').DataTable()` orphaned call (no `#example1` element
 *     exists here either).
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Blog List',
};

export default async function AdminBlogListPage() {
  const db = await getDb();
  const repo = new BlogRepository(db);
  const blogs = await repo.findAllDescending();
  const message = await readAndClearFlash('message');

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css"
      />

      <section className="content-header">
        <h1>Blog List</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Blog List</li>
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
                      <th>S.No</th>
                      <th>Title</th>
                      <th>Image</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blogs.map((blog, i) => (
                      <tr key={blog.legacyId}>
                        <td>{i + 1}</td>
                        <td>{blog.blogTitle}</td>
                        <td>
                          {blog.blogImage ? (
                            <img
                              src={`/uploaded_files/blogs/${blog.blogImage}`}
                              height={80}
                              width={80}
                              alt=""
                            />
                          ) : (
                            <img src="/assets/img/no-image.png" height={80} width={80} alt="" />
                          )}
                        </td>
                        <td>{blog.blogStatus === 1 ? 'active' : 'Inactive'}</td>
                        <td>
                          <Link href={`/admin/edit-blog/${blog.legacyId}`}>
                            <i className="fa fa-pencil"></i>
                          </Link>
                          &nbsp;&nbsp;&nbsp;&nbsp;
                          <a href={`/admin/destroy-blog/${blog.legacyId}`}>
                            <i className="fa fa-trash"></i>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      <script src="/admin-assets/bower_components/datatables.net/js/jquery.dataTables.min.js"></script>
      <script src="/admin-assets/bower_components/datatables.net-bs/js/dataTables.bootstrap.min.js"></script>
      {/* PRESERVED DEFECT: #example1 does not exist on this page — a real orphaned call in source. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
$(function () {
$('#example1').DataTable()
$('#example2').DataTable({
'paging'      : true,
'lengthChange': false,
'searching'   : false,
'ordering'    : true,
'info'        : true,
'autoWidth'   : false
})
})
`,
        }}
      />
    </>
  );
}
