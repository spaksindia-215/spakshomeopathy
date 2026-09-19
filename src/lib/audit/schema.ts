/**
 * Zod schema for the `auditLog` MongoDB collection — CR-006 Phase 9
 * (`docs/CR-006-PHASE-9-PLAN.md` §2.1).
 *
 * GENUINELY NEW, NO LARAVEL TABLE TO TRACE TO: confirmed this phase — no
 * `spatie/activitylog`-style package, no log/audit/history-shaped table
 * among the 34 legacy tables, zero logging calls in any live controller.
 * Deliberately NOT added to `src/lib/mongodb/schemas/` — that tree is a
 * governed, 1:1-traced artifact of the legacy schema; this collection
 * has no such table, so it lives in its own module tree, same precedent
 * `src/lib/pages/schema.ts`/`src/lib/redirects/schema.ts` established.
 *
 * Does NOT capture before/after field VALUES (only which top-level keys
 * were present in an update's `$set` payload) — a deliberate, disclosed
 * scope limit (Phase 9 plan §2.1/§4), not an oversight; capturing full
 * value diffs would mean serializing arbitrary document content into the
 * log, a separate design decision (storage growth, PII exposure) not
 * authorized here.
 */

import { z } from 'zod';

export const auditLogEntrySchema = z.object({
  id: z.string().min(1),
  actorUserId: z.number().int().nullable(),
  actorEmail: z.string().nullable(),
  action: z.enum(['insert', 'update', 'delete', 'upsertByLegacyId']),
  collectionName: z.string().min(1),
  targetId: z.string().nullable(),
  changedFields: z.array(z.string()).optional(),
  timestamp: z.string(),
});

export type AuditLogEntry = z.infer<typeof auditLogEntrySchema>;
