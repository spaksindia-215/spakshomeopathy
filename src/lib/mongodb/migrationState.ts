/**
 * Migration state tracking — makes the migration pipeline idempotent
 * WITHOUT changing any business identifier.
 *
 * Owner instruction (M3-B §6): "The migration tooling must be safely
 * repeatable in an isolated environment. A second execution against the
 * same target should not create duplicate records. Do not solve this by
 * changing business identifiers. Use explicit migration identity/state
 * tracking where appropriate."
 *
 * DESIGN: a dedicated `_migrationState` collection (NOT one of the 29
 * business collections in collections.ts) records, per (collection,
 * legacyId) pair, whether that source row has already been migrated and
 * when. `upsertByLegacyId` (below) is the write primitive every generation-
 * stage writer should use instead of a raw `insertOne` — it uses MongoDB's
 * native upsert (`{legacyId}` as the filter, `$set` the document) so a
 * second run overwrites the SAME document rather than inserting a
 * duplicate. `legacyId` itself is UNCHANGED, UNGENERATED, and UNMODIFIED
 * by this mechanism — it is exactly the value the transform stage
 * produced from the source `id` column. This satisfies "do not solve this
 * by changing business identifiers" directly: idempotency comes from the
 * upsert operation's filter, not from altering what legacyId means or how
 * it's computed.
 *
 * NOTHING IN THIS FILE CONNECTS TO A DATABASE. It exports pure functions
 * (state-record shape helpers) and one function
 * (`upsertByLegacyId`) that TAKES a `Collection` as a parameter — the
 * caller supplies the connection, this module never opens one itself.
 */

import type { Collection, Document } from 'mongodb';

export interface MigrationStateRecord {
  /** Composite natural key: which target collection, which source
   * legacyId. Not itself a business identifier — purely migration
   * bookkeeping. */
  collectionName: string;
  legacyId: number | string;
  migratedAt: Date;
  /** SHA-256 (or similar) hash of the generated document's content, so a
   * re-run can detect "this row's transformed shape changed since last
   * migration" versus "this row is identical, upsert is a no-op" — useful
   * for the parity report to distinguish new writes from confirmed-unchanged
   * re-writes. Optional: only meaningful once a hashing strategy is chosen
   * by the generation stage; not required for idempotency itself, which
   * the upsert-by-legacyId mechanism already guarantees on its own. */
  contentHash?: string;
}

export function buildMigrationStateRecord(
  collectionName: string,
  legacyId: number | string,
  contentHash?: string
): MigrationStateRecord {
  return { collectionName, legacyId, migratedAt: new Date(), contentHash };
}

/**
 * Upserts a document into `collection`, keyed by `legacyId` — the single
 * idempotency primitive this module provides. A second call with the same
 * `legacyId` and an identical or updated document REPLACES the existing
 * one; it never inserts a duplicate. This is the mechanism, not a
 * decision about WHEN to call it — the generation stage (M3-B's later
 * work, or a future phase) decides the write strategy; this function only
 * guarantees that whichever strategy is chosen doesn't duplicate records
 * on re-run.
 *
 * NOT CALLED ANYWHERE IN THIS PHASE'S PIPELINE — the pipeline as built for
 * M3-B stops at dry-run/report generation (see
 * src/lib/migration/pipeline.ts). This function exists as the documented,
 * tested MECHANISM for idempotent writes, ready for whichever future
 * phase is authorized to perform an actual (development-target) write.
 */
export async function upsertByLegacyId<T extends Document & { legacyId: number | string }>(
  collection: Collection<T>,
  document: T
): Promise<{ matched: boolean }> {
  const result = await collection.updateOne(
    { legacyId: document.legacyId } as never,
    { $set: document },
    { upsert: true }
  );
  return { matched: result.matchedCount > 0 };
}
