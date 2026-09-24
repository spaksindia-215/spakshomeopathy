/**
 * `sliders` collection schema. Source: `slider` (7 columns).
 *
 * P-18 (Preserved Defect during the pure-migration phase) RESOLVED (Site
 * Settings feature, owner-approved 2026-09-20): the original migration
 * deliberately left sliders unwired from the homepage, matching
 * production's own dormant table. Now that the project's goal has shifted
 * to admin-editability rather than pixel-parity with legacy production,
 * the owner approved wiring it in — see `RedesignedHome.tsx`'s promo
 * banner section, which reads `sliderStatus === 1` rows via
 * `SliderRepository.findActiveDescending()`.
 *
 * Zero rows in production today, so the banner section renders nothing
 * until an admin adds one via `/admin/add-slider`. All four business
 * columns are NOT NULL with no DEFAULT in source — required here to
 * match, even though they were never actually exercised against real
 * data in legacy production.
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
