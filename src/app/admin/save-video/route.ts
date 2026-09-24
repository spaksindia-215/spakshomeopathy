/**
 * `POST /admin/save-video` — GENUINELY NEW, no Laravel route to mirror
 * (see `src/lib/videos/schema.ts`'s header). Same convention as
 * `save-disease/route.ts`, minus the file upload (a YouTube video id has
 * no file to store).
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { setFlash } from '@/lib/auth/flash';
import { VideoRepository } from '@/lib/videos/repository';
import { extractYoutubeVideoId } from '@/lib/videos/schema';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return redirectTo('/admin/add-video', 303);
  }

  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.CONTENT_CREATE);

  const title = String(formData.get('title') ?? '');
  const youtubeUrlRaw = String(formData.get('youtubeUrl') ?? '');
  const statusRaw = String(formData.get('status') ?? '');

  const youtubeVideoId = extractYoutubeVideoId(youtubeUrlRaw);
  if (!youtubeVideoId) {
    await setFlash('message', 'Could not read a YouTube video ID from that URL.');
    return redirectTo('/admin/add-video', 303);
  }

  const repo = new VideoRepository(db);
  const legacyId = await repo.nextLegacyIdGeneric();

  await repo.insertVideo({
    legacyId,
    title,
    youtubeVideoId,
    status: Number(statusRaw) || 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await setFlash('message', 'Record saved successfully.');
  return redirectTo('/admin/add-video', 303);
}
