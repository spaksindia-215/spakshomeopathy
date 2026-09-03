/**
 * Buyer profile / password-change service.
 *
 * Mirrors `BuyerController@UpdateProfile` and `BuyerController@UpdatePassword`
 * (`public_html/app/Http/Controllers/BuyerController.php:49-66` and
 * `:117-150`) — the ONLY two write actions built in this slice. See
 * `docs/GATE-REPORT-M4-AUTH.md` ADDENDUM 4 for why `manage-orders`,
 * `view-order` (already-catalogued Broken, B-12), and `cancel-order` are
 * explicitly NOT built here.
 *
 * Both functions take the buyer's `legacyId` as an explicit parameter
 * rather than reading a session internally — keeps this service testable
 * with a plain fake `Db` (matching every other service in
 * `src/lib/services/`) and keeps session handling exclusively the route/
 * Server-Action layer's job, same separation as `authService.ts`.
 */

import type { Db } from 'mongodb';
import { UserRepository } from '../mongodb/repositories/userRepository';
import { verifyPassword, hashPassword } from '../auth/password';

export interface UpdateProfileInput {
  name: string;
  mobile: string;
  pinCode: string;
  fullAddress: string;
  houseNo: string;
  landmark: string;
}

/**
 * Mirrors `UpdateProfile` exactly (`BuyerController.php:49-66`): NO
 * validation of any kind in source (no `$request->validate([...])` call
 * at all) — every field is written as-is, including empty strings.
 * Reproduced faithfully: this function does not add validation Laravel
 * itself doesn't have, even though the Blade form marks these fields
 * `required` client-side only (HTML5 `required`, no server-side
 * enforcement in source — confirmed by reading `UpdateProfile`'s full
 * body, no `$request->validate` call present).
 */
export async function updateProfile(
  db: Db,
  legacyId: number,
  input: UpdateProfileInput
): Promise<void> {
  const users = new UserRepository(db);
  await users.updateProfileByLegacyId(legacyId, {
    name: input.name,
    mobile: input.mobile || null,
    pinCode: input.pinCode || null,
    fullAddress: input.fullAddress || null,
    houseNo: input.houseNo || null,
    landmark: input.landmark || null,
  });
}

export interface UpdatePasswordInput {
  oldPassword: string;
  newPassword: string;
  passwordConfirmation: string;
}

export type UpdatePasswordResult =
  | { ok: true }
  | { ok: false; reason: 'validation'; fields: string[] }
  | { ok: false; reason: 'confirmation-mismatch' }
  | { ok: false; reason: 'old-password-incorrect' }
  | { ok: false; reason: 'new-password-same-as-old' }
  | { ok: false; reason: 'user-not-found' };

/**
 * Mirrors `UpdatePassword` exactly (`BuyerController.php:117-150`),
 * including its exact branch ORDER (verified this session, not assumed):
 *   1. `$request->validate(['oldpassword'=>'required', 'newpassword'=>'required',
 *      'password_confirmation'=>'required|max:150'])`
 *   2. `newpassword == password_confirmation` (PHP loose `==`, reproduced
 *      here as strict string equality — both are plain form-submitted
 *      strings, so `==` vs `===` cannot actually differ for this pair of
 *      inputs; not a fidelity gap)
 *   3. `Hash::check(oldpassword, $hashedPassword)` — old password must
 *      match the CURRENT hash
 *   4. `!Hash::check(newpassword, $hashedPassword)` — new password must
 *      NOT match the current hash (reject same-as-old)
 *   5. only then: `bcrypt($newpassword)` + persist
 *
 * Every failure branch in source uses `session()->flash('message', ...)`
 * — the SAME flash key for both success and every failure case (unlike
 * login/register's message/AuthMsg split) — reproduced via the `reason`
 * discriminant below; the caller maps each reason to source's exact
 * message text, kept in the route/Server-Action layer alongside the
 * other flash-message call sites for consistency with how
 * `user-login/route.ts` and `save-user/route.ts` already do this.
 */
export async function updatePassword(
  db: Db,
  legacyId: number,
  input: UpdatePasswordInput
): Promise<UpdatePasswordResult> {
  const missing: string[] = [];
  if (!input.oldPassword) missing.push('oldpassword');
  if (!input.newPassword) missing.push('newpassword');
  if (!input.passwordConfirmation) missing.push('password_confirmation');
  if (missing.length > 0) {
    return { ok: false, reason: 'validation', fields: missing };
  }
  // `password_confirmation` => 'required|max:150' — the only other rule
  // source's validator actually enforces.
  if (input.passwordConfirmation.length > 150) {
    return { ok: false, reason: 'validation', fields: ['password_confirmation'] };
  }

  if (input.newPassword !== input.passwordConfirmation) {
    return { ok: false, reason: 'confirmation-mismatch' };
  }

  const users = new UserRepository(db);
  const user = await users.findByLegacyId(legacyId);
  if (!user) {
    // Not a source branch (Auth::User() cannot be null here in Laravel,
    // since this action is only reachable through checkBuyer) — defensive
    // only, for a session referencing a since-deleted user.
    return { ok: false, reason: 'user-not-found' };
  }

  const oldPasswordMatches = await verifyPassword(input.oldPassword, user.password);
  if (!oldPasswordMatches) {
    return { ok: false, reason: 'old-password-incorrect' };
  }

  const newPasswordIsSameAsOld = await verifyPassword(input.newPassword, user.password);
  if (newPasswordIsSameAsOld) {
    return { ok: false, reason: 'new-password-same-as-old' };
  }

  const newHashedPassword = await hashPassword(input.newPassword);
  await users.updatePasswordByLegacyId(legacyId, newHashedPassword);

  return { ok: true };
}
