/**
 * `posts` (was `tbl_post`) data access. See `schemas/post.ts`'s header for
 * the full P-04 (create-by-slug/edit-by-id asymmetry) and `homeopathyId`
 * naming context.
 */

import type { Db } from 'mongodb';
import { ValidatedRepository } from './base';
import { COLLECTIONS } from '../collections';
import { postSchema, type Post } from '../schemas';

export class PostRepository extends ValidatedRepository<Post> {
  constructor(db: Db) {
    super(db, COLLECTIONS.posts, postSchema);
  }

  /** Mirrors `AdminController::PostList` — `orderBy('post_title','ASC')`.
   * NOTE: sorted by TITLE, not id — unlike every other admin list this
   * project has built so far (all sort by id DESC). Verified directly
   * against `AdminController.php:770` this slice, not assumed to follow
   * the established pattern. Pagination (`paginate(20)`) NOT implemented
   * — same disclosed gap as `categories` (414 real rows, well past the
   * 20-per-page boundary). */
  async findAllByTitleAscending(): Promise<Post[]> {
    const docs = await this.find({});
    return [...docs].sort((a, b) => {
      const titleA = a.postTitle ?? '';
      const titleB = b.postTitle ?? '';
      return titleA.localeCompare(titleB);
    });
  }

  /** Mirrors `AdminController::EditPost` — `WHERE tbl_post.id = $post_id`. */
  async findByLegacyId(legacyId: number): Promise<Post | null> {
    return this.findOne({ legacyId });
  }

  /** Mirrors `AdminController::SavePost`'s insert. */
  async insertPost(doc: Post): Promise<Post> {
    return this.insertOne(doc);
  }

  /**
   * Mirrors `AdminController::UpdatePost`'s update
   * (`post_homeopathy`/`post_diseases`/`p_id`/`post_title`/`post_image`/
   * `post_desc`/`post_status`). `updatedAt` IS included as a valid field
   * here (unlike pincode/slider/blog-category/blogs) — `tbl_post.updated_at`
   * is `NOT NULL DEFAULT current_timestamp()` (confirmed,
   * `Database/db_newhomo.sql:32035-32046`) with the SAME "no ON UPDATE
   * clause" property as every other table, so this method's own type
   * signature still EXCLUDES it from what callers may pass — the FIX-004
   * precedent applies uniformly, not selectively; documented here for
   * completeness since this is the first table in this session with a
   * NOT NULL (not nullable) updated_at column, a cosmetic difference from
   * the others that does NOT change the ON-UPDATE-clause conclusion. */
  async updatePost(
    legacyId: number,
    fields: Partial<Omit<Post, 'legacyId' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    await this.updateOne({ legacyId }, fields as Partial<Post>);
  }

  /** Mirrors `AdminController::DestroyPost`'s delete. The image-cleanup
   * block in source is entirely commented out (dead) — see
   * `destroy-post/[post_id]/route.ts`'s header. */
  async deletePost(legacyId: number): Promise<void> {
    await this.deleteOne({ legacyId });
  }
}
