/**
 * `sliders` collection schema. Source: `slider` (7 columns).
 *
 * P-18 (Preserved Defect, ALREADY REGISTERED — not raised by this
 * document): "Sliders table maintained by admin but unused by the
 * homepage. Preserve both sides." The homepage banner images are
 * hardcoded, not sourced from this table — do NOT wire this collection
 * into the homepage while porting it. This is a known, deliberate
 * disconnect, not an oversight to fix.
 *
 * Zero rows in production today. All four business columns are NOT NULL
 * with no DEFAULT in source — required here to match, even though they
 * have never actually been exercised against real data.
 */

import { z } from 'zod';
import { legacyIdSchema } from './common';

export const sliderSchema = z.object({
  legacyId: legacyIdSchema,
  sliderTitle: z.string(), // NOT NULL in source
  sliderSubtitle: z.string(), // NOT NULL in source
  sliderImage: z.string(), // NOT NULL in source
  sliderStatus: z.number().int(), // NOT NULL in source
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
});

export type Slider = z.infer<typeof sliderSchema>;
