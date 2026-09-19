/**
 * `POST /admin/update-page` — CR-006 Phase 7. GENUINELY NEW: no Laravel
 * route/controller method to mirror (see
 * `src/lib/pages/schema.ts`'s header). Follows this codebase's own
 * established convention for new admin-form POST handlers (CSRF check,
 * `requireAdminSession`/`requirePermission`, `setFlash`, redirect) — the
 * same pattern `update-homeopathy/route.ts` uses.
 *
 * One route handles all 3 page slugs (unlike `update-homeopathy`, there
 * is no per-entity numeric id — `slug` from the closed `pageSlugSchema`
 * enum is both the form field and the document key), since there is no
 * add/delete for this fixed-row collection, only edit-in-place via
 * `PageRepository.upsert`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { setFlash } from '@/lib/auth/flash';
import { PageRepository } from '@/lib/pages/repository';
import { pageSlugSchema } from '@/lib/pages/schema';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();
  const origin = request.nextUrl.origin;

  const rawSlug = String(formData.get('slug') ?? '');

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return NextResponse.redirect(new URL(`/admin/edit-page/${rawSlug}`, origin), 303);
  }

  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.CONTENT_EDIT);

  const parsedSlug = pageSlugSchema.safeParse(rawSlug);
  if (!parsedSlug.success) {
    await setFlash('message', 'Invalid page.');
    return NextResponse.redirect(new URL('/admin/pages-list', origin), 303);
  }
  const slug = parsedSlug.data;

  const title = String(formData.get('title') ?? '');
  const bodyHtml = String(formData.get('bodyHtml') ?? '');

  const repo = new PageRepository(db);
  await repo.upsert({
    slug,
    title,
    bodyHtml,
    updatedAt: new Date().toISOString(),
  });

  await setFlash('message', 'Page updated successfully.');
  return NextResponse.redirect(new URL('/admin/pages-list', origin), 303);
}
