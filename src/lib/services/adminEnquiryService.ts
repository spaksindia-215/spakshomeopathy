/**
 * Admin enquiry read/delete operations.
 *
 * MIGRATION, NOT NEW PRODUCT: mirrors `AdminController::getEnquiry`,
 * `ViewEnquiry`, `DestroyEnq` (AdminController.php:1275-1286), routes
 * `admin/enquires-list`, `admin/view-enquiry/{id}`, `admin/destroy-enquiry/{id}`.
 *
 * REUSES: `EnquiryRepository` (`enquiryRepository.ts`) — no new
 * repository, no new collection, no new schema.
 */

import type { Db } from 'mongodb';
import { EnquiryRepository } from '../mongodb/repositories/enquiryRepository';
import type { Enquiry } from '../mongodb/schemas';

/**
 * Mirrors `AdminController::getEnquiry`: ALL `enquiries` rows, ordered
 * `id DESC`, UNPAGINATED (same pattern as `getAdminAppointmentsView`).
 */
export async function getAdminEnquiriesView(db: Db): Promise<Enquiry[]> {
  const repo = new EnquiryRepository(db);
  const enquiries = await repo.find({});
  return [...enquiries].sort((a, b) => b.legacyId - a.legacyId);
}

/** Mirrors `AdminController::ViewEnquiry`: single row by legacyId. */
export async function getAdminEnquiryByLegacyId(
  db: Db,
  legacyId: number
): Promise<Enquiry | null> {
  const repo = new EnquiryRepository(db);
  return repo.findOne({ legacyId });
}

/** Mirrors `AdminController::DestroyEnq`: delete by legacyId. */
export async function deleteAdminEnquiry(db: Db, legacyId: number): Promise<void> {
  const repo = new EnquiryRepository(db);
  await repo.deleteOne({ legacyId });
}
