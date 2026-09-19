/**
 * Zod schema for the `pages` MongoDB collection — CR-006 Phase 7
 * (`docs/CR-006-PHASE-7-PLAN.md` §2.2).
 *
 * GENUINELY NEW, NO LARAVEL TABLE TO TRACE TO: `TermsConditions()`,
 * `returnpolicy()`, `PrivacyPolicy()`, `AboutUs()`
 * (`HomeController.php:254,878,883,890`) are plain `return view(...)`
 * calls with zero database backing — confirmed directly. Deliberately
 * NOT added to `src/lib/mongodb/schemas/`/`collections.ts` — those files
 * are a governed, 1:1-traced artifact of the 34-table legacy MariaDB
 * schema (see `collections.ts`'s own header); this collection has no
 * such table, so it lives in its own module tree instead, following the
 * same "net-new surface area, structurally separated" precedent
 * `src/lib/herbs/db/schema.ts` established for the Herbs Store.
 *
 * `slug` is a CLOSED enum of 3 of the 4 static pages
 * (`/terms`, `/privacy-policy`, `/return-policy`) — deliberately not a
 * free string, since this collection does not add the ability to create
 * a 5th, arbitrary page (that would require new Next.js routes, out of
 * this phase's scope). `/about` is deliberately EXCLUDED: direct
 * inspection found its layout has no comparable single "content body"
 * region (two-column layout, embedded address card, appointment CTA
 * buttons) — force-fitting it into this same raw-HTML-blob shape would
 * risk breaking that layout for no demonstrated need; it can get its own
 * scoping in a later phase if wanted. `bodyHtml` is raw HTML, rendered
 * via `dangerouslySetInnerHTML` by each page — same convention
 * `postDesc`/`blogDesc` already use
 * (`src/app/post-details/[slug]/page.tsx`), since the real page content
 * (headings, lists) is structured HTML, not plain text or Markdown.
 */

import { z } from 'zod';

export const pageSlugSchema = z.enum(['terms', 'privacy-policy', 'return-policy']);

export const pageDocSchema = z.object({
  slug: pageSlugSchema,
  title: z.string().min(1),
  bodyHtml: z.string(),
  updatedAt: z.string(),
});

export type PageSlug = z.infer<typeof pageSlugSchema>;
export type PageDoc = z.infer<typeof pageDocSchema>;
