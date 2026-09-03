import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getAllProducts } from '@/lib/demo';

/**
 * `/admin/product-list` — ported from `admin/product-list.blade.php`
 * (147 lines), `AdminController@ProductList`.
 *
 * Reuses the PUBLIC demo product data (`@/lib/demo`'s `getAllProducts`)
 * — same real, curated 125 rows the public site's product pages show,
 * not a separate admin fixture (both surfaces read the same underlying
 * `products` collection).
 *
 * PRESERVED DEFECTS, verified directly this session:
 *   - Status column: `href="#"` dead badges (Active/"Deativate", typo
 *     preserved) — NOT a working toggle on this page (contrast with
 *     `cat-list`, whose Status column IS a live toggle).
 *   - DataTables CSS/JS is loaded but `.DataTable()` is never called in
 *     source — reproduced as inert `<link>`/`<script>` tags with no init
 *     script.
 *   - Source's double-`class` attribute on the edit/delete `<i>` icons
 *     (`class="fa fa-pencil" class="btn btn-info btn-sm"`) cannot be
 *     literally reproduced in JSX (only one `className` prop is
 *     possible) — the one unavoidable simplification for this defect;
 *     documented rather than silently dropped.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Product List',
};

export default function AdminProductListPage() {
  const products = getAllProducts();

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css"
      />

      <section className="content-header">
        <h1>Product List</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Product List</li>
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
                      <th style={{ width: '10%' }}>Price</th>
                      <th style={{ width: '10%' }}>Quantity</th>
                      <th style={{ width: '20%' }}>Status</th>
                      <th style={{ width: '10%' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product, i) => (
                      <tr key={product.legacyId}>
                        <td>{i + 1}</td>
                        <td>{product.pName}</td>
                        <td>
                          <img
                            src={`/uploaded_files/products/${product.pBestimg ?? ''}`}
                            style={{ height: '100px', width: '100px' }}
                            alt=""
                          />
                        </td>
                        <td>₹{product.pPrice}</td>
                        <td>{product.pQuantity}</td>
                        <td>
                          {product.pStatus === 1 && (
                            <a href="#" className="btn btn-success">
                              Active
                            </a>
                          )}
                          {product.pStatus === 0 && (
                            <a href="#" className="btn btn-danger">
                              Deativate
                            </a>
                          )}
                        </td>
                        <td>
                          <Link href={`/admin/edit-product/${product.legacyId}`}>
                            <i className="fa fa-pencil btn btn-info btn-sm"></i>
                          </Link>
                          &nbsp;&nbsp;&nbsp;&nbsp;
                          <a
                            href={`/admin/destroy-product/${product.legacyId}`}
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
                  <div>
                    {/* Pagination: demo dataset is one page, no links() equivalent needed */}
                  </div>
                </center>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DEMO ONLY — intercepts the destroy links' confirm()/navigation so
          nothing actually deletes or 404s. Matches source's own
          `onclick="return confirm(...)"` dialog, wired via a plain script
          (not a React onClick, which cannot be passed from a Server
          Component) — same convention as `product-details/[slug]`. */}
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
