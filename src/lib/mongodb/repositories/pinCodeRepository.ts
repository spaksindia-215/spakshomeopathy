/**
 * `pinCodes` data access.
 *
 * DR-03 RESOLVED (M5-E, 2026-09-04) — see
 * `docs/M3-OWNER-DECISION-RECORDS.md` DR-03 addendum and
 * `MIGRATION-CONTRACT.md` §9.3 Fix Register entry FIX-001. Owner selected
 * DR-03's Option 2: pincode admin CRUD is a formally Approved Fix — new
 * saves now succeed against this collection's real column shape
 * (`pincode`/`location`/`country`/`uid`/`status`, per `schemas/pinCode.ts`)
 * instead of artificially reproducing B-09's SQL-column-mismatch failure.
 * `insertPinCode` below is that approved fix's write path — it was already
 * correct-by-construction before this resolution (see the file's prior
 * header, preserved in git history / prior gate reports), and this
 * resolution is what makes using it for real admin saves authorized.
 */

import type { Db } from 'mongodb';
import { ValidatedRepository } from './base';
import { COLLECTIONS } from '../collections';
import { pinCodeSchema, type PinCode } from '../schemas';

export class PinCodeRepository extends ValidatedRepository<PinCode> {
  constructor(db: Db) {
    super(db, COLLECTIONS.pinCodes, pinCodeSchema);
  }

  /**
   * Mirrors `AdminController::PinCodeList` — `orderBy('id','desc')`.
   * Sort applied here (unlike `categoryRepository.findByType`'s
   * caller-sorts convention) since this is the ONLY caller of this
   * specific query and there is no ambiguity about the intended order.
   */
  async findAllDescending(): Promise<PinCode[]> {
    const docs = await this.find({});
    return [...docs].sort((a, b) => b.legacyId - a.legacyId);
  }

  /** Mirrors `AdminController::EditPinCode` — `WHERE id = $id`, no
   * column-mismatch defect (reads `id`, a real column, unlike the write
   * methods). */
  async findByLegacyId(legacyId: number): Promise<PinCode | null> {
    return this.findOne({ legacyId });
  }

  /**
   * DR-03 Option 2 write path (approved, FIX-001). Real-column insert —
   * see file header. `nextLegacyIdGeneric()` (inherited from `ValidatedRepository`,
   * added M5-E) supplies the new `legacyId`, continuing the same
   * `MAX(legacyId)+1` strategy this project uses everywhere else for new
   * documents.
   */
  async insertPinCode(doc: PinCode): Promise<PinCode> {
    return this.insertOne(doc);
  }

  /** DR-03 Option 2 write path (approved, FIX-001). Mirrors
   * `AdminController::UpdatePinCode`'s intent (update by id) against the
   * real column shape, not the broken write's column names. */
  async updatePinCode(
    legacyId: number,
    fields: Partial<Omit<PinCode, 'legacyId' | 'createdAt'>>
  ): Promise<void> {
    await this.updateOne({ legacyId }, fields as Partial<PinCode>);
  }

  /** Mirrors `AdminController::DestroyPinCode` — `WHERE id = $id`,
   * delete. No column-mismatch defect (B-09 only affects the two write
   * methods above, not delete, which never referenced the broken column
   * names in source either). */
  async deletePinCode(legacyId: number): Promise<void> {
    await this.deleteOne({ legacyId });
  }
}
