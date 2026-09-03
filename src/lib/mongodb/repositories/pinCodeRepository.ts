/**
 * `pinCodes` data access.
 *
 * DR-03 (B-09 reproduction mechanism) IS NOT YET APPROVED — see
 * docs/M3-OWNER-DECISION-RECORDS.md DR-03. This repository intentionally
 * implements NEITHER of DR-03's two options. `insertPinCode` below
 * performs a plain, successful write against the collection's real shape
 * (schemas/pinCode.ts) — it does NOT yet decide whether to artificially
 * reject writes (DR-03 Option 1, reproducing B-09's failure) or to simply
 * let this correct-by-construction write path stand as the de facto fix
 * (DR-03 Option 2).
 *
 * THIS IS A DELIBERATE GAP, NOT AN OVERSIGHT: implementing either option
 * without the owner's decision would be exactly the kind of silent choice
 * DR-03 exists to prevent. When DR-03 is resolved, this file is where that
 * decision gets implemented — either by adding a rejection check (Option
 * 1) or by leaving this method as-is with a note that it constitutes the
 * approved fix (Option 2, requiring a formal Approved Fix Register entry
 * per contract §9.3).
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
   * See file header — DR-03 NOT YET APPLIED. This is a plain, working
   * insert against the collection's real shape. Do not treat its mere
   * existence as DR-03 having been decided in favor of Option 2 — it is
   * infrastructure that either option will build on top of, not a
   * decision made by this file.
   */
  async insertPinCode(doc: PinCode): Promise<PinCode> {
    return this.insertOne(doc);
  }
}
