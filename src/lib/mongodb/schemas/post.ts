/**
 * `posts`, `homeopathyMaster`, `blogs`, `blogCategories` collection schemas.
 *
 * `posts` (was `tbl_post`) has TWO independent relationships
 * (docs/M3-DATABASE-MAPPING.md §1.7): `diseaseId` → `categories` (the
 * disease/herb tree) and `homeopathyId` → `homeopathyMaster`, the latter
 * joined in source via the ONE `leftJoin` call site anywhere in the 7 live
 * controllers (`AdminController::EditPost`) — LEFT JOIN semantics tolerate
 * no match, so `homeopathyId` may legitimately reference nothing; this
 * schema keeps it nullable, not required, to match.
 *
 * Both referenced by ID, not embedded — disease/homeopathy master records
 * are shared across many posts and read independently of any specific post
 * (see docs/M3-DATABASE-MAPPING.md §1.7 for the full reasoning).
 *
 * P-04 (Preserved Defect): post CREATE looks up category by slug, EDIT
 * looks up by id — a genuine asymmetry, pure application logic, unaffected
 * by this document shape. Not addressed here; noted for completeness.
 */

import { z } from 'zod';
import { legacyIdSchema, nullableIntSchema, nullableStringSchema, timestampSchema } from './common';

/**
 * `posts` (was `tbl_post`). Source has an unusual `p_id` column:
 * `varchar(400) NOT NULL` — NOT an integer, despite the name suggesting a
 * numeric foreign key. Preserved as a required string field, exactly as
 * declared; its actual meaning/usage was not re-investigated as part of
 * this schema (out of M3-A's scope — flagging so a future session doesn't
 * assume it's a typo for `id` and "fix" it).
 */
export const postSchema = z.object({
  legacyId: legacyIdSchema,
  pId: z.string(), // NOT NULL, varchar(400) in source — see note above, preserved as-is
  homeopathyId: nullableIntSchema, // references homeopathyMaster.legacyId — LEFT JOIN
  // semantics in source, legitimately nullable
  diseaseId: nullableIntSchema, // references categories.legacyId
  postTitle: nullableStringSchema,
  postImage: nullableStringSchema,
  postDesc: nullableStringSchema,
  postStatus: nullableIntSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type Post = z.infer<typeof postSchema>;

/** `homeopathyMaster` (was `tbl_homeopathy`). No `updated_at` column in
 * source, same pattern as `categories`. */
export const homeopathyMasterSchema = z.object({
  legacyId: legacyIdSchema,
  name: nullableStringSchema,
  image: nullableStringSchema,
  slug: nullableStringSchema,
  status: nullableIntSchema, // source: tinyint(1)
  createdAt: timestampSchema,
});

export type HomeopathyMaster = z.infer<typeof homeopathyMasterSchema>;

/** `blogs`. LIVE-orphan (no sidebar link, but functional). References
 * `blogCategories` by ID. */
export const blogSchema = z.object({
  legacyId: legacyIdSchema,
  categoryId: nullableIntSchema, // was blog_catid, references blogCategories.legacyId
  blogTitle: nullableStringSchema,
  blogImage: nullableStringSchema,
  blogDesc: nullableStringSchema,
  blogAuthor: nullableStringSchema,
  blogSlug: nullableStringSchema,
  blogStatus: nullableIntSchema,
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
});

export type Blog = z.infer<typeof blogSchema>;

/** `blogCategories` (was `blog_category`). Referenced by `blogs.categoryId`
 * — by convention only in source, no join call site exists in the 7 live
 * controllers despite the relationship (docs/M3-DATABASE-MAPPING.md §1.7). */
export const blogCategorySchema = z.object({
  legacyId: legacyIdSchema,
  bcatName: nullableStringSchema, // nullable in source, unlike productCategories.catName
  bcatImage: nullableStringSchema,
  bcatSlug: nullableStringSchema,
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
});

export type BlogCategory = z.infer<typeof blogCategorySchema>;
