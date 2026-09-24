/**
 * `POST /admin/update-video` — GENUINELY NEW, no Laravel route to mirror
 * (see `src/lib/videos/schema.ts`'s header).
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

  const videoId = String(formData.get('video_id') ?? '');

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return redirectTo(`/admin/edit-video/${videoId}`, 303);
  }

  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.CONTENT_EDIT);

  const title = String(formData.get('title') ?? '');
  const youtubeUrlRaw = String(formData.get('youtubeUrl') ?? '');
  const statusRaw = String(formData.get('status') ?? '');
  const legacyId = Number(videoId);

  const youtubeVideoId = extractYoutubeVideoId(youtubeUrlRaw);
  if (!youtubeVideoId) {
    await setFlash('message', 'Could not read a YouTube video ID from that URL.');
    return redirectTo(`/admin/edit-video/${videoId}`, 303);
  }

  if (Number.isFinite(legacyId)) {
    const repo = new VideoRepository(db);
    await repo.updateVideo(legacyId, {
      title,
      youtubeVideoId,
      status: Number(statusRaw) || 0,
      updatedAt: new Date(),
    });
  }

  await setFlash('message', 'Record updated successfully.');
  return redirectTo(`/admin/edit-video/${videoId}`, 303);
}
