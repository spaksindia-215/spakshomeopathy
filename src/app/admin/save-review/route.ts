/**
 * `POST /admin/save-review` — Review add/edit CRUD feature. GENUINELY
 * NEW, no Laravel route to mirror (see `add-review/[productId]/page.tsx`'s
 * header — reviews were always customer-submitted in source, never
 * admin-authored).
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

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return redirectTo(`/admin/add-review/${productId}`, 303);
  }

  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.PRODUCTS_EDIT);

  const productLegacyId = Number(productId);
  const rName = String(formData.get('rName') ?? '');
  const rEmail = String(formData.get('rEmail') ?? '');
  const rRatingRaw = String(formData.get('rRating') ?? '');
  const rReview = String(formData.get('rReview') ?? '');
  const rStatusRaw = String(formData.get('rStatus') ?? '');

  if (Number.isFinite(productLegacyId)) {
    const repo = new ProductRepository(db);
    const legacyId = await repo.nextReviewLegacyId(productLegacyId);
    await repo.insertReview(productLegacyId, {
      legacyId,
      rName,
      rEmail,
      rRating: Number(rRatingRaw) || null,
      rReview,
      rStatus: Number(rStatusRaw) || 0,
    });
  }

  await setFlash('message', 'Review added successfully.');
  return redirectTo('/admin/review-list', 303);
}
