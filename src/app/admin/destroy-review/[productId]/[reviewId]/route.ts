/**
 * `GET /admin/destroy-review/{productId}/{reviewId}` — Review add/edit
 * CRUD feature. GENUINELY NEW, no Laravel route to mirror. GET (not
 * POST), matching this codebase's established destroy-link convention.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { setFlash } from '@/lib/auth/flash';
import { ProductRepository } from '@/lib/mongodb/repositories/productRepository';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string; reviewId: string }> }
): Promise<NextResponse> {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.PRODUCTS_EDIT);

  const { productId, reviewId } = await params;
  const productLegacyId = Number(productId);
  const reviewLegacyId = Number(reviewId);

  if (Number.isFinite(productLegacyId) && Number.isFinite(reviewLegacyId)) {
    const repo = new ProductRepository(db);
    await repo.deleteReview(productLegacyId, reviewLegacyId);
  }

  await setFlash('message', 'Review deleted successfully.');
  return redirectTo('/admin/review-list', 303);
}
