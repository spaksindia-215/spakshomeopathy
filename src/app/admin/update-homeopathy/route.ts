/**
 * `POST /admin/update-homeopathy` — CR-006 Phase 4. GENUINELY NEW, see
 * `save-homeopathy/route.ts`'s header for the full disclosure. Same
 * shape as `update-category/route.ts` (old-image fallback when no new
 * file is supplied, no old-image cleanup — matching this codebase's own
 * established "no unlink() on update" convention for this kind of form).
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

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();

  const id = String(formData.get('id') ?? '');

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return redirectTo(`/admin/edit-homeopathy/${id}`, 303);
  }

  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.DISEASES_EDIT);

  const name = String(formData.get('name') ?? '');
  const status = String(formData.get('status') ?? '');
  const oldImage = String(formData.get('old_image') ?? '');
  const imageFile = formData.get('image');
  const legacyId = Number(id);

  let filename = oldImage;
  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      filename = await saveAdminUpload(imageFile, 'homeopathy');
    } catch (error) {
      if (error instanceof UploadRejectedError) {
        await setFlash('message', error.message);
        return redirectTo(`/admin/edit-homeopathy/${id}`, 303);
      }
      throw error;
    }
  }

  if (!Number.isFinite(legacyId)) {
    await setFlash('message', 'Invalid homeopathy entry.');
    return redirectTo('/admin/homeopathy-list', 303);
  }

  const repo = new HomeopathyMasterRepository(db);
  await repo.updateHomeopathy(legacyId, {
    name,
    image: filename || null,
    status: Number(status) || 0,
  });

  await setFlash('message', 'Homeopathy entry updated successfully.');
  return redirectTo('/admin/homeopathy-list', 303);
}
