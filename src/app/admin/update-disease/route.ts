/**
 * `POST /admin/update-disease` — GENUINELY NEW, no Laravel route to mirror
 * (see `src/lib/diseases/schema.ts`'s header). Same convention as
 * `update-slider/route.ts`: only re-uploads/replaces the image when a new
 * file is actually supplied, deleting the old file after the new one
 * saves successfully.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { setFlash } from '@/lib/auth/flash';
import { DiseaseRepository } from '@/lib/diseases/repository';
import { saveAdminUpload, deleteAdminUpload, UploadRejectedError } from '@/lib/uploads/adminUpload';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();

  const diseaseId = String(formData.get('disease_id') ?? '');

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return redirectTo(`/admin/edit-disease/${diseaseId}`, 303);
  }

  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.DISEASES_EDIT);

  const title = String(formData.get('title') ?? '');
  const bookingUrl = String(formData.get('bookingUrl') ?? '');
  const statusRaw = String(formData.get('status') ?? '');
  const oldImage = String(formData.get('old_image') ?? '');
  const imageFile = formData.get('image');
  const legacyId = Number(diseaseId);

  let filename = oldImage;
  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      filename = await saveAdminUpload(imageFile, 'diseases');
    } catch (error) {
      if (error instanceof UploadRejectedError) {
        await setFlash('message', error.message);
        return redirectTo(`/admin/edit-disease/${diseaseId}`, 303);
      }
      console.error('[admin/update-disease] upload failed:', error);
      throw error;
    }
    await deleteAdminUpload(oldImage, 'diseases');
  }

  if (Number.isFinite(legacyId)) {
    const repo = new DiseaseRepository(db);
    await repo.updateDisease(legacyId, {
      title,
      bookingUrl,
      image: filename,
      status: Number(statusRaw) || 0,
      updatedAt: new Date(),
    });
  }

  await setFlash('message', 'Record updated successfully.');
  return redirectTo(`/admin/edit-disease/${diseaseId}`, 303);
}
