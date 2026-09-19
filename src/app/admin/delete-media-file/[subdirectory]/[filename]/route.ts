/**
 * `GET /admin/delete-media-file/{subdirectory}/{filename}` — CR-006
 * Phase 8. GENUINELY NEW, no Laravel route to mirror (see
 * `media-library/page.tsx`'s own header). Same shape as
 * `destroy-slider/[id]/route.ts`: GET (not POST, IR-3 — no CSRF check,
 * same precedent as every other destroy-* route in this codebase),
 * `requireAdminSession()`, `setFlash`, redirect back.
 *
 * Calls the EXISTING `deleteAdminUpload` — the same function every
 * other admin form's image-replace/delete path already uses, not a
 * parallel deletion implementation. `subdirectory` is validated against
 * the same fixed list `media-library/page.tsx` offers, so this route
 * cannot be used to reach an arbitrary path outside `uploaded_files/`
 * (on top of `deleteAdminUpload`'s own filename-based lookup, which
 * never accepts a path with separators — see that function's header).
 *
 * NO REVERSE-REFERENCE CHECK: this route does not know whether
 * `filename` is still referenced by a live product/category/post/slider
 * document — disclosed limitation of the filesystem-scan design
 * (`docs/CR-006-PHASE-8-PLAN.md` §2.1/§5), not an oversight.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { setFlash } from '@/lib/auth/flash';
import { deleteAdminUpload } from '@/lib/uploads/adminUpload';
import { getDb } from '@/lib/mongodb/client';

const ALLOWED_SUBDIRECTORIES = [
  'products',
  'categories',
  'post',
  'slider',
  'product-categories',
  'profile',
];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ subdirectory: string; filename: string }> }
): Promise<NextResponse> {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.MEDIA_MANAGE);

  const { subdirectory, filename } = await params;

  // `filename` arrives already URL-decoded — Next.js decodes dynamic
  // route segments itself before this handler runs, so no additional
  // `decodeURIComponent` call is needed (or correct) here.
  if (ALLOWED_SUBDIRECTORIES.includes(subdirectory)) {
    await deleteAdminUpload(filename, subdirectory);
  }

  await setFlash('message', 'File deleted successfully.');
  return redirectTo(`/admin/media-library?dir=${subdirectory}`, 303);
}
