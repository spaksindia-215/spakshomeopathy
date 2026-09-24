/**
 * `cosmeticsProducts` collection data access.
 *
 * Extends `ValidatedRepository` from `@/lib/mongodb/repositories/base` —
 * same reuse rationale as `@/lib/motherTincture/db/motherTinctureProductRepository.ts`'s
 * own header.
 */

import type { Db } from 'mongodb';
import { ValidatedRepository } from '@/lib/mongodb/repositories/base';
import { cosmeticsProductDocSchema, type CosmeticsProductDoc } from './schema';

export const COSMETICS_COLLECTION = 'cosmeticsProducts';

export class CosmeticsProductRepository extends ValidatedRepository<CosmeticsProductDoc> {
  constructor(db: Db) {
    super(db, COSMETICS_COLLECTION, cosmeticsProductDocSchema);
  }

  async findAll(): Promise<CosmeticsProductDoc[]> {
    return this.find({});
  }

  async findByLegacyId(legacyId: number): Promise<CosmeticsProductDoc | null> {
    return this.findOne({ legacyId });
  }

  /** Insert-or-replace keyed by `legacyId` — same shape as
   * `MotherTinctureProductRepository.upsert`. Used by both the admin add
   * form (new synthetic `legacyId` each time) and the edit form (same
   * `legacyId`, updated fields). */
  async upsert(doc: CosmeticsProductDoc): Promise<CosmeticsProductDoc> {
    const validated = this.validate(doc);
    await this.collection.updateOne(
      { legacyId: validated.legacyId },
      { $set: validated },
      { upsert: true }
    );
    await this.logMutation('update', validated.legacyId);
    return validated;
  }

  async deleteByLegacyId(legacyId: number): Promise<void> {
    await this.collection.deleteOne({ legacyId });
    await this.logMutation('delete', legacyId);
  }
}
