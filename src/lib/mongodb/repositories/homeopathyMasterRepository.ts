/**
 * `homeopathyMaster` (was `tbl_homeopathy`) data access — CR-006 Phase 4.
 *
 * GENUINELY NEW ADMIN SURFACE, NOT A MIGRATION: no Laravel controller
 * method ever wrote to `tbl_homeopathy` — it is populated once in the
 * original seed data, read on the public site (`HomeController.php`), and
 * used only as a read-only dropdown in `AdminController::EditPost` (a
 * blog-post tagging field). See `docs/CR-006-PHASE-4-PLAN.md` §0/§1 for
 * the full citation and the correction of this CR's own earlier,
 * mistaken belief that "Disease Category" CRUD (a DIFFERENT thing — the
 * `categories` collection's `type='N'` rows, already fully ported via
 * `CategoryRepository`/`cat-list`) was what was missing here.
 *
 * REUSES THE ALREADY-EXISTING SCHEMA/COLLECTION NAME:
 * `homeopathyMasterSchema` (`schemas/post.ts`) and
 * `COLLECTIONS.homeopathyMaster` both predate this phase (M3-A) — no new
 * schema, no new collection, no D-11 authorization needed. This file adds
 * only the repository class, following `CategoryRepository`'s exact
 * shape (the closest structural analog: same 6-column-ish flat schema,
 * same `status`/`name`/`slug`/`image` fields, no `updated_at` column).
 */

import type { Db } from 'mongodb';
import { ValidatedRepository } from './base';
import { COLLECTIONS } from '../collections';
import { homeopathyMasterSchema, type HomeopathyMaster } from '../schemas';

export class HomeopathyMasterRepository extends ValidatedRepository<HomeopathyMaster> {
  constructor(db: Db) {
    super(db, COLLECTIONS.homeopathyMaster, homeopathyMasterSchema);
  }

  /** New admin list ordering — `id DESC`, matching this codebase's own
   * convention for every other new-admin-list method
   * (`CategoryRepository.findAllDescending`, etc.), since there is no
   * source `ManageX`-equivalent query to mirror instead. */
  async findAllDescending(): Promise<HomeopathyMaster[]> {
    const docs = await this.find({});
    return [...docs].sort((a, b) => b.legacyId - a.legacyId);
  }

  async findByLegacyId(legacyId: number): Promise<HomeopathyMaster | null> {
    return this.findOne({ legacyId });
  }

  async insertHomeopathy(doc: HomeopathyMaster): Promise<HomeopathyMaster> {
    return this.insertOne(doc);
  }

  /** No `updatedAt` bump — `homeopathyMaster` has no `updated_at` column
   * in source (schema's own header), same as `categories`. */
  async updateHomeopathy(
    legacyId: number,
    fields: Partial<Omit<HomeopathyMaster, 'legacyId' | 'createdAt'>>
  ): Promise<void> {
    await this.updateOne({ legacyId }, fields);
  }
}
