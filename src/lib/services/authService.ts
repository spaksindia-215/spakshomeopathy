/**
 * Authentication service.
 *
 * Mirrors `Auth\LoginController@UserLogin` (`public_html/app/Http/Controllers/Auth/LoginController.php:18-79`)
 * and `Auth\RegisterController@UserRegister` (`public_html/app/Http/Controllers/Auth/RegisterController.php:37-159`,
 * utype=3 branch only — see "SCOPE" below). Confirmed these are the LIVE,
 * ROUTED controllers via `routes/web.php:36-37` (`Auth\LoginController@UserLogin`,
 * `Auth\RegisterController@UserRegister`) — NOT the top-level
 * `App\Http\Controllers\LoginController`/`RegisterController` duplicates,
 * which are dead code (present on disk, never routed, confirmed by a
 * repo-wide `routes/*.php` grep).
 *
 * SCOPE OF THIS SLICE
 * --------------------
 * - Login: full parity with `UserLogin`'s actual reachable behavior from
 *   the real, live login form (see "LOGIN BRANCH REACHABILITY" below).
 * - Register: utype=3 (buyer) branch only, matching the live public
 *   `/register` page (`register.blade.php` hardcodes `utype=3`; there is
 *   no live form that submits utype=2/4). The utype=2/4 (seller) branch
 *   in source performs multi-file uploads (Aadhar/PAN/signature/bank
 *   statement) to `/seller-register` — a materially larger, separate
 *   feature explicitly out of scope for this slice (upload handling,
 *   DR-04's file-validation questions). NOT built here; `registerSeller`
 *   is intentionally absent, not silently stubbed.
 *
 * LOGIN BRANCH REACHABILITY (verified against the actual rendered forms)
 * -------------------------------------------------------------------------
 * `UserLogin` branches on `$backuser` AND `users.utype` together:
 *   - `utype==1 && backuser=='admin'`  → admin/home
 *   - `utype==2 && backuser=='seller_buyer'` → seller/myaccount
 *   - `utype==3 && backuser=='seller_buyer'` → cart-list or myaccount
 *   - any other combination → Auth::logout() + "Wrong Login Details"
 * The PUBLIC `/login` form (login.blade.php:87) hardcodes
 * `<input type="hidden" name="backuser" value="seller_buyer">` — it can
 * NEVER submit `backuser=admin`. The SEPARATE `/admin/login` form
 * (admin/login.blade.php:70) hardcodes `backuser=admin`. Both forms POST
 * to the SAME route (`user-login`), so this one service function must
 * handle both — reproduced exactly via the `backuser` parameter, not
 * hardcoded to one form's caller.
 *
 * `utype==2` (seller) is VESTIGIAL per userSchema's header (818 of 819
 * migrated users are utype=3; only 1 admin, 0 sellers) — the branch is
 * reproduced for fidelity but is not expected to be exercised by real
 * data.
 */

import type { Db } from 'mongodb';
import { UserRepository } from '../mongodb/repositories/userRepository';
import { verifyPassword, hashPassword } from '../auth/password';

export type LoginRedirect =
  | { kind: 'admin-home' }
  | { kind: 'seller-myaccount' }
  | { kind: 'cart-list' }
  | { kind: 'myaccount' }
  | { kind: 'wrong-credentials' };

export interface LoginInput {
  email: string;
  password: string;
  /** `'admin'` (from /admin/login) or `'seller_buyer'` (from the public
   * /login form) — mirrors the hidden `backuser` field on each form
   * exactly; there is no third value in source. */
  backuser: string;
  /** Mirrors `session()->get('TotalCartItem')` — the live source checks a
   * session cart-count to choose between `cart-list` and `myaccount` for a
   * buyer login (LoginController.php:51-58). This app has no cart session
   * yet (cart is UI-only per the contract audit), so callers pass 0 until
   * a real session-cart exists; documented here, not silently guessed. */
  cartTotal: number;
}

export interface AuthenticatedUser {
  legacyId: number;
  /** Mirrors `userSchema.utype` exactly (nullable in source — no CHECK/ENUM
   * constraint on this column, per userSchema.ts's own header). A null
   * utype cannot match any of the branches below and therefore always
   * falls through to `wrong-credentials`, the same outcome Laravel's own
   * `if/elseif` chain produces for an unmatched value. */
  utype: number | null;
  email: string;
}

/**
 * Mirrors `UserLogin`'s full body: validate presence (caller's job at the
 * route-handler boundary, same split as Laravel's `$this->validate()`
 * happening before the credential check), `Auth::attempt(['email',
 * 'password', 'status' => 1])`, the utype/backuser branch, and the
 * `Auth::logout()` + "Wrong Login Details" fallback for any mismatch.
 *
 * Returns the authenticated user (caller creates the session) plus the
 * redirect classification, OR `wrong-credentials` with no user — the
 * caller must NOT create a session in that case, mirroring
 * `Auth::logout()` being called on every non-matching branch including a
 * technically-successful `Auth::attempt()` that fails the utype/backuser
 * check (LoginController.php:61-67).
 */
export async function login(
  db: Db,
  input: LoginInput
): Promise<
  { user: AuthenticatedUser; redirect: LoginRedirect } | { redirect: 'wrong-credentials' }
> {
  const users = new UserRepository(db);
  const user = await users.findByEmail(input.email);

  // `Auth::attempt(['email'=>..., 'password'=>..., 'status'=>1])` — status
  // is part of the CREDENTIAL MATCH itself, not a separate check. An
  // inactive user (status != 1) fails identically to a wrong password:
  // "Wrong Login Details", not "account disabled" (userSchema.ts header).
  if (!user || user.status !== 1) {
    return { redirect: 'wrong-credentials' };
  }

  const passwordMatches = await verifyPassword(input.password, user.password);
  if (!passwordMatches) {
    return { redirect: 'wrong-credentials' };
  }

  // Auth::attempt() succeeded. Now the utype/backuser branch
  // (LoginController.php:44-67) — any non-matching combination logs out
  // and falls through to "Wrong Login Details", even though the password
  // itself was correct. This is source behavior, not a bug to "improve."
  const authenticated: AuthenticatedUser = {
    legacyId: user.legacyId,
    utype: user.utype,
    email: user.email,
  };

  if (user.utype === 1 && input.backuser === 'admin') {
    return { user: authenticated, redirect: { kind: 'admin-home' } };
  }
  if (user.utype === 2 && input.backuser === 'seller_buyer') {
    return { user: authenticated, redirect: { kind: 'seller-myaccount' } };
  }
  if (user.utype === 3 && input.backuser === 'seller_buyer') {
    return {
      user: authenticated,
      redirect: input.cartTotal > 0 ? { kind: 'cart-list' } : { kind: 'myaccount' },
    };
  }

  // Matches source exactly: password was right, but utype/backuser
  // combination didn't match any branch (e.g. a buyer submitting the
  // admin form). Source calls Auth::logout() here even though attempt()
  // succeeded — no session should be created by the caller.
  return { redirect: 'wrong-credentials' };
}

/** Mirrors `Auth\LoginController@getSignOut` — `Auth::logout()` +
 * `redirect('home')`. Session destruction itself is the caller's job
 * (src/lib/auth/session.ts's destroySession()); this export exists so the
 * redirect target is documented in one place rather than hardcoded at the
 * route-handler call site. */
export const LOGOUT_REDIRECT = '/home';

export interface RegisterBuyerInput {
  name: string;
  email: string;
  mobile: string;
  password: string;
}

export type RegisterResult =
  | { ok: true }
  | { ok: false; reason: 'validation'; fields: string[] }
  | { ok: false; reason: 'email-taken' };

/**
 * Mirrors `UserRegister`'s utype=3 branch exactly
 * (RegisterController.php:47-61): required-field validation
 * (`utype|name|email|mobile|password`, all `required`; email additionally
 * `email|max:255|unique:users`), `bcrypt($password)`, insert into `users`
 * with `status: 1` (verified: the LIVE `Auth/RegisterController.php` sets
 * `'status'=>1` for utype=3 — NOT `status: 0` as the dead top-level
 * `RegisterController.php` duplicate does; a genuinely different value
 * between the two files, resolved by using the routed one), then an
 * insert into `buyer_profile` with only `uid` set (no PinCode/FullAddress/
 * State/etc. — the live registration form has no such fields, matching
 * `buyerProfileSchema`'s `.optional()` embedding note).
 *
 * `status: 1` here means a buyer can log in IMMEDIATELY after registering
 * — verified directly against source, not assumed. (Contrast:
 * seller/utype=2/4 registration sets `status: 0`, "account will activate
 * within 24 hours" — out of this slice's scope, see file header.)
 *
 * Does NOT send the account-verification email
 * (`Mail::send('mails.verify', ...)`, RegisterController.php:130-148) —
 * that entire block is already commented out in the LIVE routed
 * controller (verified: every line from `// try {` to the matching `//`
 * close is a source-code comment, not active PHP). Nothing is skipped
 * here that source itself runs.
 */
export async function registerBuyer(db: Db, input: RegisterBuyerInput): Promise<RegisterResult> {
  const missing: string[] = [];
  if (!input.name || input.name.trim() === '') missing.push('name');
  if (!input.email || input.email.trim() === '') missing.push('email');
  if (!input.mobile || input.mobile.trim() === '') missing.push('mobile');
  if (!input.password || input.password.trim() === '') missing.push('password');
  if (missing.length > 0) {
    return { ok: false, reason: 'validation', fields: missing };
  }
  // `email|max:255` — matches Laravel's Validator rule exactly.
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) && input.email.length <= 255;
  if (!emailValid) {
    return { ok: false, reason: 'validation', fields: ['email'] };
  }

  const users = new UserRepository(db);

  // `unique:users` — application-level check (DR-04 still pending; see
  // userRepository.ts header). Reproduces the same TOCTOU window Laravel's
  // own validate-then-insert pattern has, deliberately (see that file's
  // header for why that's faithful, not a bug to fix).
  if (await users.emailExists(input.email)) {
    return { ok: false, reason: 'email-taken' };
  }

  const legacyId = await users.nextLegacyId();
  const hashedPassword = await hashPassword(input.password);
  const now = new Date();

  await users.insertOne({
    legacyId,
    name: input.name,
    email: input.email,
    mobile: input.mobile,
    emailVerifiedAt: null,
    password: hashedPassword,
    image: null,
    utype: 3,
    status: 1, // verified against the LIVE Auth/RegisterController.php, not the dead duplicate
    rememberToken: null,
    createdAt: now,
    updatedAt: now,
    buyerProfile: {
      legacyId,
      pinCode: null,
      fullAddress: null,
      houseNo: null,
      landmark: null,
      state: null,
      country: null,
      deliveryType: null,
    },
  });

  return { ok: true };
}
