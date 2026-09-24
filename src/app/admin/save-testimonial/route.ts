/**
 * `POST /admin/save-testimonial` — GENUINELY NEW, no Laravel route to
 * mirror (see `src/lib/testimonials/schema.ts`'s header).
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { setFlash } from '@/lib/auth/flash';
import { TestimonialRepository } from '@/lib/testimonials/repository';
import { testimonialSectionSchema } from '@/lib/testimonials/schema';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return redirectTo('/admin/add-testimonial', 303);
  }

  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.CONTENT_CREATE);

  const name = String(formData.get('name') ?? '');
  const location = String(formData.get('location') ?? '');
  const quote = String(formData.get('quote') ?? '');
  const ratingRaw = String(formData.get('rating') ?? '');
  const statusRaw = String(formData.get('status') ?? '');
  const sections = formData
    .getAll('sections')
    .map((value) => testimonialSectionSchema.safeParse(String(value)))
    .filter((result) => result.success)
    .map((result) => result.data);

  if (sections.length === 0) {
    await setFlash('message', 'Select at least one section to show this testimonial on.');
    return redirectTo('/admin/add-testimonial', 303);
  }

  const repo = new TestimonialRepository(db);
  const legacyId = await repo.nextLegacyIdGeneric();

  await repo.insertTestimonial({
    legacyId,
    name,
    location,
    quote,
    rating: Number(ratingRaw) || 5,
    sections,
    status: Number(statusRaw) || 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await setFlash('message', 'Record saved successfully.');
  return redirectTo('/admin/add-testimonial', 303);
}
