/**
 * `POST /admin/save-herb-article` — GENUINELY NEW, no Laravel route to
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

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return redirectTo('/admin/add-herb-article', 303);
  }

  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.CONTENT_CREATE);

  const title = String(formData.get('title') ?? '');
  const slugRaw = String(formData.get('slug') ?? '');
  const category = String(formData.get('category') ?? '');
  const readTime = String(formData.get('readTime') ?? '');
  const excerpt = String(formData.get('excerpt') ?? '');
  const statusRaw = String(formData.get('status') ?? '');
  const slug = slugRaw.trim().length > 0 ? slugify(slugRaw) : slugify(title);

  if (!slug) {
    await setFlash('message', 'Could not derive a URL slug from the title.');
    return redirectTo('/admin/add-herb-article', 303);
  }

  const repo = new HerbArticleRepository(db);

  const existing = await repo.findBySlug(slug);
  if (existing) {
    await setFlash('message', 'An article with that slug already exists.');
    return redirectTo('/admin/add-herb-article', 303);
  }

  const legacyId = await repo.nextLegacyIdGeneric();

  await repo.insertArticle({
    legacyId,
    title,
    slug,
    category,
    readTime,
    excerpt,
    status: Number(statusRaw) || 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await setFlash('message', 'Record saved successfully.');
  return redirectTo('/admin/add-herb-article', 303);
}
