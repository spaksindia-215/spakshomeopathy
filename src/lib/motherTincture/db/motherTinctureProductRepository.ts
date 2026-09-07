/**
 * `motherTinctureProducts` collection data access.
 *
 * Extends `ValidatedRepository` from `@/lib/mongodb/repositories/base` —
 * same reuse rationale as `@/lib/herbs/db/herbProductRepository.ts`'s own
 * header: that class is generic CRUD infrastructure with no legacy-
 * migration-specific logic, so reusing it here does not violate the
 * parallel-model decision (only `src/lib/mongodb/collections.ts` and
 * `schemas/` — the legacy-table-traced registries — are avoided).
 */

import type { Db } from 'mongodb';
import { ValidatedRepository } from '@/lib/mongodb/repositories/base';
import { motherTinctureProductDocSchema, type MotherTinctureProductDoc } from './schema';

export const MOTHER_TINCTURE_COLLECTION = 'motherTinctureProducts';

export class MotherTinctureProductRepository extends ValidatedRepository<MotherTinctureProductDoc> {
  constructor(db: Db) {
    super(db, MOTHER_TINCTURE_COLLECTION, motherTinctureProductDocSchema);
  }

  async findAll(): Promise<MotherTinctureProductDoc[]> {
    return this.find({});
  }

  /** Insert-or-replace keyed by `legacyId` — this collection's synthetic
   * id namespace (see `./actions.ts`'s `nextSyntheticLegacyId` for the
   * numbering scheme). Used by the admin add form: every submission mints
   * a new synthetic `legacyId`, so this is effectively insert-only today,
   * but upsert keeps the shape consistent with `HerbProductRepository`
   * and leaves room for a future edit form. */
  async upsert(doc: MotherTinctureProductDoc): Promise<MotherTinctureProductDoc> {
    const validated = this.validate(doc);
    // `this.collection` is `protected` on ValidatedRepository — directly
    // reachable here since this class extends it.
    await this.collection.updateOne(
      { legacyId: validated.legacyId },
      { $set: validated },
      { upsert: true }
    );
    return validated;
  }

  async deleteByLegacyId(legacyId: number): Promise<void> {
    await this.collection.deleteOne({ legacyId });
  }
}
