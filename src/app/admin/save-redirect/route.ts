/**
 * `POST /admin/save-redirect` — CR-006 Phase 8. GENUINELY NEW: no
 * Laravel route/controller method to mirror. Follows this codebase's
 * own established convention for new admin-form POST handlers (CSRF
 * check, `requireAdminSession`/`requirePermission`, `setFlash`,
 * redirect) — the same pattern `save-homeopathy/route.ts` uses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { setFlash } from '@/lib/auth/flash';
import { RedirectRepository } from '@/lib/redirects/repository';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return redirectTo('/admin/add-redirect', 303);
  }

  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.REDIRECTS_MANAGE);

  const fromPath = String(formData.get('fromPath') ?? '');
  const toPath = String(formData.get('toPath') ?? '');
  const statusCode = Number(formData.get('statusCode') ?? 301) === 302 ? 302 : 301;
  const now = new Date().toISOString();

  const repo = new RedirectRepository(db);
  await repo.upsert({
    id: `rd-${Date.now().toString(36)}`,
    fromPath,
    toPath,
    statusCode,
    createdAt: now,
    updatedAt: now,
  });

  await setFlash('message', 'Redirect saved successfully.');
  return redirectTo('/admin/redirects-list', 303);
}
