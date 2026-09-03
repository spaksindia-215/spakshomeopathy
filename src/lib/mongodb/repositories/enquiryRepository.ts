/**
 * `enquiries` data access.
 *
 * Added M4-PREP (docs/M4-PREPARATION.md) — this collection had a schema
 * (schemas/enquiry.ts) since M3-A but no repository class, per
 * repositories/index.ts's own note that adding one is "mechanical when a
 * later phase needs it." This phase needs it for `enquiryService.ts`'s
 * `submitEnquiry`, mirroring `HomeController@saveEnq`
 * (public_html/app/Http/Controllers/HomeController.php:316-342).
 *
 * No extra query methods beyond the inherited `insertOne`/`find`/`findOne`
 * — the only source operation against this table is a single
 * `DB::table('enquiries')->insert(...)` (HomeController.php:329). There is
 * no admin-side read/list flow in scope for this phase (admin migration is
 * explicitly deferred — see docs/M4-PREPARATION.md), so no `find`-wrapping
 * convenience method is added speculatively.
 *
 * M5-A: added `nextLegacyId()` — resolves `enquiryService.ts`'s own
 * documented open dependency (a new document's `legacyId` was previously a
 * REQUIRED caller-supplied parameter with no established source of that
 * value). Uses the exact same live `MAX(legacyId) + 1` strategy
 * `UserRepository.nextLegacyId()` already established and had owner
 * scrutiny on (docs/GATE-REPORT-M4-AUTH.md §5) — not a new pattern invented
 * for this collection.
 */

import type { Db } from 'mongodb';
import { ValidatedRepository } from './base';
import { COLLECTIONS } from '../collections';
import { enquirySchema, type Enquiry } from '../schemas';

export class EnquiryRepository extends ValidatedRepository<Enquiry> {
  constructor(db: Db) {
    super(db, COLLECTIONS.enquiries, enquirySchema);
  }

  /**
   * Live `MAX(legacyId) + 1` against the actual collection — same strategy,
   * same disclosed race condition (two concurrent submissions could compute
   * the same next value; acceptable for this milestone's traffic profile,
   * per `UserRepository.nextLegacyId()`'s own precedent), same non-reuse of
   * Mongo's `_id`.
   */
  async nextLegacyId(): Promise<number> {
    const highest = await this.collection.find({}).sort({ legacyId: -1 }).limit(1).toArray();
    const currentMax = highest[0]?.legacyId ?? 0;
    return currentMax + 1;
  }
}
