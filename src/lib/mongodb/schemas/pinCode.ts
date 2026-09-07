/**
 * `pinCodes` collection schema. Source: `pin_codes` (8 columns).
 *
 * B-09 / DR-03 — RESOLVED (M5-E, 2026-09-04, Fix Register FIX-001, see
 * `docs/M3-OWNER-DECISION-RECORDS.md` DR-03 addendum and
 * `MIGRATION-CONTRACT.md` §9.3): the Laravel admin controller writes
 * columns (`pin_code`, `pin_address`) that do NOT exist in this table —
 * the real columns are `pincode`, `location`, `country`, `uid`. Every
 * pincode save throws a SQL error in production today (registered BROKEN
 * item B-09). The owner selected DR-03's Option 2 — pincode admin CRUD is
 * now a formally Approved Fix, working correctly against this table's real
 * shape, rather than artificially reproducing the SQL failure.
 *
 * THIS SCHEMA DESCRIBES THE TABLE'S ACTUAL SHAPE (pincode/location/
 * country/uid) — the mismatched column names the BROKEN controller wrote
 * in source are NOT reproduced here as field names. Per
 * docs/M3-DATA-MIGRATION-MAP.md §6, migrating the table's 1 existing row is
 * a simple 1:1 copy of its real columns.
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
