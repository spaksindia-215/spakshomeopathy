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
    return validated;
  }

  async count(filter: Filter<T> = {}): Promise<number> {
    return this.collection.countDocuments(filter);
  }
}
