/**
 * `GET /admin/toggle-product-status/{id}` — Partner Panel feature.
 * GENUINELY NEW: `product-list/page.tsx`'s Status badges were previously
 * dead `href="#"` links (see that page's own header) — this is the real
 * handler that makes them work, using the existing
 * `ProductRepository.toggleStatusByLegacyId()` (already implemented,
 * previously unwired to any route). This is the concrete mechanism by
 * which an admin activates a partner-submitted product (created with
 * `pStatus=0`) so it becomes publicly visible. Same shape as
 * `destroy-product/[id]/route.ts`.
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
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.PRODUCTS_PUBLISH);

  const { id } = await params;
  const legacyId = Number(id);

  if (Number.isFinite(legacyId)) {
    const repo = new ProductRepository(db);
    await repo.toggleStatusByLegacyId(legacyId);
  }

  await setFlash('message', 'Product status updated.');
  return redirectTo('/admin/product-list', 303);
}
