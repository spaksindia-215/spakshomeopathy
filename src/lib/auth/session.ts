/**
 * Session layer.
 *
 * SOURCE EQUIVALENCE, NOT A REDESIGN
 * -----------------------------------
 * Laravel's session driver here is `SESSION_DRIVER=file` (public_html/.env)
 * with `Auth::attempt()`/`Auth::user()` reading/writing a server-side PHP
 * session, identified to the browser by an opaque, server-signed cookie
 * (`laravel_session`). There is no client-inspectable session content in
 * Laravel's model — the cookie is just a lookup key into server-side
 * storage.
 *
 * This Next.js application has no server-side session store (no `sessions`
 * collection was approved — DR-05 remains PENDING per
 * docs/M3-OWNER-DECISION-RECORDS.md and docs/M4-PREPARATION.md §5). Rather
 * than invent a DR-05 resolution unilaterally, this module uses a
 * self-contained, HMAC-signed cookie: the session data (user id + utype)
 * is stored directly in the cookie, but signed with `SESSION_SECRET` so
 * it cannot be forged or tampered with client-side — cryptographically
 * equivalent to "the server is the only party that can produce a valid
 * session," which is the actual security property Laravel's file-session
 * cookie provides. This is the smallest mechanism that reproduces that
 * property without a session collection. If DR-05 is later decided in
 * favor of a `sessions` collection, this module is the single place that
 * would change — nothing else in the app touches the cookie format
 * directly.
 *
 * LIFETIME: `SESSION_LIFETIME_MINUTES` (getCryptoConfig(), defaults to
 * Laravel's own `SESSION_LIFETIME=120` from public_html/.env) — contract
 * F-22 forbids changing this value.
 *
 * COOKIE NAME: `spaks_session` — deliberately NOT `laravel_session` (that
 * would falsely imply wire-format compatibility with real Laravel session
 * cookies, which this is not — it's a distinct mechanism achieving the
 * same authorization outcome, not a decoder for Laravel's own cookie).
 */

import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';
import { getCryptoConfig } from '../env';

export const SESSION_COOKIE_NAME = 'spaks_session';

/**
 * `utype`: 1=admin, 2=seller (VESTIGIAL — can never log in in practice,
 * per userSchema's own header comment and blueprint §5.2), 3=buyer,
 * 5=partner (Partner Panel feature, genuinely new — see `guard.ts`'s
 * `requirePartnerSession()`). Mirrors `users.utype` exactly — not renamed,
 * not re-enumerated.
 */
export interface SessionPayload {
  /** `users.legacyId` (the migrated MariaDB `users.id`) — NOT the Mongo `_id`. */
  userId: number;
  /** Mirrors `users.utype`, nullable in source (see userSchema.ts). A
   * session is only ever created after authService.login() has already
   * matched a specific non-null utype branch, so this is realistically
   * always a number in practice — nullable here only to match the
   * underlying field's true type rather than asserting a narrower one. */
  utype: number | null;
  email: string;
  /** Unix ms timestamp this session was issued, for expiry checking. */
  issuedAt: number;
}

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

/** Serializes and signs a session payload into a cookie value. */
function encode(payload: SessionPayload): string {
  const json = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(json);
  return `${json}.${signature}`;
}

/** Verifies signature and expiry; returns null on any failure (never throws). */
function decode(cookieValue: string): SessionPayload | null {
  const parts = cookieValue.split('.');
  if (parts.length !== 2) return null;
  const json = parts[0];
  const signature = parts[1];
  if (json === undefined || signature === undefined) return null;
  const expectedSignature = sign(json);
  if (!safeEqual(signature, expectedSignature)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(json, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }

  const { sessionLifetimeMinutes } = getCryptoConfig();
  const ageMs = Date.now() - payload.issuedAt;
  if (ageMs > sessionLifetimeMinutes * 60 * 1000) return null;

  return payload;
}

/** Creates a session cookie for a just-authenticated user (login or register-then-login). */
export async function createSession(user: {
  legacyId: number;
  utype: number | null;
  email: string;
}): Promise<void> {
  const { sessionLifetimeMinutes } = getCryptoConfig();
  const payload: SessionPayload = {
    userId: user.legacyId,
    utype: user.utype,
    email: user.email,
    issuedAt: Date.now(),
  };
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, encode(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: sessionLifetimeMinutes * 60,
  });
}

/** Reads and verifies the current request's session, if any. Mirrors `Auth::user()`. */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;
  return decode(raw);
}

/** Mirrors `Auth::logout()` (`Auth\LoginController@getSignOut`). */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
