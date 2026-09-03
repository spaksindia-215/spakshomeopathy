/**
 * Password hashing/verification.
 *
 * SOURCE: Laravel `config/hashing.php` — `driver: 'bcrypt'`, default
 * `BCRYPT_ROUNDS` (env, unset in `public_html/.env` → Laravel's own default
 * of 10). `bcrypt($password)` in `Auth\RegisterController@UserRegister`
 * (`RegisterController.php:42`) is the exact call that produced every
 * existing `users.password` hash in the migrated `spaks_dev.users`
 * collection. `Auth::attempt()` in `Auth\LoginController@UserLogin`
 * verifies via PHP's `password_verify()` under the hood, which is
 * bcrypt-standard and byte-compatible with any other correct bcrypt
 * implementation, including this one.
 *
 * WHY bcryptjs, NOT a native bcrypt binding: this is a pure-JS
 * implementation of the same, standard bcrypt algorithm (no native
 * compile step, works identically in this Node runtime). It reads and
 * writes the same `$2y$`/`$2a$`/`$2b$`-prefixed hash format PHP's
 * `password_hash()`/`bcrypt()` produce. `bcryptjs` treats `$2y$` (PHP's
 * default prefix) as equivalent to `$2b$` for verification, which is the
 * documented, correct behavior — the historical `$2x$`/`$2y$` split was
 * about a since-fixed bug in very old bcrypt implementations, not the
 * hash format itself.
 *
 * ROUNDS: fixed at 10, matching Laravel's own unset-env default
 * (`config/hashing.php:32`, `env('BCRYPT_ROUNDS', 10)`). This only
 * affects hashes created by NEW Next.js registrations — existing migrated
 * hashes already have their own cost embedded in the hash string itself
 * and are verified correctly regardless of this constant.
 */

import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 10;

/** Mirrors `bcrypt($password)` — used only for NEW registrations. */
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
}

/**
 * Mirrors `Auth::attempt(['email' => ..., 'password' => ..., 'status' => 1])`'s
 * credential-match step. Returns false (not a thrown error) on mismatch —
 * matching Laravel's `Auth::attempt()` return semantics, where a wrong
 * password is not an exception, just a failed attempt.
 */
export async function verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hash);
}
