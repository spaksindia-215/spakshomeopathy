/**
 * `appointments` data access.
 *
 * Added M4-PREP (docs/M4-PREPARATION.md) — this collection had a schema
 * (schemas/appointment.ts) since M3-A but no repository class, per
 * repositories/index.ts's own note that adding one is "mechanical when a
 * later phase needs it." This phase needs it for `appointmentService.ts`'s
 * `bookAppointment`, mirroring `HomeController@SaveAppointment`
 * (public_html/app/Http/Controllers/HomeController.php:829-838).
 *
 * No extra query methods beyond the inherited `insertOne`/`find`/`findOne`
 * — the only source operation against this table is a single
 * `DB::table('tbl_appointment')->insert(...)` (HomeController.php:836).
 * There is no admin-side read/list flow in scope for this phase (admin
 * migration is explicitly deferred — see docs/M4-PREPARATION.md), so no
 * `find`-wrapping convenience method is added speculatively.
 *
 * M5-A: added `nextLegacyId()` — resolves `appointmentService.ts`'s own
 * documented open dependency, same live `MAX(legacyId) + 1` strategy as
 * `UserRepository.nextLegacyId()` / `EnquiryRepository.nextLegacyId()`, not
 * a new pattern invented for this collection.
 */

import type { Db } from 'mongodb';
import { ValidatedRepository } from './base';
import { COLLECTIONS } from '../collections';
import { appointmentSchema, type Appointment } from '../schemas';

export class AppointmentRepository extends ValidatedRepository<Appointment> {
  constructor(db: Db) {
    super(db, COLLECTIONS.appointments, appointmentSchema);
  }

  /**
   * Live `MAX(legacyId) + 1` against the actual collection — same strategy,
   * same disclosed race condition, same non-reuse of Mongo's `_id`, per
   * `UserRepository.nextLegacyId()`'s established precedent.
   */
  async nextLegacyId(): Promise<number> {
    const highest = await this.collection.find({}).sort({ legacyId: -1 }).limit(1).toArray();
    const currentMax = highest[0]?.legacyId ?? 0;
    return currentMax + 1;
  }
}
