/**
 * `POST /admin/update-redirect` — CR-006 Phase 8. GENUINELY NEW, see
 * `save-redirect/route.ts`'s header for the full disclosure. Same shape
 * as `update-homeopathy/route.ts`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { setFlash } from '@/lib/auth/flash';
import { RedirectRepository } from '@/lib/redirects/repository';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();
  const origin = request.nextUrl.origin;

  const id = String(formData.get('id') ?? '');

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return NextResponse.redirect(new URL(`/admin/edit-redirect/${id}`, origin), 303);
  }

  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.REDIRECTS_MANAGE);

  const repo = new RedirectRepository(db);
  const existing = await repo.findById(id);

  if (!existing) {
    await setFlash('message', 'Invalid redirect.');
    return NextResponse.redirect(new URL('/admin/redirects-list', origin), 303);
  }

  const fromPath = String(formData.get('fromPath') ?? '');
  const toPath = String(formData.get('toPath') ?? '');
  const statusCode = Number(formData.get('statusCode') ?? 301) === 302 ? 302 : 301;

  await repo.upsert({
    ...existing,
    fromPath,
    toPath,
    statusCode,
    updatedAt: new Date().toISOString(),
  });

  await setFlash('message', 'Redirect updated successfully.');
  return NextResponse.redirect(new URL('/admin/redirects-list', origin), 303);
}
