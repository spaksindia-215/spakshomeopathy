/**
 * `statezones`, `cities` collection schemas. Source: `statezones` (6
 * columns), `cities` (7 columns). `cities.zoneId` references
 * `statezones.legacyId` (docs/M3-DATABASE-MAPPING.md §2 — the one
 * `AdminController.php:1510` join site).
 */

import { z } from 'zod';
import { legacyIdSchema, nullableIntSchema, nullableStringSchema, timestampSchema } from './common';

export const statezoneSchema = z.object({
  legacyId: legacyIdSchema,
  countryId: nullableIntSchema, // source: int(21)
  zoneName: nullableStringSchema,
  status: nullableIntSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type Statezone = z.infer<typeof statezoneSchema>;

export const citySchema = z.object({
  legacyId: legacyIdSchema,
  zoneId: nullableIntSchema, // references statezones.legacyId, source: int(21)
  cityName: nullableStringSchema,
  pinCode: nullableIntSchema, // source: int(11) — a plain integer here, unrelated to the
  // separate `pinCodes` collection/table
  status: nullableIntSchema,
  createdAt: z.date().nullable(),
  updatedAt: timestampSchema,
});

export type City = z.infer<typeof citySchema>;
