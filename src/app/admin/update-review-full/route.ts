/**
 * `POST /admin/update-review-full` — Review add/edit CRUD feature.
 * GENUINELY NEW, no Laravel route to mirror. Named `update-review-full`
 * (not `update-review`) to avoid colliding with the existing, migrated
 * `GET /admin/update-review/[productId]/[reviewId]/[status]` route
 * (mirrors real Laravel `ReviewUpdate`, status-toggle only) — this route
 * is unrelated new surface area, not a replacement for that one.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { setFlash } from '@/lib/auth/flash';
import { ProductRepository } from '@/lib/mongodb/repositories/productRepository';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();

  const productId = String(formData.get('product_id') ?? '');
  const reviewId = String(formData.get('review_id') ?? '');

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return redirectTo(`/admin/edit-review/${productId}/${reviewId}`, 303);
  }

  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.PRODUCTS_EDIT);

  const productLegacyId = Number(productId);
  const reviewLegacyId = Number(reviewId);
  const rName = String(formData.get('rName') ?? '');
  const rEmail = String(formData.get('rEmail') ?? '');
  const rRatingRaw = String(formData.get('rRating') ?? '');
  const rReview = String(formData.get('rReview') ?? '');
  const rStatusRaw = String(formData.get('rStatus') ?? '');

  if (Number.isFinite(productLegacyId) && Number.isFinite(reviewLegacyId)) {
    const repo = new ProductRepository(db);
    await repo.updateReview(productLegacyId, reviewLegacyId, {
      rName,
      rEmail,
      rRating: Number(rRatingRaw) || null,
      rReview,
      rStatus: Number(rStatusRaw) || 0,
    });
  }

  await setFlash('message', 'Review updated successfully.');
  return redirectTo('/admin/review-list', 303);
}
