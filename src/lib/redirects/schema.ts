/**
 * Zod schema for the `redirects` MongoDB collection — CR-006 Phase 8
 * (`docs/CR-006-PHASE-8-PLAN.md` §2.3).
 *
 * GENUINELY NEW, NO LARAVEL TABLE TO TRACE TO: no redirect table exists
 * among the 34 legacy MariaDB tables, and no Laravel middleware performs
 * URL-to-URL remapping (only ordinary `redirect()` flow-control calls
 * for things like post-login/post-checkout navigation, not a mapping
 * mechanism). Deliberately NOT added to `src/lib/mongodb/schemas/` —
 * that tree is a governed, 1:1-traced artifact of the legacy schema; this
 * collection has no such table, so it lives in its own module tree,
 * following the same precedent `src/lib/herbs/db/schema.ts` and
 * `src/lib/pages/schema.ts` established.
 *
 * `fromPath`/`toPath` are same-origin relative paths (not full URLs) —
 * every plausible use here (a changed product/post slug, a retired
 * static page) is same-origin; keeping both relative avoids the
 * middleware needing any origin-mismatch handling.
 */

import { z } from 'zod';

export const redirectDocSchema = z.object({
  id: z.string().min(1),
  fromPath: z.string().min(1).startsWith('/'),
  toPath: z.string().min(1).startsWith('/'),
  statusCode: z.union([z.literal(301), z.literal(302)]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type RedirectDoc = z.infer<typeof redirectDocSchema>;
