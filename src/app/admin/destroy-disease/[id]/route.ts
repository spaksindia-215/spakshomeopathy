/**
 * `GET /admin/destroy-disease/{id}` — GENUINELY NEW, no Laravel route to
 * mirror (see `src/lib/diseases/schema.ts`'s header). Same
 * read-then-delete-file-then-delete-row convention as
 * `destroy-slider/[id]/route.ts`. GET (not POST), matching this
 * codebase's established destroy-link convention throughout the admin
 * panel.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { setFlash } from '@/lib/auth/flash';
import { DiseaseRepository } from '@/lib/diseases/repository';
import { deleteAdminUpload } from '@/lib/uploads/adminUpload';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.DISEASES_DELETE);

  const { id } = await params;
  const legacyId = Number(id);

  if (Number.isFinite(legacyId)) {
    const repo = new DiseaseRepository(db);
    const disease = await repo.findByLegacyId(legacyId);
    if (disease) {
      await deleteAdminUpload(disease.image, 'diseases');
      await repo.deleteDisease(legacyId);
    }
  }

  await setFlash('message', 'Record deleted successfully.');
  return redirectTo('/admin/diseases-list', 303);
}
