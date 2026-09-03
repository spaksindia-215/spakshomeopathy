import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getAllBlogCategories } from '@/lib/demo';

/**
 * `/admin/blog-category-list` — ported from `admin/blog-category-list.blade.php`
 * (152 lines), `AdminController@BlogCategoryList`. Also absent from the
 * sidebar nav (same as the rest of the Blog module) — not reproduced
 * with an added nav link.
 *
 * PRESERVED DEFECTS:
 *   - Image fallback to `assets/img/no-image.png`, gated by a real
 *     `file_exists()` PHP check in source — the demo has no server-side
 *     filesystem check available, so this is approximated by an
 *     image-present truthiness check on `bcatImage` alone (documented
 *     divergence: source could theoretically show the fallback even when
 *     `bcat_image` is non-empty, if the file was deleted from disk — not
 *     reproducible in a static demo with no real uploaded files).
 *   - "Created At" column formats via PHP's `date('d, M Y', strtotime(...))`
 *     — reproduced with an equivalent JS date format.
 *   - Delete link has no confirm() dialog (same as `blog-list`).
 *   - LIVE `.DataTable()` init (same options/dead `#example1` call as
 *     `blog-list`/`product-view`).
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Blog Category List',
};

function formatCreatedAt(date: Date | null): string {
  if (!date) return '';
  const d = new Date(date);
  const day = d.getDate();
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();
  return `${day}, ${month} ${year}`;
}

export default function AdminBlogCategoryListPage() {
  const categories = getAllBlogCategories();

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css"
      />

      <section className="content-header">
        <h1>Blog Category List</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Blog Category List</li>
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
                      <th>S.No</th>
                      <th>Name</th>
                      <th>Image</th>
                      <th>Created At</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat, i) => (
                      <tr key={cat.legacyId}>
                        <td>{i + 1}</td>
                        <td>{cat.bcatName}</td>
                        <td>
                          {cat.bcatImage ? (
                            <img
                              src={`/uploaded_files/blog-categories/${cat.bcatImage}`}
                              height={80}
                              width={80}
                              alt=""
                            />
                          ) : (
                            <img src="/assets/img/no-image.png" height={80} width={80} alt="" />
                          )}
                        </td>
                        <td>{formatCreatedAt(cat.createdAt)}</td>
                        <td>
                          <Link href={`/admin/edit-blog-category/${cat.legacyId}`}>
                            <i className="fa fa-pencil"></i>
                          </Link>
                          &nbsp;&nbsp;&nbsp;&nbsp;
                          <a href={`/admin/destroy-blog-category/${cat.legacyId}`}>
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
