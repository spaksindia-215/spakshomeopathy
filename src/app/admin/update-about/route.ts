/**
 * `POST /admin/update-about` — GENUINELY NEW, no Laravel route to mirror
 * (see `src/lib/about/schema.ts`'s header). Same convention as
 * `update-page/route.ts`/`update-settings/route.ts`: CSRF check,
 * `requireAdminSession`/`requirePermission`, `setFlash`, redirect.
 *
 * `introParagraphs`/`secondaryParagraphs` textareas submit one paragraph
 * per line — split on `\n`, trimmed, and blank lines dropped, so an admin
 * accidentally leaving a trailing empty line doesn't create an empty
 * paragraph on the public page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { setFlash } from '@/lib/auth/flash';
import { AboutPageRepository } from '@/lib/about/repository';
import { ABOUT_PAGE_KEY } from '@/lib/about/schema';

const TEXT_FIELDS = [
  'heading',
  'subheading',
  'heroImage',
  'clinicName',
  'clinicAddress',
  'clinicPhone',
  'doctorName',
  'doctorCredentials',
  'videoAppointmentUrl',
  'clinicAppointmentUrl',
] as const;

function splitParagraphs(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return redirectTo('/admin/edit-about', 303);
  }

  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.CONTENT_EDIT);

  const fields = Object.fromEntries(
    TEXT_FIELDS.map((field) => [field, String(formData.get(field) ?? '')])
  ) as Record<(typeof TEXT_FIELDS)[number], string>;

  const introParagraphs = splitParagraphs(String(formData.get('introParagraphs') ?? ''));
  const secondaryParagraphs = splitParagraphs(String(formData.get('secondaryParagraphs') ?? ''));

  const repo = new AboutPageRepository(db);
  await repo.upsert({
    key: ABOUT_PAGE_KEY,
    ...fields,
    introParagraphs,
    secondaryParagraphs,
    updatedAt: new Date().toISOString(),
  });

  await setFlash('message', 'About page updated successfully.');
  return redirectTo('/admin/edit-about', 303);
}
