/**
 * `wellnessCategories` collection data access — CR-006 Phase 6.
 *
 * Extends `ValidatedRepository` — same reuse rationale as
 * `HerbProductRepository`'s own header (genuinely generic infrastructure,
 * not legacy-migration-specific).
 */

import type { Db } from 'mongodb';
import { ValidatedRepository } from '@/lib/mongodb/repositories/base';
import { wellnessCategoryDocSchema, type WellnessCategoryDoc } from './wellnessCategorySchema';

export const WELLNESS_CATEGORIES_COLLECTION = 'wellnessCategories';

export class WellnessCategoryRepository extends ValidatedRepository<WellnessCategoryDoc> {
  constructor(db: Db) {
    super(db, WELLNESS_CATEGORIES_COLLECTION, wellnessCategoryDocSchema);
  }

  async findByKey(key: string): Promise<WellnessCategoryDoc | null> {
    return this.findOne({ key });
  }

  async findAll(): Promise<WellnessCategoryDoc[]> {
    const docs = await this.find({});
    return [...docs].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /** Public/admin-picker read — excludes soft-deleted ('hidden') rows. */
  async findAllActive(): Promise<WellnessCategoryDoc[]> {
    const docs = await this.findAll();
    return docs.filter((d) => d.status === 'active');
  }

  /** Insert-or-replace keyed by `key` (this collection's own identifier —
   * no legacy row to trace to, mirrors `HerbProductRepository.upsert`'s
   * upsert-by-own-id shape rather than `upsertByLegacyId`). Calls
   * `this.logMutation()` directly (CR-006 Phase 9) since this bypasses
   * the base class's own instrumented `updateOne`. */
  async upsert(doc: WellnessCategoryDoc): Promise<WellnessCategoryDoc> {
    const validated = this.validate(doc);
    await this.collection.updateOne({ key: validated.key }, { $set: validated }, { upsert: true });
    await this.logMutation('update', validated.key);
    return validated;
  }

  /** Soft delete — sets `status: 'hidden'` rather than removing the
   * document, so existing herb documents referencing this `key` in their
   * `wellnessCategories` array don't dangle (Phase 6 plan §5/§7.2). Uses
   * `this.updateOne()` (the base class's own instrumented method, not a
   * direct `this.collection` call) — already audit-logged, no change
   * needed here. */
  async hide(key: string): Promise<void> {
    await this.updateOne({ key }, { status: 'hidden', updatedAt: new Date().toISOString() });
  }

  /** Calls `this.logMutation()` directly (CR-006 Phase 9) since this
   * bypasses the base class's own instrumented `deleteOne`. */
  async deleteByKey(key: string): Promise<void> {
    await this.collection.deleteOne({ key });
    await this.logMutation('delete', key);
  }
}
