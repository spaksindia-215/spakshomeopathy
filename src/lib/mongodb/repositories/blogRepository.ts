/**
 * `blogs` data access. See `schemas/post.ts`'s header for why blog-related
 * schemas live alongside `posts` in one file.
 */

import type { Db } from 'mongodb';
import { ValidatedRepository } from './base';
import { COLLECTIONS } from '../collections';
import { blogSchema, type Blog } from '../schemas';

export class BlogRepository extends ValidatedRepository<Blog> {
  constructor(db: Db) {
    super(db, COLLECTIONS.blogs, blogSchema);
  }

  /** Mirrors `AdminController::BlogList` — `orderBy('id','desc')`. */
  async findAllDescending(): Promise<Blog[]> {
    const docs = await this.find({});
    return [...docs].sort((a, b) => b.legacyId - a.legacyId);
  }

  /** Mirrors `AdminController::EditBlog` — `WHERE id = $id`. */
  async findByLegacyId(legacyId: number): Promise<Blog | null> {
    return this.findOne({ legacyId });
  }

  /** Mirrors `AdminController::SaveBlog`'s insert. */
  async insertBlog(doc: Blog): Promise<Blog> {
    return this.insertOne(doc);
  }

  /**
   * Mirrors `AdminController::UpdateBlog`'s update. `updatedAt` is NOT
   * part of this signature — same FIX-004 reasoning as pinCode/slider,
   * confirmed for this table too (see `update-blog/route.ts`'s header for
   * the direct schema citation).
   */
  async updateBlog(
    legacyId: number,
    fields: Partial<Omit<Blog, 'legacyId' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    await this.updateOne({ legacyId }, fields as Partial<Blog>);
  }

  /** Mirrors `AdminController::DestroyBlog`'s delete. */
  async deleteBlog(legacyId: number): Promise<void> {
    await this.deleteOne({ legacyId });
  }
}
