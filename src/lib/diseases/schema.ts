/**
 * Zod schema for the `diseases` MongoDB collection — the hair-condition
 * cards on `/all-diseases`.
 *
 * GENUINELY NEW, NO LARAVEL TABLE TO TRACE TO: `all-diseases.blade.php`'s
 * 7 cards are a hardcoded, hand-authored array (see
 * `src/app/all-diseases/page.tsx`'s header) — there was never a database
 * table or admin screen for this content. Not to be confused with
 * `homeopathyMaster`/`tbl_homeopathy` (a separate, already-admin-managed
 * medicine catalog) or `categories` (product categories) — this is its
 * own concept, matching the `DISEASES_VIEW`/`CREATE`/`EDIT`/`DELETE`
 * permissions already reserved (but previously unused by any route) in
 * `src/lib/auth/permissions.ts`.
 *
 * FIXES TWO OF THE PAGE'S OWN DOCUMENTED PRESERVED DEFECTS, ON PURPOSE:
 * the original hardcoded cards had an empty `href=""` on every title and
 * 7 image paths that 404 (`src/app/all-diseases/page.tsx`'s header lists
 * both, citing contract F-17 "preserve bugs, don't invent fixes" as the
 * reason they were left broken during the pure-migration phase). Now that
 * an admin CRUD is being built for this content specifically so an admin
 * CAN fix it, `bookingUrl` is a real required field and `image` is a real
 * uploaded file (via the same `saveAdminUpload` pipeline `sliders` uses)
 * — an admin filling out the form can no longer reproduce either defect
 * by construction. This mirrors the same "P-18 resolved, not preserved"
 * precedent `schemas/slider.ts`'s header documents for the homepage
 * banner wiring.
 */

import { z } from 'zod';
import { legacyIdSchema } from '@/lib/mongodb/schemas/common';

export const diseaseSchema = z.object({
  legacyId: legacyIdSchema,
  title: z.string().min(1),
  image: z.string().min(1),
  bookingUrl: z.string().min(1),
  status: z.number().int(), // 1 = active/shown, 0 = inactive/hidden
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
});

export type Disease = z.infer<typeof diseaseSchema>;
