/**
 * `herbProducts` collection data access.
 *
 * Extends `ValidatedRepository` from `@/lib/mongodb/repositories/base` —
 * that class is genuinely generic infrastructure (Zod-validated CRUD over
 * any `Db`/collection/schema triple, with no legacy-migration-specific
 * logic in it), so reusing it here is "reuse existing... database
 * abstractions" (original brief §46), not a violation of the parallel-
 * model decision (CR-003 §10.5) — only `src/lib/mongodb/collections.ts`
 * and `schemas/` (the legacy-table-traced registries) are avoided, not
 * every file under `src/lib/mongodb/`.
 */

import type { Db } from 'mongodb';
import { ValidatedRepository } from '@/lib/mongodb/repositories/base';
import { herbProductDocSchema, type HerbProductDoc } from './schema';

export const HERBS_COLLECTION = 'herbProducts';

export class HerbProductRepository extends ValidatedRepository<HerbProductDoc> {
  constructor(db: Db) {
    super(db, HERBS_COLLECTION, herbProductDocSchema);
  }

  async findBySlug(slug: string): Promise<HerbProductDoc | null> {
    return this.findOne({ slug });
  }

  async findAll(): Promise<HerbProductDoc[]> {
    return this.find({});
  }

  /** Insert-or-replace keyed by `id` (this collection's own identifier —
   * NOT `legacyId`; there is no legacy row for a Herbs Store product to
   * trace to, so `ValidatedRepository.upsertByLegacyId` does not apply
   * here). Used by the admin add/edit forms: add creates a new `id`,
   * edit reuses the existing one. */
  async upsert(doc: HerbProductDoc): Promise<HerbProductDoc> {
    const validated = this.validate(doc);
    // `this.collection` is `protected` on ValidatedRepository — directly
    // reachable here since this class extends it.
    await this.collection.updateOne({ id: validated.id }, { $set: validated }, { upsert: true });
    return validated;
  }

  async deleteById(id: string): Promise<void> {
    await this.collection.deleteOne({ id });
  }
}
