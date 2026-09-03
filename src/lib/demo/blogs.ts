/**
 * Blog demo-data accessors. See products.ts's header for the general
 * rationale. Full real lists (4 blogs, 1 blogCategory — small tables) —
 * used by `/blog-detail/{slug}` (public) and, added for M4-DEMO Phase 1,
 * `/admin/blog-list`/`/admin/add-blog`/`/admin/edit-blog/[id]` (admin —
 * reuses this SAME public demo data, not a separate admin-only fixture,
 * since both surfaces show the same underlying real `blogs` collection).
 */

import { DEMO_BLOGS } from './blogs.generated';
import { DEMO_BLOG_CATEGORIES } from './blogCategories.generated';
import type { Blog, BlogCategory } from '../mongodb/schemas';

export function getAllBlogs(): Blog[] {
  return DEMO_BLOGS;
}

export function getBlogBySlug(slug: string): Blog | undefined {
  return DEMO_BLOGS.find((b) => b.blogSlug === slug);
}

/** Added for admin's `/admin/edit-blog/[id]` (the real route's `{id}`
 * param is the row's legacyId, not its slug — the public site's
 * `/blog-detail/{slug}` route never needed an id-based lookup). */
export function getBlogByLegacyId(legacyId: number): Blog | undefined {
  return DEMO_BLOGS.find((b) => b.legacyId === legacyId);
}

export function getAllBlogCategories(): BlogCategory[] {
  return DEMO_BLOG_CATEGORIES;
}

/** Added for admin's `/admin/edit-blog-category/[id]`. */
export function getBlogCategoryByLegacyId(legacyId: number): BlogCategory | undefined {
  return DEMO_BLOG_CATEGORIES.find((c) => c.legacyId === legacyId);
}
