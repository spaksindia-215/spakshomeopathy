/**
 * M4 authentication — ONE-TIME live Atlas verification, NOT a permanent
 * migration/seed script.
 *
 * Owner-authorized (2026-08-21) to prove `registerBuyer`/`login`
 * (src/lib/services/authService.ts) work end-to-end against the REAL
 * `spaks_dev` Atlas database, not just the fake-Db unit tests. EXTENDED
 * (buyer profile/password-change slice) to also exercise
 * `updateProfile`/`updatePassword` (src/lib/services/profileService.ts)
 * the same way — real writes against the same throwaway account, cleaned
 * up in the same final step.
 *
 * Sequence:
 *   1. registerBuyer() a throwaway test account into `users` (a REAL
 *      write, guarded by the same environmentGuard/getDb production
 *      checks every other write path in this repo uses, unmodified).
 *   2. login() with that exact account, confirm the full utype=3/
 *      backuser=seller_buyer/empty-cart branch resolves to `myaccount`.
 *   3. Read the record back directly to spot-check legacyId/status/
 *      buyerProfile shape.
 *   4. updateProfile() real new field values, read back and confirm they
 *      persisted under the embedded `buyerProfile`.
 *   5. updatePassword() with the WRONG old password (must be rejected,
 *      original hash must survive unchanged), then with the CORRECT old
 *      password (must succeed), then login() with the NEW password to
 *      prove the persisted hash is real and usable, not just "different."
 *   6. DELETE the test document — this script does not leave permanent
 *      data behind. (deleteOne is used only here, not exposed anywhere
 *      in application code — UserRepository has no delete method.)
 *
 * Uses a fixed, clearly-marked test email so a second run is idempotent
 * (cleans up any prior leftover before inserting).
 */

import { config as loadDotenv } from 'dotenv';
import { resolve } from 'path';

loadDotenv({ path: resolve(__dirname, '../.env') });
loadDotenv({ path: resolve(__dirname, '../.env.local'), override: true });

import { assertNonProductionTarget } from '../src/lib/mongodb/environmentGuard';
import { getDb, closeMongoClient } from '../src/lib/mongodb/client';
import { COLLECTIONS } from '../src/lib/mongodb/collections';
import { registerBuyer, login } from '../src/lib/services/authService';
import { updateProfile, updatePassword } from '../src/lib/services/profileService';

const TEST_EMAIL = 'm4-auth-live-verify-throwaway@example.invalid';

async function main() {
  assertNonProductionTarget();
  const db = await getDb();
  const users = db.collection(COLLECTIONS.users);

  console.log('--- M4 auth live verify against spaks_dev ---');

  // Clean up any leftover from a prior interrupted run.
  await users.deleteMany({ email: TEST_EMAIL });

  console.log('[1/6] registerBuyer()...');
  const registerResult = await registerBuyer(db, {
    name: 'M4 Live Verify Throwaway',
    email: TEST_EMAIL,
    mobile: '0000000000',
    password: 'throwaway-test-password-123',
  });
  console.log('  registerResult:', registerResult);
  if (!registerResult.ok) throw new Error('registerBuyer failed unexpectedly');

  console.log('[2/6] login() with the just-registered account...');
  const loginResult = await login(db, {
    email: TEST_EMAIL,
    password: 'throwaway-test-password-123',
    backuser: 'seller_buyer',
    cartTotal: 0,
  });
  console.log('  loginResult:', JSON.stringify(loginResult));
  if (!('user' in loginResult)) throw new Error('login failed unexpectedly');
  if (loginResult.redirect.kind !== 'myaccount') {
    throw new Error(`expected redirect 'myaccount', got ${loginResult.redirect.kind}`);
  }

  console.log('[2b/6] login() with WRONG password (must fail)...');
  const wrongPasswordResult = await login(db, {
    email: TEST_EMAIL,
    password: 'not-the-right-password',
    backuser: 'seller_buyer',
    cartTotal: 0,
  });
  console.log('  wrongPasswordResult:', JSON.stringify(wrongPasswordResult));
  if (wrongPasswordResult.redirect !== 'wrong-credentials') {
    throw new Error('wrong password unexpectedly succeeded');
  }

  console.log('[3/6] reading the raw document back for a shape spot-check...');
  const raw = await users.findOne({ email: TEST_EMAIL });
  console.log('  legacyId:', raw?.legacyId, '(type:', typeof raw?.legacyId, ')');
  console.log('  utype:', raw?.utype, 'status:', raw?.status);
  console.log('  password starts with $2:', String(raw?.password).startsWith('$2'));
  console.log('  buyerProfile present:', raw?.buyerProfile !== undefined);
  const legacyId: number = raw!.legacyId;

  console.log('[4/6] updateProfile() with real new values...');
  await updateProfile(db, legacyId, {
    name: 'M4 Live Verify Throwaway (Updated)',
    mobile: '1111111111',
    pinCode: '110001',
    fullAddress: 'Live Verify Test Address',
    houseNo: 'H-1',
    landmark: 'Near Live Verify',
  });
  const afterProfileUpdate = await users.findOne({ email: TEST_EMAIL });
  console.log('  name:', afterProfileUpdate?.name);
  console.log('  mobile:', afterProfileUpdate?.mobile);
  console.log('  buyerProfile.pinCode:', afterProfileUpdate?.buyerProfile?.pinCode);
  if (afterProfileUpdate?.name !== 'M4 Live Verify Throwaway (Updated)') {
    throw new Error('updateProfile did not persist the new name');
  }
  if (afterProfileUpdate?.buyerProfile?.pinCode !== '110001') {
    throw new Error('updateProfile did not persist buyerProfile.pinCode');
  }

  console.log('[5/6] updatePassword() — wrong old password (must be rejected)...');
  const wrongOldPwResult = await updatePassword(db, legacyId, {
    oldPassword: 'not-the-real-old-password',
    newPassword: 'brand-new-live-verify-password-456',
    passwordConfirmation: 'brand-new-live-verify-password-456',
  });
  console.log('  result:', JSON.stringify(wrongOldPwResult));
  if (wrongOldPwResult.ok || wrongOldPwResult.reason !== 'old-password-incorrect') {
    throw new Error('updatePassword unexpectedly accepted a wrong old password');
  }
  const unchangedRaw = await users.findOne({ email: TEST_EMAIL });
  if (unchangedRaw?.password !== raw?.password) {
    throw new Error('password hash changed even though the wrong-old-password branch fired');
  }

  console.log('  updatePassword() — correct old password (must succeed)...');
  const correctPwResult = await updatePassword(db, legacyId, {
    oldPassword: 'throwaway-test-password-123',
    newPassword: 'brand-new-live-verify-password-456',
    passwordConfirmation: 'brand-new-live-verify-password-456',
  });
  console.log('  result:', JSON.stringify(correctPwResult));
  if (!correctPwResult.ok)
    throw new Error('updatePassword unexpectedly failed with correct old password');

  console.log('  login() with the NEW password (proves the persisted hash is real and usable)...');
  const loginWithNewPw = await login(db, {
    email: TEST_EMAIL,
    password: 'brand-new-live-verify-password-456',
    backuser: 'seller_buyer',
    cartTotal: 0,
  });
  if (!('user' in loginWithNewPw)) {
    throw new Error('login with the new password unexpectedly failed');
  }
  console.log('  login with new password succeeded, redirect:', loginWithNewPw.redirect.kind);

  console.log('  login() with the OLD password (must now fail — hash was replaced)...');
  const loginWithOldPw = await login(db, {
    email: TEST_EMAIL,
    password: 'throwaway-test-password-123',
    backuser: 'seller_buyer',
    cartTotal: 0,
  });
  if (loginWithOldPw.redirect !== 'wrong-credentials') {
    throw new Error('login with the OLD (now-replaced) password unexpectedly succeeded');
  }
  console.log('  confirmed: old password no longer works.');

  console.log('[6/6] deleting the throwaway test document...');
  const deleteResult = await users.deleteOne({ email: TEST_EMAIL });
  console.log('  deletedCount:', deleteResult.deletedCount);

  console.log('--- DONE. spaks_dev.users left in its original state. ---');
}

main()
  .catch((err) => {
    console.error('FAILED:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeMongoClient();
  });
