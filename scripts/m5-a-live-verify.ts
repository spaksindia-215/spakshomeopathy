/**
 * M5-A (enquiry/appointment wiring) — ONE-TIME live Atlas verification,
 * NOT a permanent migration/seed script. Same self-cleaning discipline as
 * `scripts/m4-auth-live-verify.ts`/`scripts/m4-buyer-orders-live-verify.ts`.
 *
 * Proves `submitEnquiry`/`bookAppointment` (src/lib/services/) AND the new
 * `EnquiryRepository.nextLegacyId()`/`AppointmentRepository.nextLegacyId()`
 * work end-to-end against the REAL `spaks_dev` Atlas database — not just
 * the fake-Db unit tests. Both target collections already carry real
 * production-migrated data (enquiries: 16,386 rows; appointments: 33 rows,
 * per docs/M5-PREFLIGHT-AUDIT.md §2.5) — this script inserts one throwaway
 * document into each, spot-checks it, then deletes it, leaving both
 * collections' document counts unchanged.
 *
 * Sequence:
 *   1. Read current MAX(legacyId) / count for both collections (baseline).
 *   2. nextLegacyId() for enquiries, submitEnquiry() a throwaway enquiry,
 *      read it back, confirm shape (mobile always null — P-01).
 *   3. nextLegacyId() for appointments, bookAppointment() a throwaway
 *      appointment (including an intentionally-empty `age` to prove the
 *      no-validation/null-coercion path), read it back, confirm shape.
 *   4. Confirm nextLegacyId() advanced correctly for a SECOND call on each
 *      collection (proves it reads live state, not a cached value).
 *   5. Delete both throwaway documents — collections left in their
 *      original state (counts and MAX(legacyId) unchanged from baseline).
 */

import { config as loadDotenv } from 'dotenv';
import { resolve } from 'path';

loadDotenv({ path: resolve(__dirname, '../.env') });
loadDotenv({ path: resolve(__dirname, '../.env.local'), override: true });

import { assertNonProductionTarget } from '../src/lib/mongodb/environmentGuard';
import { getDb, closeMongoClient } from '../src/lib/mongodb/client';
import { COLLECTIONS } from '../src/lib/mongodb/collections';
import { EnquiryRepository } from '../src/lib/mongodb/repositories/enquiryRepository';
import { AppointmentRepository } from '../src/lib/mongodb/repositories/appointmentRepository';
import { submitEnquiry } from '../src/lib/services/enquiryService';
import { bookAppointment } from '../src/lib/services/appointmentService';

const MARKER = 'm5-a-live-verify-throwaway';

async function main() {
  assertNonProductionTarget();
  const db = await getDb();
  const enquiries = db.collection(COLLECTIONS.enquiries);
  const appointments = db.collection(COLLECTIONS.appointments);

  console.log('--- M5-A (enquiry/appointment) live verify against spaks_dev ---');

  // Clean up any leftover from a prior interrupted run.
  await enquiries.deleteMany({ email: `${MARKER}@example.invalid` });
  await appointments.deleteMany({ phone: MARKER });

  const enquiryCountBefore = await enquiries.countDocuments();
  const appointmentCountBefore = await appointments.countDocuments();
  console.log(
    `[baseline] enquiries: ${enquiryCountBefore}, appointments: ${appointmentCountBefore}`
  );

  const enquiryRepo = new EnquiryRepository(db);
  const appointmentRepo = new AppointmentRepository(db);

  console.log('[1/6] EnquiryRepository.nextLegacyId()...');
  const enquiryLegacyId = await enquiryRepo.nextLegacyId();
  console.log('  next enquiry legacyId:', enquiryLegacyId);

  console.log('[2/6] submitEnquiry() — a real, required-fields-only submission...');
  const enquiry = await submitEnquiry(db, {
    legacyId: enquiryLegacyId,
    name: 'M5-A Live Verify Throwaway',
    email: `${MARKER}@example.invalid`,
    subject: 'M5-A live verify',
    // message intentionally omitted — proves the optional-field path
  });
  console.log('  inserted:', JSON.stringify(enquiry));
  if (enquiry.mobile !== null) {
    throw new Error('P-01 regression: mobile should always be null, saveEnq never reads phone');
  }
  if (enquiry.message !== null) {
    throw new Error("message should be null when omitted, matching source's optional field");
  }

  const enquiryRead = await enquiryRepo.findOne({ legacyId: enquiryLegacyId });
  if (enquiryRead?.subject !== 'M5-A live verify') {
    throw new Error('submitEnquiry did not persist correctly, read-back mismatch');
  }
  console.log('  read-back confirmed.');

  console.log('[3/6] AppointmentRepository.nextLegacyId()...');
  const appointmentLegacyId = await appointmentRepo.nextLegacyId();
  console.log('  next appointment legacyId:', appointmentLegacyId);

  console.log('[4/6] bookAppointment() — including an intentionally-absent age...');
  const appointment = await bookAppointment(db, {
    legacyId: appointmentLegacyId,
    name: 'M5-A Live Verify Throwaway',
    // age intentionally omitted — proves the no-validation/null path
    gender: 'Male',
    phone: MARKER,
    appointmentDate: '2026-09-01',
    consultantHour: 'Morning',
  });
  console.log('  inserted:', JSON.stringify(appointment));
  if (appointment.age !== null) {
    throw new Error('age should be null when omitted — SaveAppointment has no validate() call');
  }

  const appointmentRead = await appointmentRepo.findOne({ legacyId: appointmentLegacyId });
  if (appointmentRead?.phone !== MARKER) {
    throw new Error('bookAppointment did not persist correctly, read-back mismatch');
  }
  console.log('  read-back confirmed.');

  console.log('[5/6] confirming nextLegacyId() advances on a second live call...');
  const enquiryLegacyId2 = await enquiryRepo.nextLegacyId();
  const appointmentLegacyId2 = await appointmentRepo.nextLegacyId();
  console.log(
    '  enquiry next-next legacyId:',
    enquiryLegacyId2,
    '(expect',
    enquiryLegacyId + 1,
    ')'
  );
  console.log(
    '  appointment next-next legacyId:',
    appointmentLegacyId2,
    '(expect',
    appointmentLegacyId + 1,
    ')'
  );
  if (enquiryLegacyId2 !== enquiryLegacyId + 1) {
    throw new Error('nextLegacyId() did not advance correctly for enquiries after a real insert');
  }
  if (appointmentLegacyId2 !== appointmentLegacyId + 1) {
    throw new Error(
      'nextLegacyId() did not advance correctly for appointments after a real insert'
    );
  }

  console.log('[6/6] deleting both throwaway documents...');
  const deletedEnquiry = await enquiries.deleteOne({ legacyId: enquiryLegacyId });
  const deletedAppointment = await appointments.deleteOne({ legacyId: appointmentLegacyId });
  console.log('  deletedEnquiry:', deletedEnquiry.deletedCount);
  console.log('  deletedAppointment:', deletedAppointment.deletedCount);

  const enquiryCountAfter = await enquiries.countDocuments();
  const appointmentCountAfter = await appointments.countDocuments();
  console.log(`[after] enquiries: ${enquiryCountAfter}, appointments: ${appointmentCountAfter}`);
  if (enquiryCountAfter !== enquiryCountBefore) {
    throw new Error('enquiries count changed — cleanup did not fully restore original state');
  }
  if (appointmentCountAfter !== appointmentCountBefore) {
    throw new Error('appointments count changed — cleanup did not fully restore original state');
  }

  console.log('--- DONE. spaks_dev.enquiries / spaks_dev.appointments left in original state. ---');
}

main()
  .catch((err) => {
    console.error('FAILED:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeMongoClient();
  });
