import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { ProductRepository } from '@/lib/mongodb/repositories/productRepository';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { readAndClearFlash } from '@/lib/auth/flash';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';

export const metadata: Metadata = {
  title: 'Admin Panel | Add Review',
};

/**
 * `/admin/add-review/[productId]` — Review add/edit CRUD feature. GENUINELY
 * NEW ADMIN SCREEN: `review-list` (CR-006 Phase 7) only ported the
 * existing `ReviewUpdate` status-toggle action — there was no Laravel
 * `AddReview`/manual-review-creation admin screen to port, since reviews
 * were always submitted by storefront customers in source, never
 * authored by an admin. This lets an admin manually add a review to a
 * product (reviews are currently 0 rows in every migrated product — see
 * `schemas/product.ts`'s header — so this is the only way to populate any
 * for a product until real customer review submission exists).
 *
 * Uses `PERMISSIONS.PRODUCTS_EDIT`, same permission `review-list` gates
 * status toggles under (see that page's header for why reviews reuse the
 * product permission rather than a dedicated `reviews.*` one).
 */
export default async function AdminAddReviewPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.PRODUCTS_EDIT);

  const { productId } = await params;
  const productLegacyId = Number(productId);

  const repo = new ProductRepository(db);
  const product = Number.isFinite(productLegacyId)
    ? await repo.findByLegacyId(productLegacyId)
    : null;

  if (!product) {
    notFound();
  }

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
        <h1>Add Review</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li>
            <a href="/admin/review-list">Review List</a>
          </li>
          <li className="active">Add Review</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <div className="col-md-8">
            <div className="box box-success">
              <div className="box-header with-border">
                <h3 className="box-title">
                  Review for: {product.pName ?? product.pHeading}
                </h3>
              </div>
              <form method="post" action="/admin/save-review">
                <input type="hidden" name="_token" value={csrfToken} />
                <input type="hidden" name="product_id" value={product.legacyId} />
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="rName">Reviewer Name</label>
                    <input type="text" name="rName" className="form-control" required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="rEmail">Reviewer Email</label>
                    <input type="email" name="rEmail" className="form-control" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="rRating">Rating (1-5)</label>
                    <select className="form-control" name="rRating" required defaultValue="5">
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="rReview">Review Text</label>
                    <textarea name="rReview" className="form-control" rows={4} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="rStatus">Status</label>
                    <select className="form-control" name="rStatus" required defaultValue="">
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
