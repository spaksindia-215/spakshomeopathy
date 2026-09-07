import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { ProductCategoryRepository } from '@/lib/mongodb/repositories/categoryRepository';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/other-category-list` — ported from
 * `admin/other-category-list.blade.php`,
 * `AdminController@OtherCategoryList` — `where('cat_level','=','3')
 * ->orderBy('id','desc')`.
 *
 * PRESERVED: edit link is a plain, dead `href="#"` in source (confirmed
 * directly — "other" categories have no edit page at all, unlike
 * top-level's broken-but-present one). Reproduced verbatim, not linked
 * anywhere real.
 *
 * Delete link IS `confirm()`-wrapped and points to the SAME shared
 * `destroy-product-category/{id}` route as the other two lists.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Other Category List',
};

const OTHER_LEVEL = 3;

export default async function AdminOtherCategoryListPage() {
  const db = await getDb();
  const repo = new ProductCategoryRepository(db);
  const categories = await repo.findByLevelDescending(OTHER_LEVEL);
  const message = await readAndClearFlash('message');

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css"
      />

      <section className="content-header">
        <h1>Other Category List</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Other Category List</li>
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
                      <th>Name</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat, i) => (
                      <tr key={cat.legacyId}>
                        <td>{i + 1}</td>
                        <td>{cat.catName}</td>
                        <td>{cat.catStatus === 1 ? 'active' : 'Inactive'}</td>
                        <td>
                          {/* PRESERVED DEAD LINK — plain href="#" in
                              source, no edit page exists for this level. */}
                          <a href="#">
                            <i className="fa fa-pencil"></i>
                          </a>
                          &nbsp;&nbsp;&nbsp;&nbsp;
                          <a
                            href={`/admin/destroy-product-category/${cat.legacyId}`}
                            className="confirm-destroy-link"
                          >
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

      <script
        dangerouslySetInnerHTML={{
          __html: `
document.querySelectorAll('.confirm-destroy-link').forEach(function (el) {
  el.addEventListener('click', function (e) {
    if (!window.confirm('Are you sure you want to delete?')) {
      e.preventDefault();
    }
  });
});
`,
        }}
      />
    </>
  );
}
