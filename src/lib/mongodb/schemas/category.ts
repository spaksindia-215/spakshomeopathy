/**
 * `categories` and `productCategories` collection schemas.
 *
 * TWO DISTINCT CATEGORY TREES — do not merge or conflate:
 * - `categories` (source: `categories`, 7 columns) — the disease/herb tree,
 *   used by `products.pCat` in its "disease" reading and by `posts.diseaseId`.
 * - `productCategories` (source: `product_category`, 9 columns) — the
 *   separate marketplace-style category tree, self-referential via
 *   `parentId`, used by `products.pCat`/`pSubcat`/`pOcat` in their
 *   "marketplace" reading. See product.ts's file header on the `pCat`
 *   overload — both trees are legitimately referenced by the same product
 *   field depending on which controller method is reading it.
 */

import { z } from 'zod';
import { legacyIdSchema, nullableIntSchema, nullableStringSchema, timestampSchema } from './common';

/**
 * `categories`. `type` is the schema's ONLY enum column in the entire
 * source database (docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md §6):
 * `enum('N','H') NOT NULL COMMENT 'N=Normal,H=harbels'` — comment text,
 * including its own typo ("harbels" for "herbals"), preserved verbatim
 * below for traceability, though Zod's schema itself only needs the two
 * valid values.
 */
export const categorySchema = z.object({
  legacyId: legacyIdSchema,
  name: nullableStringSchema,
  image: nullableStringSchema,
  slug: nullableStringSchema, // P-07: unsanitized in source (name-rand()), may contain
  // spaces/uppercase — preserve whatever value migrates, do not sanitize retroactively
  type: z.enum(['N', 'H']), // N=Normal, H=harbels [sic, preserved from source COMMENT]
  status: nullableIntSchema, // source: tinyint(1)
  createdAt: timestampSchema,
  // NOTE: `categories` has NO `updated_at` column in source (confirmed,
  // docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md §6) — one of a small number of
  // tables that only default `created_at`. Do not add an `updatedAt` field.
});

export type Category = z.infer<typeof categorySchema>;

/**
 * `productCategories` (was `product_category`). Self-referential via
 * `parentId`, preserved as a plain field per docs/M3-DATABASE-MAPPING.md §2
 * — a 3-level tree, walked by application logic, not restructured into a
 * nested-document tree.
 */
export const productCategorySchema = z.object({
  legacyId: legacyIdSchema,
  parentId: nullableIntSchema,
  catName: z.string(), // NOT NULL in source
  catImage: nullableStringSchema,
  catLevel: nullableIntSchema,
  catSlug: nullableStringSchema,
  catStatus: nullableIntSchema,
  createdAt: z.date().nullable(), // source: NULL DEFAULT current_timestamp() — nullable,
  // unlike categories.createdAt which is NOT NULL
  updatedAt: z.date().nullable(),
});

export type ProductCategory = z.infer<typeof productCategorySchema>;
