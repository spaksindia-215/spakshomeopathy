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
  title: 'Admin Panel | Edit Review',
};

/**
 * `/admin/edit-review/[productId]/[reviewId]` — Review add/edit CRUD
 * feature. GENUINELY NEW ADMIN SCREEN, no Laravel equivalent (see
 * `add-review/[productId]/page.tsx`'s header). Full-field edit
 * (name/email/rating/text/status) — the existing `update-review/.../
 * [status]` route only ever toggled status.
 */
export default async function AdminEditReviewPage({
  params,
}: {
  params: Promise<{ productId: string; reviewId: string }>;
}) {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.PRODUCTS_EDIT);

  const { productId, reviewId } = await params;
  const productLegacyId = Number(productId);
  const reviewLegacyId = Number(reviewId);

  const repo = new ProductRepository(db);
  const product =
    Number.isFinite(productLegacyId) ? await repo.findByLegacyId(productLegacyId) : null;
  const review = product?.reviews.find((r) => r.legacyId === reviewLegacyId) ?? null;

  if (!product || !review) {
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
        <h1>Edit Review</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li>
            <a href="/admin/review-list">Review List</a>
          </li>
          <li className="active">Edit Review</li>
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
              <form method="post" action="/admin/update-review-full">
                <input type="hidden" name="_token" value={csrfToken} />
                <input type="hidden" name="product_id" value={product.legacyId} />
                <input type="hidden" name="review_id" value={review.legacyId} />
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="rName">Reviewer Name</label>
                    <input
                      type="text"
                      name="rName"
                      className="form-control"
                      defaultValue={review.rName ?? ''}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="rEmail">Reviewer Email</label>
                    <input
                      type="email"
                      name="rEmail"
                      className="form-control"
                      defaultValue={review.rEmail ?? ''}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="rRating">Rating (1-5)</label>
                    <select
                      className="form-control"
                      name="rRating"
                      required
                      defaultValue={review.rRating ?? 5}
                    >
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="rReview">Review Text</label>
                    <textarea
                      name="rReview"
                      className="form-control"
                      rows={4}
                      defaultValue={review.rReview ?? ''}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="rStatus">Status</label>
                    <select
                      className="form-control"
                      name="rStatus"
                      required
                      defaultValue={review.rStatus ?? ''}
                    >
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
