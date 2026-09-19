/**
 * `pages` collection data access — CR-006 Phase 7.
 *
 * Extends `ValidatedRepository` — same reuse rationale as every other
 * repository in this codebase (genuinely generic infrastructure). Uses
 * the main application database (via `@/lib/mongodb/client`'s
 * `getDb()`), NOT the Herbs Store's isolated `<db>_herbs` connection —
 * this is a general admin CMS feature, unrelated to the herbs parallel
 * model.
 */

import type { Db } from 'mongodb';
import { ValidatedRepository } from '@/lib/mongodb/repositories/base';
import { pageDocSchema, type PageDoc, type PageSlug } from './schema';

export const PAGES_COLLECTION = 'pages';

export class PageRepository extends ValidatedRepository<PageDoc> {
  constructor(db: Db) {
    super(db, PAGES_COLLECTION, pageDocSchema);
  }

  async findBySlug(slug: PageSlug): Promise<PageDoc | null> {
    return this.findOne({ slug });
  }

  async findAll(): Promise<PageDoc[]> {
    return this.find({});
  }

  /** Insert-or-replace keyed by `slug` (this collection's own
   * identifier — no legacy row to trace to, mirrors
   * `HerbProductRepository.upsert`'s upsert-by-own-id shape). Calls
   * `this.logMutation()` directly (CR-006 Phase 9) since this bypasses
   * the base class's own instrumented `updateOne`. */
  async upsert(doc: PageDoc): Promise<PageDoc> {
    const validated = this.validate(doc);
    await this.collection.updateOne({ slug: validated.slug }, { $set: validated }, { upsert: true });
    await this.logMutation('update', validated.slug);
    return validated;
  }
}
