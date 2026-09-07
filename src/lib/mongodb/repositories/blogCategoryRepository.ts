/**
 * `blogCategories` data access. See `schemas/post.ts`'s header for why
 * blog-related schemas live alongside `posts` in one file.
 */

import type { Db } from 'mongodb';
import { ValidatedRepository } from './base';
import { COLLECTIONS } from '../collections';
import { blogCategorySchema, type BlogCategory } from '../schemas';

export class BlogCategoryRepository extends ValidatedRepository<BlogCategory> {
  constructor(db: Db) {
    super(db, COLLECTIONS.blogCategories, blogCategorySchema);
  }

  /** Mirrors `AdminController::BlogCategoryList` — `orderBy('id','desc')`. */
  async findAllDescending(): Promise<BlogCategory[]> {
    const docs = await this.find({});
    return [...docs].sort((a, b) => b.legacyId - a.legacyId);
  }

  /** Mirrors `AdminController::EditBlogCategory` — `WHERE id = $id`. */
  async findByLegacyId(legacyId: number): Promise<BlogCategory | null> {
    return this.findOne({ legacyId });
  }

  /** Mirrors `AdminController::SaveBlogCategory`'s insert. */
  async insertBlogCategory(doc: BlogCategory): Promise<BlogCategory> {
    return this.insertOne(doc);
  }

  /**
   * Mirrors `AdminController::UpdateBlogCategory`'s update. `updatedAt` is
   * NOT part of the fields this method's callers should ever pass — see
   * `update-blog-category/route.ts`'s FIX-004 note (this table's
   * `updated_at` has no `ON UPDATE current_timestamp()` clause and
   * source's raw `update([...])` call never sets it either).
   */
  async updateBlogCategory(
    legacyId: number,
    fields: Partial<Omit<BlogCategory, 'legacyId' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    await this.updateOne({ legacyId }, fields as Partial<BlogCategory>);
  }

  /** Mirrors `AdminController::DestroyBlogCategory`'s delete. */
  async deleteBlogCategory(legacyId: number): Promise<void> {
    await this.deleteOne({ legacyId });
  }
}
