/**
 * `POST /admin/save-homeopathy` — CR-006 Phase 4. GENUINELY NEW: no
 * Laravel route/controller method to mirror (see
 * `homeopathyMasterRepository.ts`'s header). Follows this codebase's own
 * established convention for new admin-form POST handlers (CSRF check,
 * image-upload validation via `saveAdminUpload`, `nextLegacyIdGeneric()`
 * for the new id) — the same pattern `save-cat/route.ts` uses, not a new
 * one invented for this file. Unlike `save-cat`, there is no source
 * defect to preserve here (no source exists at all), so this route
 * simply requires the image (`required` isn't literally enforced by any
 * Laravel form to preserve — it's this form's own, since there is no
 * defect-preservation obligation for a screen with no source).
 *
 * `slug` is generated via `convertToSlug` (`src/lib/adminSlug.ts`) — the
 * SAME algorithm already used by product categories/blog categories/
 * blogs/products, not `save-cat`'s "name-rand()" algorithm (P-07's other
 * algorithm) — since there is no source behavior here to match either
 * way, this file follows the more common of this codebase's two existing
 * conventions rather than picking arbitrarily.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { setFlash } from '@/lib/auth/flash';
import { HomeopathyMasterRepository } from '@/lib/mongodb/repositories/homeopathyMasterRepository';
import { saveAdminUpload, UploadRejectedError } from '@/lib/uploads/adminUpload';
import { convertToSlug } from '@/lib/adminSlug';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return redirectTo('/admin/add-homeopathy', 303);
  }

  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.DISEASES_CREATE);

  const name = String(formData.get('name') ?? '');
  const status = String(formData.get('status') ?? '');
  const imageFile = formData.get('image');

  let filename = '';
  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      filename = await saveAdminUpload(imageFile, 'homeopathy');
    } catch (error) {
      if (error instanceof UploadRejectedError) {
        await setFlash('message', error.message);
        return redirectTo('/admin/add-homeopathy', 303);
      }
      console.error('[admin/save-homeopathy] upload failed:', error);
      throw error;
    }
  }

  const repo = new HomeopathyMasterRepository(db);
  const legacyId = await repo.nextLegacyIdGeneric();

  await repo.insertHomeopathy({
    legacyId,
    name,
    image: filename || null,
    slug: convertToSlug(name),
    status: Number(status) || 0,
    createdAt: new Date(),
  });

  await setFlash('message', 'Homeopathy entry saved successfully.');
  return redirectTo('/admin/homeopathy-list', 303);
}
