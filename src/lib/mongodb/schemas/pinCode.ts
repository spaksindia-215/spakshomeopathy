/**
 * `pinCodes` collection schema. Source: `pin_codes` (8 columns).
 *
 * B-09 / DR-03 (docs/M3-OWNER-DECISION-RECORDS.md — NOT YET APPROVED):
 * the Laravel admin controller writes columns (`pin_code`, `pin_address`)
 * that do NOT exist in this table — the real columns are `pincode`,
 * `location`, `country`, `uid`. Every pincode save throws a SQL error in
 * production today (registered BROKEN item B-09).
 *
 * THIS SCHEMA DESCRIBES THE TABLE'S ACTUAL SHAPE (pincode/location/
 * country/uid) — the mismatched column names the BROKEN controller writes
 * are NOT reproduced here as field names. Per
 * docs/M3-DATA-MIGRATION-MAP.md §6, migrating the table's 1 existing row is
 * a simple 1:1 copy of its real columns; the mismatch only matters for
 * whether NEW saves succeed, which is DR-03's open question, not a schema
 * question.
 *
 * DR-03 is NOT resolved. This schema intentionally does NOT decide between
 * DR-03's two options (artificially reproduce the failure, vs. treat as an
 * Approved-Fix-Register candidate and let it work correctly). Whichever
 * option is eventually chosen is implemented in the repository layer
 * (repositories/pinCodeRepository.ts), not here — this file only describes
 * what a valid, successfully-stored pincode document looks like.
 *
 * `status` is `varchar(255)` in source, NOT numeric — an anomaly against
 * every other table's numeric status columns
 * (docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md §6). Preserved as a string.
 */

import { z } from 'zod';
import { legacyIdSchema, nullableIntSchema, nullableStringSchema } from './common';

export const pinCodeSchema = z.object({
  legacyId: legacyIdSchema,
  uid: nullableIntSchema, // source: int(21)
  country: nullableStringSchema,
  pincode: nullableStringSchema,
  location: nullableStringSchema,
  status: nullableStringSchema, // source: varchar(255), NOT numeric — see file header
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
});

export type PinCode = z.infer<typeof pinCodeSchema>;
