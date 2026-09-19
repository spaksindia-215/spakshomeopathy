/**
 * `GET /admin/update-review/{productId}/{reviewId}/{status}` — mirrors
 * `routes/admin.php:118`
 * (`Route::get('update-review/{id}/{status}','AdminController@ReviewUpdate')`).
 *
 * SOURCE (`AdminController.php:1303-1308`):
 *
 *   public function ReviewUpdate($id,$status) {
 *     $data=array('r_status'=>$status);
 *     $updtRvw=DB::table('product_review')->where('id',$id)->update($data);
 *     return redirect()->back()->with('message', 'Review status updated successfully.');
 *   }
 *
 * `product_review.id` is globally unique in source (a single flat
 * table), so Laravel's `$id` alone is enough to target one row. Here,
 * `product_review` is embedded PER-PRODUCT as `reviews` on each
 * `products` document (`schemas/product.ts`, predates this phase) — a
 * review's `legacyId` is only unique WITHIN its own product's array, not
 * globally, so this route additionally takes `productId` (the owning
 * product's `legacyId`) to disambiguate, unlike the single-`{id}`
 * source route. This is the one necessary shape difference the
 * embedding forces; the update semantics (`r_status` set to `status`,
 * "updated successfully" flash, redirect back) are otherwise identical.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { setFlash } from '@/lib/auth/flash';
import { ProductRepository } from '@/lib/mongodb/repositories/productRepository';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string; reviewId: string; status: string }> }
): Promise<NextResponse> {
  await requireAdminSession();

  const { productId, reviewId, status } = await params;
  const productLegacyId = Number(productId);
  const reviewLegacyId = Number(reviewId);
  const rStatus = Number(status);

  if (
    Number.isFinite(productLegacyId) &&
    Number.isFinite(reviewLegacyId) &&
    Number.isFinite(rStatus)
  ) {
    const db = await getDb();
    const repo = new ProductRepository(db);
    await repo.updateReviewStatus(productLegacyId, reviewLegacyId, rStatus);
  }

  await setFlash('message', 'Review status updated successfully.');
  return redirectTo('/admin/review-list', 303);
}
