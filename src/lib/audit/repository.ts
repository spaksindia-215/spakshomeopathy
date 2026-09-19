/**
 * `auditLog` collection data access — CR-006 Phase 9.
 *
 * READ-ONLY FROM THE ADMIN UI'S PERSPECTIVE: this repository is used by
 * `/admin/audit-log` to list/filter entries. It is deliberately NOT used
 * by `ValidatedRepository.insertOne`/`updateOne`/`deleteOne` to WRITE
 * entries — those methods write to the `auditLog` collection directly
 * via the raw `Db` handle (`base.ts`'s own `logMutation()` helper) to
 * avoid a circular write (an audit-logged write recursively triggering
 * another audit-logged write on itself, since `AuditLogRepository`
 * extending `ValidatedRepository` would otherwise call right back into
 * the method being instrumented).
 */

import type { Db } from 'mongodb';
import { ValidatedRepository } from '@/lib/mongodb/repositories/base';
import { auditLogEntrySchema, type AuditLogEntry } from './schema';

export const AUDIT_LOG_COLLECTION = 'auditLog';

export interface AuditLogFilter {
  collectionName?: string;
  actorEmail?: string;
}

export class AuditLogRepository extends ValidatedRepository<AuditLogEntry> {
  constructor(db: Db) {
    super(db, AUDIT_LOG_COLLECTION, auditLogEntrySchema);
  }

  /** Newest-first, optionally filtered — the only read shape
   * `/admin/audit-log` needs. `limit` defaults to 200 (no pagination UI
   * this phase — see the Phase 9 plan's own disclosed scope). */
  async findRecent(filter: AuditLogFilter = {}, limit = 200): Promise<AuditLogEntry[]> {
    const query: Record<string, unknown> = {};
    if (filter.collectionName) query.collectionName = filter.collectionName;
    if (filter.actorEmail) query.actorEmail = filter.actorEmail;

    const all = await this.find(query);
    return [...all].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
  }
}
