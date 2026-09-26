/**
 * `POST /admin/save-disease` — GENUINELY NEW, no Laravel route to mirror
 * (see `src/lib/diseases/schema.ts`'s header). Same convention as
 * `save-slider/route.ts`: CSRF check, `requireAdminSession` +
 * `requirePermission`, `saveAdminUpload` for the image, `setFlash`,
 * redirect.
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
import { saveAdminUpload, UploadRejectedError } from '@/lib/uploads/adminUpload';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return redirectTo('/admin/add-disease', 303);
  }

  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.DISEASES_CREATE);

  const title = String(formData.get('title') ?? '');
  const bookingUrl = String(formData.get('bookingUrl') ?? '');
  const statusRaw = String(formData.get('status') ?? '');
  const imageFile = formData.get('image');

  if (!(imageFile instanceof File) || imageFile.size === 0) {
    await setFlash('message', 'No image file was uploaded.');
    return redirectTo('/admin/add-disease', 303);
  }

  let filename: string;
  try {
    filename = await saveAdminUpload(imageFile, 'diseases');
  } catch (error) {
    if (error instanceof UploadRejectedError) {
      await setFlash('message', error.message);
      return redirectTo('/admin/add-disease', 303);
    }
    console.error('[admin/save-disease] upload failed:', error);
    throw error;
  }

  const repo = new DiseaseRepository(db);
  const legacyId = await repo.nextLegacyIdGeneric();

  await repo.insertDisease({
    legacyId,
    title,
    bookingUrl,
    image: filename,
    status: Number(statusRaw) || 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await setFlash('message', 'Record saved successfully.');
  return redirectTo('/admin/add-disease', 303);
}
