import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { ProductCategoryRepository } from '@/lib/mongodb/repositories/categoryRepository';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/product-category-list` — ported from
 * `admin/product-category-list.blade.php`, `AdminController@ProductCategoryList`.
 *
 * M5-E: live `spaks_dev` read (`ProductCategoryRepository.findAllDescending`
 * — NO `catLevel` filter, confirmed directly against source; this list
 * technically shows every row in `product_category` regardless of level,
 * though in practice it is the top-level-categories page). Success flash
 * wired (source's `session()->has('message')` block was previously
 * unwired, but this page did not exist before this slice at all — first
 * wiring, not a re-wiring). Delete link IS `confirm()`-wrapped in source
 * (`onclick="return confirm(...)"`) — one of the few delete links in this
 * project with a real dialog, and unlike `product-list`'s identical-
 * looking dialog, THIS delete route is genuinely real (built this
 * slice) — so the intercept script below navigates for real on
 * confirmation, it does not fake it with a "demo only" alert. Wired via a
 * plain `<script>` (not a React `onClick`, which cannot be passed from a
 * Server Component to a plain DOM element) — same mechanical constraint
 * already documented in `product-list/page.tsx`'s own header.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Product Category List',
};

export default async function AdminProductCategoryListPage() {
  const db = await getDb();
  const repo = new ProductCategoryRepository(db);
  const categories = await repo.findAllDescending();
  const message = await readAndClearFlash('message');

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css"
      />

      <section className="content-header">
        <h1>Product Category List</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Product Category List</li>
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
                          <Link href={`/admin/edit-product-category/${cat.legacyId}`}>
                            <i className="fa fa-pencil"></i>
                          </Link>
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

      {/* Real confirm() dialog wired via a plain script (Server Component
          constraint — see file header). Unlike product-list's demo
          intercept, this route IS real: confirming genuinely navigates
          to the destroy link; cancelling does nothing, matching source's
          `onclick="return confirm(...)"` exactly. */}
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
