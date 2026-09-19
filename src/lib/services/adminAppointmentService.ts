/**
 * Admin appointment read operations — CR-006 Phase 3.
 *
 * MIGRATION, NOT NEW PRODUCT: mirrors `AdminController::ManageAppointment`
 * (AdminController.php:1371-1377), route `admin/appointment-list`
 * (M3 catalog row #163).
 *
 * READ-ONLY BY DESIGN, NOT BY OMISSION: source has no status-change route
 * for appointments at all (confirmed:
 * `docs/M3-APPLICATION-MAPPING.md` row #163 — "Read-only per blueprint (no
 * status-change route exists for appointments)"; `routes/admin.php`
 * confirmed to have no `update-appointment`/similar route). This file adds
 * no write method, matching that absence exactly — not a gap to fill.
 *
 * REUSES: `AppointmentRepository` (`appointmentRepository.ts`, built
 * M4-PREP/M5-A) — no new repository, no new collection, no new schema.
 */

import type { Db } from 'mongodb';
import { AppointmentRepository } from '../mongodb/repositories/appointmentRepository';
import type { Appointment } from '../mongodb/schemas';

/**
 * Mirrors `AdminController::ManageAppointment`
 * (AdminController.php:1371-1377): ALL `tbl_appointment` rows, ordered
 * `id DESC`, UNPAGINATED (same P-15 pattern as orders/payments — see
 * `adminOrderService.ts`'s header).
 */
export async function getAdminAppointmentsView(db: Db): Promise<Appointment[]> {
  const repo = new AppointmentRepository(db);
  const appointments = await repo.find({});
  return [...appointments].sort((a, b) => b.legacyId - a.legacyId);
}
