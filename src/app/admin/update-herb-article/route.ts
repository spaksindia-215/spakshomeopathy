/**
 * `POST /admin/update-herb-article` — GENUINELY NEW, no Laravel route to
 * mirror (see `src/lib/herbArticles/schema.ts`'s header).
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { setFlash } from '@/lib/auth/flash';
import { HerbArticleRepository } from '@/lib/herbArticles/repository';
import { slugify } from '@/lib/herbArticles/schema';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();

  const articleId = String(formData.get('article_id') ?? '');

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return redirectTo(`/admin/edit-herb-article/${articleId}`, 303);
  }

  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.CONTENT_EDIT);

  const title = String(formData.get('title') ?? '');
  const slugRaw = String(formData.get('slug') ?? '');
  const category = String(formData.get('category') ?? '');
  const readTime = String(formData.get('readTime') ?? '');
  const excerpt = String(formData.get('excerpt') ?? '');
  const statusRaw = String(formData.get('status') ?? '');
  const legacyId = Number(articleId);
  const slug = slugify(slugRaw);

  if (!slug) {
    await setFlash('message', 'Slug cannot be empty.');
    return redirectTo(`/admin/edit-herb-article/${articleId}`, 303);
  }

  const repo = new HerbArticleRepository(db);

  const existing = await repo.findBySlug(slug);
  if (existing && existing.legacyId !== legacyId) {
    await setFlash('message', 'Another article already uses that slug.');
    return redirectTo(`/admin/edit-herb-article/${articleId}`, 303);
  }

  if (Number.isFinite(legacyId)) {
    await repo.updateArticle(legacyId, {
      title,
      slug,
      category,
      readTime,
      excerpt,
      status: Number(statusRaw) || 0,
      updatedAt: new Date(),
    });
  }

  await setFlash('message', 'Record updated successfully.');
  return redirectTo(`/admin/edit-herb-article/${articleId}`, 303);
}
