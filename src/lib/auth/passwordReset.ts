/**
 * Admin "forgot password" token generation/verification.
 *
 * GENUINELY NEW, NO LARAVEL BACKEND TO MIRROR: `/reset-password`
 * (`src/app/reset-password/page.tsx`) is a ported Blade page whose own
 * header discloses "no real password-reset backend exists" — its
 * `action="/user-reset-password"` target was never implemented in
 * Laravel either. This module is a genuinely new admin-only capability,
 * not a migration.
 *
 * TOKEN STORAGE: only a HASH of the raw token is ever persisted
 * (`userSchema.passwordResetTokenHash`) — the raw token exists only in
 * the emailed link and the one request that redeems it. Uses SHA-256
 * (via `crypto.createHash`), NOT bcrypt — this is a lookup-then-
 * constant-time-compare check against a high-entropy random value, not
 * a low-entropy human password needing bcrypt's deliberate slowness;
 * the security property here is "an attacker who reads the database
 * cannot derive the raw token," which a fast, unsalted hash of a
 * cryptographically random 32-byte value already provides.
 *
 * EXPIRY: 1 hour, matching this codebase's existing `CSRF_TOKEN_MAX_AGE_MS`
 * convention (`csrf.ts`) — long enough to receive and act on an email,
 * short enough that a stale, unused reset link stops being valid on its
 * own.
 */

import { randomBytes, createHash, timingSafeEqual } from 'crypto';

const TOKEN_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

/** Exported so callers can look a user up BY hash first (e.g.
 * `UserRepository.findByPasswordResetTokenHash`) before calling
 * `verifyResetToken` below to check the match + expiry together. */
export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export interface GeneratedResetToken {
  /** The raw token — goes into the emailed link only, never persisted. */
  rawToken: string;
  /** Persist this on the user's document, not `rawToken`. */
  tokenHash: string;
  expiresAt: Date;
}

/** Generates a fresh reset token. Call once per "forgot password"
 * request; the caller is responsible for persisting `tokenHash`/
 * `expiresAt` on the target user and emailing a link containing
 * `rawToken`. */
export function generateResetToken(): GeneratedResetToken {
  const rawToken = randomBytes(32).toString('base64url');
  return {
    rawToken,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + TOKEN_MAX_AGE_MS),
  };
}

/**
 * Verifies a submitted raw token against a user's stored hash/expiry.
 * Returns `false` for anything missing, mismatched, or expired — never
 * throws, mirrors `csrf.ts#verifyCsrfToken`'s own "reject, don't throw"
 * posture for the same class of user-submitted, possibly-malformed
 * value.
 */
export function verifyResetToken(
  rawToken: string | null | undefined,
  storedHash: string | null | undefined,
  storedExpiresAt: Date | null | undefined
): boolean {
  if (!rawToken || !storedHash || !storedExpiresAt) return false;
  if (Date.now() > storedExpiresAt.getTime()) return false;
  return safeEqual(hashToken(rawToken), storedHash);
}
