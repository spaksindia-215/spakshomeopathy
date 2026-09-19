/**
 * Base repository helper.
 *
 * M3-A SCOPE: generic CRUD-shaped helpers only. NO business logic, NO
 * Laravel-behavior-specific queries — those live in each entity's own
 * repository file, each documenting which Laravel controller method it
 * mirrors and why.
 *
 * WHY A REPOSITORY LAYER AT ALL (contract §5.2 precedent)
 * ---------------------------------------------------------
 * Contract §5.2 pre-approves "extracting inline DB::table() chains into
 * lib/queries/* functions... where the emitted SQL and rendered output are
 * unchanged." This mirrors that exactly for MongoDB: each repository
 * function corresponds to one (or a small, clearly-related group of)
 * Laravel controller query, extracted into a named, typed function instead
 * of inlined. The IMPORTANT IMPLEMENTATION RULE from the owner's DR-01
 * approval applies here directly: "design the data access layer so that
 * application behavior remains equivalent to Laravel" — every repository
 * function's doc comment states which Laravel source line(s) it mirrors.
 */

import type { Collection, Db, Document, Filter, OptionalUnlessRequiredId } from 'mongodb';
import type { ZodType } from 'zod';
import { getCurrentActor } from '@/lib/audit/context';

/** Collections that must NEVER be audit-logged, to avoid a write loop —
 * `auditLog` logging its own writes. Checked by name (not by importing
 * `AUDIT_LOG_COLLECTION`, which would create a dependency cycle between
 * `base.ts` and `src/lib/audit/repository.ts`, itself a
 * `ValidatedRepository` subclass). */
const AUDIT_LOG_COLLECTION_NAME = 'auditLog';

/** Best-effort id extraction for the audit entry's `targetId` — checks
 * the field names every schema in this codebase actually uses for its
 * own identifier, in the order most-to-least common (`legacyId` covers
 * every governed, legacy-traced schema; `id`/`key`/`slug` cover the
 * net-new collections Phases 6-9 added, e.g. `wellnessCategories.key`,
 * `pages.slug`). `null` (not a thrown error) when none match — a
 * document shape this helper doesn't recognize should not break the
 * underlying write. Exported so subclasses' own `logMutation()` calls
 * (see `ValidatedRepository.logMutation` below) can reuse it. */
export function extractTargetId(doc: Record<string, unknown>): string | number | null {
  for (const field of ['legacyId', 'id', 'key', 'slug']) {
    const value = doc[field];
    if (typeof value === 'string' || typeof value === 'number') return value;
  }
  return null;
}

/**
 * Writes one audit-log entry directly via the raw `Db` handle — NOT
 * through `AuditLogRepository`/`ValidatedRepository`, to avoid a
 * circular write (see `AuditLogRepository`'s own header). Best-effort:
 * a logging failure is caught and swallowed, never allowed to fail the
 * underlying business write it describes (CR-006 Phase 9 plan §2.1).
 */
async function logMutationImpl(
  db: Db,
  collectionName: string,
  action: 'insert' | 'update' | 'delete' | 'upsertByLegacyId',
  targetId: string | number | null,
  changedFields?: string[]
): Promise<void> {
  if (collectionName === AUDIT_LOG_COLLECTION_NAME) return;
  try {
    const actor = getCurrentActor();
    await db.collection(AUDIT_LOG_COLLECTION_NAME).insertOne({
      id: `al-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      actorUserId: actor?.userId ?? null,
      actorEmail: actor?.email ?? null,
      action,
      collectionName,
      targetId: targetId === null ? null : String(targetId),
      ...(changedFields ? { changedFields } : {}),
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Never let an audit-logging failure fail the write it describes.
  }
}

/**
 * Wraps a MongoDB collection with Zod validation on read and write, so a
 * malformed document (from a migration bug, a manual edit, or a future bug
 * in this layer itself) is caught at the boundary rather than silently
 * propagating into application code with the wrong shape.
 */
export class ValidatedRepository<T extends Document> {
  constructor(
    private readonly db: Db,
    private readonly collectionName: string,
    private readonly schema: ZodType<T>
  ) {}

  protected get collection(): Collection<T> {
    return this.db.collection<T>(this.collectionName);
  }

  /** Validates a document against this repository's schema before it is
   * trusted by any caller. Throws with the collection name in the message
   * if validation fails — never silently coerces or drops fields. */
  protected validate(doc: unknown): T {
    return this.schema.parse(doc);
  }

  /**
   * CR-006 Phase 9 — writes one audit-log entry. Exposed as `protected`
   * (not just used internally by `insertOne`/`updateOne`/`deleteOne`/
   * `upsertByLegacyId` below) so a subclass with its own custom write
   * method that calls `this.collection.updateOne/insertOne/deleteOne`
   * DIRECTLY (bypassing the instrumented base methods — e.g.
   * `RedirectRepository.upsert()`'s upsert-by-own-`id`, which the base
   * class's `insertOne`/`updateOne` don't support) can still log that
   * write, by calling `this.logMutation(...)` right after its own direct
   * collection call. Found necessary during end-to-end testing: roughly
   * a dozen existing custom write methods across Phases 6-9's own
   * repositories (`redirects`, `pages`, herbs, wellness categories,
   * mother tincture, orders, `userRepository`) do exactly this and were
   * silently NOT being logged before this method existed — see
   * `docs/GATE-REPORT-CR006-PHASE-9.md` for the full account.
   */
  protected async logMutation(
    action: 'insert' | 'update' | 'delete' | 'upsertByLegacyId',
    targetId: string | number | null,
    changedFields?: string[]
  ): Promise<void> {
    await logMutationImpl(this.db, this.collectionName, action, targetId, changedFields);
  }

  async findOne(filter: Filter<T>): Promise<T | null> {
    const doc = await this.collection.findOne(filter);
    if (doc === null) return null;
    return this.validate(doc);
  }

  async find(filter: Filter<T>): Promise<T[]> {
    const docs = await this.collection.find(filter).toArray();
    return docs.map((d) => this.validate(d));
  }

  async insertOne(doc: T): Promise<T> {
    const validated = this.validate(doc);
    await this.collection.insertOne(validated as OptionalUnlessRequiredId<T>);
    await this.logMutation('insert', extractTargetId(validated as unknown as Record<string, unknown>));
    return validated;
  }

  /**
   * Idempotent upsert keyed by `legacyId` — M3-C's migration write path.
   * Delegates to `src/lib/mongodb/migrationState.ts`'s `upsertByLegacyId`
   * (built and unit-tested in M3-B) rather than reimplementing the same
   * upsert-by-legacyId logic a second time, per the owner's M3-C §4
   * instruction: "Use the exact M3-B transformation logic. Do not create
   * a second transformation implementation." (That instruction is about
   * transformation specifically, but the same "don't duplicate" principle
   * applies here to the idempotency mechanism itself.)
   *
   * Constrained to documents carrying a `legacyId: number | string` field
   * — every schema in `src/lib/mongodb/schemas/` has one
   * (docs/M3-MONGODB-ARCHITECTURE.md §3.1), so this is not a new
   * requirement, just a type-level acknowledgment of an existing one.
   */
  async upsertByLegacyId<D extends T & { legacyId: number | string }>(doc: D): Promise<D> {
    const validated = this.validate(doc) as unknown as D;
    const { upsertByLegacyId } = await import('../migrationState');
    await upsertByLegacyId(this.collection as unknown as Collection<D>, validated);
    await this.logMutation('upsertByLegacyId', validated.legacyId);
    return validated;
  }

  async count(filter: Filter<T> = {}): Promise<number> {
    return this.collection.countDocuments(filter);
  }

  /**
   * Added M5-E (admin CRUD write paths, first sub-slice: pin codes).
   * Generic partial-field update by filter — mirrors
   * `DB::table(...)->where(...)->update([...])`'s shape (a targeted
   * column-set update, not a full-document replace). Does NOT re-validate
   * the merged result against the full schema (a partial `$set` payload
   * would fail `schema.parse()` if fields are omitted) — callers that need
   * a schema-validated read-back should `findOne()` again after updating,
   * the same pattern `pinCodeRepository.ts` uses.
   */
  async updateOne(filter: Filter<T>, update: Partial<T>): Promise<void> {
    await this.collection.updateOne(filter, { $set: update });
    await this.logMutation(
      'update',
      extractTargetId(filter as unknown as Record<string, unknown>),
      Object.keys(update)
    );
  }

  /**
   * Added M5-E. Mirrors `DB::table(...)->where(...)->delete()` — Laravel's
   * delete methods in this app (e.g. `AdminController::DestroyPinCode`)
   * take no action on a zero-match delete (no error, no distinguishable
   * response), so this does not throw or report whether a document
   * actually existed; same "quiet either way" behavior.
   */
  async deleteOne(filter: Filter<T>): Promise<void> {
    await this.collection.deleteOne(filter);
    await this.logMutation('delete', extractTargetId(filter as unknown as Record<string, unknown>));
  }

  /**
   * Added M5-E. Generic `MAX(legacyId) + 1` new-document id strategy —
   * the same strategy already independently implemented per-repository in
   * `userRepository.ts`/`enquiryRepository.ts`/`appointmentRepository.ts`
   * (each predates this generic version and is left unchanged, per this
   * project's established append-don't-replace convention — not
   * consolidated here, since touching those files is out of this slice's
   * scope). Named `nextLegacyIdGeneric` rather than `nextLegacyId`
   * specifically to avoid colliding with those existing per-repository
   * methods of the same short name (TypeScript's `noImplicitOverride`
   * would otherwise force every one of them to add an `override` keyword
   * merely because this slice introduced a same-named base method — a
   * ripple effect into unrelated files this slice does not touch). New
   * repositories built from M5-E onward should prefer this one over
   * adding another per-repository copy.
   */
  async nextLegacyIdGeneric(): Promise<number> {
    const highest = await this.collection
      .find({} as Filter<T>)
      .sort({ legacyId: -1 })
      .limit(1)
      .toArray();
    const currentMax = (highest[0] as { legacyId?: number } | undefined)?.legacyId ?? 0;
    return currentMax + 1;
  }
}
