import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { ProductRepository } from '@/lib/mongodb/repositories/productRepository';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/review-list` — CR-006 Phase 7. GENUINELY NEW ADMIN SCREEN, NOT
 * A PORT OF A VIEW THAT EXISTED IN NEXT.JS BEFORE: no Next.js equivalent
 * existed until this phase, but it DOES mirror a real, live Laravel admin
 * screen that was simply never ported — `ReviewList()`
 * (`AdminController.php:1295-1301`, `admin.review-list` Blade view).
 *
 * `product_review` is embedded on each `products` document as `reviews`
 * (`schemas/product.ts` — carried over from the M3 migration, unrelated
 * to this phase). Source did `product_review JOIN products` to get one
 * flat row per review with the product name attached; this page performs
 * the equivalent flattening in application code instead of a database
 * join (`ProductRepository.findAll()` + a per-product `.flatMap`), same
 * "don't blindly translate SQL joins into MongoDB" posture used
 * elsewhere in this migration (embedding already did the hard part).
 *
 * Uses `PERMISSIONS.PRODUCTS_VIEW`/`PRODUCTS_EDIT` — reviews have no
 * Laravel table of their own that survived as a separate collection
 * (they are embedded on `products`), so there is no dedicated
 * `reviews.*` permission to reuse or invent; gating on the product
 * permissions they're embedded under is the narrowest fit.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Review List',
};

export default async function AdminReviewListPage() {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.PRODUCTS_VIEW);

  const repo = new ProductRepository(db);
  const products = await repo.findAll();

  const rows = products.flatMap((product) =>
    product.reviews.map((review) => ({
      productLegacyId: product.legacyId,
      productName: product.pName ?? product.pHeading,
      reviewLegacyId: review.legacyId,
      rName: review.rName,
      rReview: review.rReview,
      rStatus: review.rStatus,
    }))
  );

  const message = await readAndClearFlash('message');

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css"
      />

      <section className="content-header">
        <h1>Review List</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Review List</li>
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
                      <th>Product</th>
                      <th>Name</th>
                      <th>Review</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={`${row.productLegacyId}-${row.reviewLegacyId}`}>
                        <td>{i + 1}</td>
                        <td>{row.productName}</td>
                        <td>{row.rName}</td>
                        <td>{row.rReview}</td>
                        <td>
                          {row.rStatus === 1 ? (
                            <a
                              href={`/admin/update-review/${row.productLegacyId}/${row.reviewLegacyId}/0`}
                              className="btn btn-primary btn-xs"
                            >
                              Active
                            </a>
                          ) : (
                            <a
                              href={`/admin/update-review/${row.productLegacyId}/${row.reviewLegacyId}/1`}
                              className="btn btn-primary btn-xs"
                            >
                              Inactive
                            </a>
                          )}
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
$(function () {
  $('#example2').DataTable({
    paging: true,
    lengthChange: false,
    searching: false,
    ordering: true,
    info: true,
    autoWidth: false
  });
});
`,
        }}
      />
    </>
  );
}
