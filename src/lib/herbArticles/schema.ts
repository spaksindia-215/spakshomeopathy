/**
 * Zod schema for the `herbArticles` MongoDB collection — replaces
 * `src/lib/herbs/data/content.ts`'s hardcoded `HERB_ARTICLES` array
 * (explicitly commented "placeholder entries only").
 *
 * GENUINELY NEW, NO LARAVEL TABLE TO TRACE TO: no CMS/blog backend was
 * ever wired for `/herbs/learn/[slug]` — see that route's own header.
 *
 * SAME FIELD SET AS THE ORIGINAL `HerbArticle` TYPE ONLY (owner decision,
 * 2026-09-20): title/slug/excerpt/readTime/category — no new `body` field
 * was requested, so the detail page's "Full article content... coming
 * soon" placeholder paragraph is UNCHANGED by this feature. This CRUD
 * makes the article's card/metadata admin-editable; it does not turn the
 * detail page into a real article reader.
 */

import { z } from 'zod';
import { legacyIdSchema } from '@/lib/mongodb/schemas/common';

export const herbArticleSchema = z.object({
  legacyId: legacyIdSchema,
  title: z.string().min(1),
  slug: z.string().min(1),
  excerpt: z.string(),
  readTime: z.string(),
  category: z.string(),
  status: z.number().int(), // 1 = active/shown, 0 = inactive/hidden
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
});

export type HerbArticleDoc = z.infer<typeof herbArticleSchema>;

/** Slugify a title the same permissive way an admin would expect —
 * lowercase, non-alphanumeric runs collapsed to a single hyphen, no
 * leading/trailing hyphen. Used as a fallback when the admin leaves the
 * slug field blank. */
export function slugify(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
