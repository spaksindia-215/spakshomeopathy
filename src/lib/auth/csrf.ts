/**
 * CSRF-equivalent protection for POST `route.ts` mutation endpoints.
 *
 * SOURCE EQUIVALENCE, NOT A REDESIGN
 * -----------------------------------
 * Laravel's `VerifyCsrfToken` middleware (`public_html/app/Http/Middleware/
 * VerifyCsrfToken.php`, extending the framework default with
 * `$except = []` — no route is excluded) rejects any state-changing request
 * (Laravel's own `isReading()` exempts only `HEAD`/`GET`/`OPTIONS` — see
 * `vendor/laravel/framework/.../VerifyCsrfToken.php:91-94`, confirmed
 * directly this slice) whose `_token` field doesn't match the
 * server-side session's stored token. Next.js has no built-in equivalent
 * for a plain `route.ts` POST handler (only Server Actions get an
 * automatic same-origin check, and only one form in this app —
 * `change-password`'s submit action — is a Server Action).
 *
 * OWNER-APPROVED MECHANISM (2026-08-26): a signed, double-submit-style
 * token. OWNER-APPROVED RESOLUTION OF A REAL IMPLEMENTATION CONSTRAINT
 * (2026-08-26, same session): a literal cookie-based double-submit token
 * cannot be issued the way Laravel issues its session-backed token,
 * because this app's forms render from plain Server Components, and
 * Next.js throws a hard runtime error if a page render tries to
 * `cookies().set()` (confirmed by an actual build+run test this session —
 * the exact same constraint `guard.ts` already documented and hit during
 * M4). A route.ts/Server Action CAN set a cookie, but that only runs
 * AFTER a form submission, not before the form's first render — so a
 * cookie can never exist in time for the FIRST page load's form to embed
 * it.
 *
 * Resolution, owner-approved: a STATELESS signed token instead of a
 * stored cookie value. `generateCsrfToken()` produces
 * `{issuedAt}.{hmac-signature}` — computable at render time with no
 * cookie write of any kind — and `verifyCsrfToken()` re-derives the
 * signature server-side and rejects anything that doesn't match or has
 * expired. This achieves the IDENTICAL security property double-submit
 * cookies provide (a cross-origin attacker cannot produce a token that
 * passes verification, because they do not have `SESSION_SECRET`) without
 * requiring a pre-existing cookie — same "distinct mechanism, same
 * security outcome" precedent `session.ts`/`orderToken.ts` already
 * established for this codebase's other cryptographic primitives.
 *
 * SCOPE: only Laravel's own `VerifyCsrfToken` scope — POST (and PUT/PATCH/
 * DELETE, though none exist in this app) `route.ts` handlers. GET routes
 * (`logout`, `admin/user-logout`, `cancel-order`) are correctly NOT
 * covered — Laravel's own `isReading()` exempts GET/HEAD/OPTIONS from CSRF
 * checking entirely, so adding a check to a GET route here would be
 * protection Laravel never had, not a parity fix.
 *
 * KEY: reuses the existing `SESSION_SECRET` (via `getCryptoConfig()`) —
 * consistent with `orderToken.ts`'s "no new secret to provision" rationale.
 * A short expiry window (`CSRF_TOKEN_MAX_AGE_MS`) bounds how long a given
 * token remains valid, since it is never explicitly invalidated by a
 * logout the way a `sessions`-table-backed Laravel token conceptually
 * could be (Laravel's own token is regenerated on login/logout via
 * `Session::regenerateToken()`, but is otherwise valid for the whole
 * session lifetime — this expiry is a deliberate, disclosed strengthening,
 * not a fidelity requirement, since CSRF tokens are additive security
 * infrastructure with no MariaDB/Blade-observable counterpart to match
 * byte-for-byte).
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { getCryptoConfig } from '../env';

/** Generous relative to a normal form-fill duration; short enough that a
 * token leaked once (e.g. via a referrer header) is not useful indefinitely. */
const CSRF_TOKEN_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

function sign(data: string): string {
  const { sessionSecret } = getCryptoConfig();
  return createHmac('sha256', sessionSecret).update(data).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Produces a fresh CSRF token for embedding in a form's hidden `_token`
 * field. Callable from a Server Component render — performs no cookie
 * read or write of any kind, unlike `session.ts`'s `createSession()`.
 */
export function generateCsrfToken(): string {
  const issuedAt = String(Date.now());
  const signature = sign(issuedAt);
  return `${issuedAt}.${signature}`;
}

/**
 * Verifies a submitted `_token` value. Returns `false` for anything
 * missing, malformed, tampered, or expired — never throws. Mirrors the
 * OUTCOME of Laravel's `TokenMismatchException` (request rejected) without
 * reproducing its literal 419 status page (no Next.js route in this app
 * renders a Laravel error-page equivalent for any other exception either —
 * same reasoning already applied to B-12/`orderToken.ts`'s decrypt failure
 * handling: the caller decides what "rejected" looks like, not this
 * function).
 */
export function verifyCsrfToken(token: string | null | undefined): boolean {
  if (!token) return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const issuedAtRaw = parts[0];
  const signature = parts[1];
  if (issuedAtRaw === undefined || signature === undefined) return false;

  const expectedSignature = sign(issuedAtRaw);
  if (!safeEqual(signature, expectedSignature)) return false;

  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt)) return false;

  const age = Date.now() - issuedAt;
  if (age < 0 || age > CSRF_TOKEN_MAX_AGE_MS) return false;

  return true;
}
