/**
 * `enquiries` collection schema. Source: `enquiries` (8 columns), latin1
 * charset (docs/M3-DATA-MIGRATION-MAP.md §2.2 — charset conversion is
 * DR-06, not yet approved). No relationships. 16,386 rows in production,
 * the large majority spam/bot submissions (docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md
 * §8.1) — DR-07 (whether to filter spam during migration) is NOT approved;
 * this schema validates shape only and makes no filtering decision.
 *
 * P-01 (Preserved Defect): the public contact form collects `phone` but
 * `saveEnq` never reads it — `mobile` is always NULL in every existing and
 * future row unless D-05 is separately approved. This schema keeps `mobile`
 * nullable/optional to match, not required.
 */

import { z } from 'zod';
import { legacyIdSchema, nullableStringSchema, timestampSchema } from './common';

export const enquirySchema = z.object({
  legacyId: legacyIdSchema,
  name: nullableStringSchema,
  email: nullableStringSchema,
  mobile: nullableStringSchema, // P-01: always null today, per the contract's Preserved Defect Register
  subject: nullableStringSchema,
  message: nullableStringSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type Enquiry = z.infer<typeof enquirySchema>;
