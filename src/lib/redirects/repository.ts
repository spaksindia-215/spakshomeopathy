/**
 * `redirects` collection data access — CR-006 Phase 8.
 *
 * Extends `ValidatedRepository` — same reuse rationale as every other
 * repository in this codebase (genuinely generic infrastructure). Uses
 * the main application database (via `@/lib/mongodb/client`'s
 * `getDb()`), same as `src/lib/pages/repository.ts` — a general admin
 * CMS feature, unrelated to the Herbs Store's isolated connection.
 */

import type { Db } from 'mongodb';
import { ValidatedRepository } from '@/lib/mongodb/repositories/base';
import { redirectDocSchema, type RedirectDoc } from './schema';

export const REDIRECTS_COLLECTION = 'redirects';

export class RedirectRepository extends ValidatedRepository<RedirectDoc> {
  constructor(db: Db) {
    super(db, REDIRECTS_COLLECTION, redirectDocSchema);
  }

  async findById(id: string): Promise<RedirectDoc | null> {
    return this.findOne({ id });
  }

  async findByFromPath(fromPath: string): Promise<RedirectDoc | null> {
    return this.findOne({ fromPath });
  }

  async findAll(): Promise<RedirectDoc[]> {
    return this.find({});
  }

  /** Insert-or-replace keyed by `id` (this collection's own identifier —
   * no legacy row to trace to), same shape as `HerbProductRepository.upsert`.
   * Calls `this.logMutation()` directly (CR-006 Phase 9) since this
   * method bypasses the base class's own instrumented `updateOne` (an
   * upsert-by-own-key, which that method doesn't support). */
  async upsert(doc: RedirectDoc): Promise<RedirectDoc> {
    const validated = this.validate(doc);
    await this.collection.updateOne({ id: validated.id }, { $set: validated }, { upsert: true });
    await this.logMutation('update', validated.id);
    return validated;
  }

  async deleteById(id: string): Promise<void> {
    await this.collection.deleteOne({ id });
    await this.logMutation('delete', id);
  }
}
