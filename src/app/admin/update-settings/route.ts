/**
 * `POST /admin/update-settings` — GENUINELY NEW, no Laravel route to
 * mirror (see `src/lib/settings/schema.ts`'s header). Follows this
 * codebase's established convention for admin-form POST handlers (CSRF
 * check, `requireAdminSession`/`requirePermission`, `setFlash`, redirect)
 * — same pattern `update-page/route.ts` uses.
 *
 * Single fixed row (`SITE_SETTINGS_KEY`) — no id in the form, matching
 * `update-page`'s per-slug-not-per-id shape but simpler still, since
 * there's only ever one document.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { setFlash } from '@/lib/auth/flash';
import { SettingsRepository } from '@/lib/settings/repository';
import { SITE_SETTINGS_KEY } from '@/lib/settings/schema';

const TEXT_FIELDS = [
  'companyName',
  'contactEmail',
  'contactPhone',
  'contactPhoneDialable',
  'address',
  'footerAboutText',
  'copyrightText',
  'facebookUrl',
  'instagramUrl',
  'youtubeUrl',
  'twitterUrl',
  'pinterestUrl',
] as const;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return redirectTo('/admin/site-settings', 303);
  }

  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.SETTINGS_UPDATE);

  const fields = Object.fromEntries(
    TEXT_FIELDS.map((field) => [field, String(formData.get(field) ?? '')])
  ) as Record<(typeof TEXT_FIELDS)[number], string>;

  const repo = new SettingsRepository(db);
  await repo.upsert({
    key: SITE_SETTINGS_KEY,
    ...fields,
    updatedAt: new Date().toISOString(),
  });

  await setFlash('message', 'Settings updated successfully.');
  return redirectTo('/admin/site-settings', 303);
}
