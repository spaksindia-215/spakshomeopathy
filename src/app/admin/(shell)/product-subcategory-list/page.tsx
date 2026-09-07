import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { ProductCategoryRepository } from '@/lib/mongodb/repositories/categoryRepository';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/product-subcategory-list` — ported from
 * `admin/product-subcategory-list.blade.php`,
 * `AdminController@ProductSubCategoryList` — `where('cat_level','=','2')
 * ->orderBy('id','desc')`.
 *
 * ★ GENUINE, PREVIOUSLY-UNDOCUMENTED DEAD LINK, VERIFIED THIS SLICE:
 * source's edit link points to `edit-product-subcat/{id}` — a URL with
 * NO route registration anywhere in `routes/admin.php` (confirmed by
 * full-file grep). Reproduced as a plain, non-functional `<a>` (matches
 * source's own real behavior: clicking it 404s on real Laravel, since no
 * route matches). NOT built as a working edit page — there is nothing to
 * build; source itself has no destination.
 *
 * Delete link IS `confirm()`-wrapped and points to the SAME shared
 * `destroy-product-category/{id}` route as the top-level list (verified
 * directly — NOT a level-specific destroy route) — this one genuinely
 * works, reusing the same `confirm-destroy-link` intercept pattern.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Product Sub Category List',
};

const SUBCATEGORY_LEVEL = 2;

export default async function AdminProductSubcategoryListPage() {
  const db = await getDb();
  const repo = new ProductCategoryRepository(db);
  const categories = await repo.findByLevelDescending(SUBCATEGORY_LEVEL);
  const message = await readAndClearFlash('message');

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css"
      />

      <section className="content-header">
        <h1>Product Sub Category List</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Product Sub Category List</li>
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
                          {/* PRESERVED DEAD LINK — see file header. No
                              `edit-product-subcat` route exists in
                              source; this href correctly leads nowhere. */}
                          <a href={`/admin/edit-product-subcat/${cat.legacyId}`}>
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
