/**
 * Zod schema for the `testimonials` MongoDB collection — replaces TWO
 * separately-hardcoded, explicitly-labeled "demo" testimonial lists:
 * `src/lib/herbs/data/content.ts`'s `HERB_TESTIMONIALS` and
 * `src/components/homeopathy/HomeopathyMarketingSections.tsx`'s own
 * `TESTIMONIALS` array. Both were clearly-marked placeholder content
 * (see their own comments — "Demo Customer" names, "replace with real
 * reviews via admin"), not migrated production data.
 *
 * GENUINELY NEW, NO LARAVEL TABLE TO TRACE TO: neither list has any
 * database/admin backing in source.
 *
 * ONE SHARED POOL, TAGGED BY SECTION (owner decision, 2026-09-20): rather
 * than two separately-admin-managed collections with an identical shape,
 * `sections` marks which storefront(s) a testimonial should appear on —
 * an admin can tag one testimonial for both if it genuinely applies to
 * both product lines. This is a simpler admin experience than duplicating
 * the same CRUD twice for one shape.
 */

import { z } from 'zod';
import { legacyIdSchema } from '@/lib/mongodb/schemas/common';

export const testimonialSectionSchema = z.enum(['herbs', 'homeopathy']);

export const testimonialSchema = z.object({
  legacyId: legacyIdSchema,
  name: z.string().min(1),
  location: z.string(),
  rating: z.number().int().min(1).max(5),
  quote: z.string().min(1),
  sections: z.array(testimonialSectionSchema).min(1),
  status: z.number().int(), // 1 = active/shown, 0 = inactive/hidden
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
});

export type Testimonial = z.infer<typeof testimonialSchema>;
export type TestimonialSection = z.infer<typeof testimonialSectionSchema>;
