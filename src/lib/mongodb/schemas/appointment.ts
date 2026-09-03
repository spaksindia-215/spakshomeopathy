/**
 * `appointments` collection schema. Source: `tbl_appointment` (9 columns).
 * No relationships to any other table (docs/M3-DATABASE-MAPPING.md §1.5) —
 * the simplest table in the schema to map. `age` is declared `int(255)` in
 * source (a display-width anomaly, not a range constraint — see
 * docs/M3-DATABASE-MAPPING.md §3.2, no MongoDB equivalent needed).
 */

import { z } from 'zod';
import { legacyIdSchema, nullableIntSchema, nullableStringSchema, timestampSchema } from './common';

export const appointmentSchema = z.object({
  legacyId: legacyIdSchema,
  name: nullableStringSchema,
  age: nullableIntSchema,
  gender: nullableStringSchema,
  phone: nullableStringSchema,
  appointmentDate: nullableStringSchema, // source: varchar(255), not a native date type
  consultantHour: nullableStringSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type Appointment = z.infer<typeof appointmentSchema>;
