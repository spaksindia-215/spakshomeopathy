/**
 * `GET /admin/destroy-testimonial/{id}` — GENUINELY NEW, no Laravel route
 * to mirror (see `src/lib/testimonials/schema.ts`'s header).
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { setFlash } from '@/lib/auth/flash';
import { TestimonialRepository } from '@/lib/testimonials/repository';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.CONTENT_DELETE);

  const { id } = await params;
  const legacyId = Number(id);

  if (Number.isFinite(legacyId)) {
    const repo = new TestimonialRepository(db);
    await repo.deleteTestimonial(legacyId);
  }

  await setFlash('message', 'Record deleted successfully.');
  return redirectTo('/admin/testimonials-list', 303);
}
