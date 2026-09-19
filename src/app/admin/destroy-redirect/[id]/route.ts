/**
 * `GET /admin/destroy-redirect/{id}` — CR-006 Phase 8. GENUINELY NEW, no
 * Laravel route to mirror. Same shape as `destroy-slider/[id]/route.ts`:
 * GET (not POST, IR-3 — no CSRF check, same precedent as every other
 * destroy-* route in this codebase).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { setFlash } from '@/lib/auth/flash';
import { RedirectRepository } from '@/lib/redirects/repository';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.REDIRECTS_MANAGE);

  const { id } = await params;

  const repo = new RedirectRepository(db);
  await repo.deleteById(id);

  await setFlash('message', 'Redirect deleted successfully.');
  return NextResponse.redirect(new URL('/admin/redirects-list', request.nextUrl.origin), 303);
}
