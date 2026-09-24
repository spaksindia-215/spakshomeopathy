/**
 * `diseases` collection data access. Extends `ValidatedRepository`, same
 * as every other repository in this codebase. Lives in its own module
 * tree (not `src/lib/mongodb/schemas/`/`collections.ts`) for the same
 * reason `src/lib/pages/repository.ts` and `src/lib/settings/repository.ts`
 * do — this collection has no legacy table to trace to.
 */

import type { Db } from 'mongodb';
import { ValidatedRepository } from '@/lib/mongodb/repositories/base';
import { diseaseSchema, type Disease } from './schema';

export const DISEASES_COLLECTION = 'diseases';

export class DiseaseRepository extends ValidatedRepository<Disease> {
  constructor(db: Db) {
    super(db, DISEASES_COLLECTION, diseaseSchema);
  }

  /** Newest-first, same list ordering convention as `SliderRepository`. */
  async findAllDescending(): Promise<Disease[]> {
    const docs = await this.find({});
    return [...docs].sort((a, b) => b.legacyId - a.legacyId);
  }

  /** `status === 1` only — what the public `/all-diseases` page renders. */
  async findActiveDescending(): Promise<Disease[]> {
    const docs = await this.findAllDescending();
    return docs.filter((doc) => doc.status === 1);
  }

  async findByLegacyId(legacyId: number): Promise<Disease | null> {
    return this.findOne({ legacyId });
  }

  async insertDisease(doc: Disease): Promise<Disease> {
    return this.insertOne(doc);
  }

  async updateDisease(
    legacyId: number,
    fields: Partial<Omit<Disease, 'legacyId' | 'createdAt'>>
  ): Promise<void> {
    await this.updateOne({ legacyId }, fields as Partial<Disease>);
  }

  async deleteDisease(legacyId: number): Promise<void> {
    await this.deleteOne({ legacyId });
  }
}
