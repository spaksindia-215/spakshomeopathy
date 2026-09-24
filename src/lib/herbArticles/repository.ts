/**
 * `herbArticles` collection data access. Extends `ValidatedRepository`,
 * same shape as `src/lib/diseases/repository.ts`.
 */

import type { Db } from 'mongodb';
import { ValidatedRepository } from '@/lib/mongodb/repositories/base';
import { herbArticleSchema, type HerbArticleDoc } from './schema';

export const HERB_ARTICLES_COLLECTION = 'herbArticles';

export class HerbArticleRepository extends ValidatedRepository<HerbArticleDoc> {
  constructor(db: Db) {
    super(db, HERB_ARTICLES_COLLECTION, herbArticleSchema);
  }

  async findAllDescending(): Promise<HerbArticleDoc[]> {
    const docs = await this.find({});
    return [...docs].sort((a, b) => b.legacyId - a.legacyId);
  }

  /** `status === 1` only — what `/herbs` and `/herbs/learn/[slug]` render. */
  async findActiveDescending(): Promise<HerbArticleDoc[]> {
    const docs = await this.findAllDescending();
    return docs.filter((doc) => doc.status === 1);
  }

  async findBySlug(slug: string): Promise<HerbArticleDoc | null> {
    return this.findOne({ slug });
  }

  async findByLegacyId(legacyId: number): Promise<HerbArticleDoc | null> {
    return this.findOne({ legacyId });
  }

  async insertArticle(doc: HerbArticleDoc): Promise<HerbArticleDoc> {
    return this.insertOne(doc);
  }

  async updateArticle(
    legacyId: number,
    fields: Partial<Omit<HerbArticleDoc, 'legacyId' | 'createdAt'>>
  ): Promise<void> {
    await this.updateOne({ legacyId }, fields as Partial<HerbArticleDoc>);
  }

  async deleteArticle(legacyId: number): Promise<void> {
    await this.deleteOne({ legacyId });
  }
}
