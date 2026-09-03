/**
 * Session cookie tests — added M4 (authentication).
 *
 * LABEL: UNIT + FIXTURE. `next/headers`'s `cookies()` only works inside a
 * real Next.js request context, so these tests mock it with an in-memory
 * cookie jar (FIXTURE — not a real browser, not a real HTTP request) to
 * exercise the encode/sign/verify/expiry logic (UNIT-level correctness)
 * end-to-end through the public API.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const cookieJar = new Map<string, { value: string }>();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => cookieJar.get(name),
    set: (name: string, value: string) => {
      cookieJar.set(name, { value });
    },
    delete: (name: string) => {
      cookieJar.delete(name);
    },
  }),
}));

vi.mock('../../src/lib/env', () => ({
  getCryptoConfig: () => ({
    appKey: 'base64:test-key-not-real',
    sessionSecret: 'test-session-secret-for-unit-tests-only',
    sessionLifetimeMinutes: 120,
  }),
}));

describe('session (UNIT + FIXTURE — mocked next/headers cookie jar)', () => {
  beforeEach(() => {
    cookieJar.clear();
    vi.resetModules();
  });

  it('creates a session and reads it back with the same values', async () => {
    const { createSession, getSession } = await import('@/lib/auth/session');
    await createSession({ legacyId: 42, utype: 3, email: 'buyer@example.invalid' });

    const session = await getSession();
    expect(session).not.toBeNull();
    expect(session?.userId).toBe(42);
    expect(session?.utype).toBe(3);
    expect(session?.email).toBe('buyer@example.invalid');
  });

  it('returns null when no session cookie is present', async () => {
    const { getSession } = await import('@/lib/auth/session');
    expect(await getSession()).toBeNull();
  });

  it('rejects a tampered cookie value (signature mismatch)', async () => {
    const { createSession, getSession, SESSION_COOKIE_NAME } = await import('@/lib/auth/session');
    await createSession({ legacyId: 1, utype: 1, email: 'admin@example.invalid' });

    // Tamper with the payload half of the cookie, leaving the (now
    // invalid) signature untouched — simulates a forged/modified cookie
    // sent by a malicious client.
    const original = cookieJar.get(SESSION_COOKIE_NAME)!.value;
    const [, signature] = original.split('.');
    const forgedPayload = Buffer.from(
      JSON.stringify({
        userId: 1,
        utype: 1,
        email: 'attacker@example.invalid',
        issuedAt: Date.now(),
      })
    ).toString('base64url');
    cookieJar.set(SESSION_COOKIE_NAME, { value: `${forgedPayload}.${signature}` });

    expect(await getSession()).toBeNull();
  });

  it('destroySession removes the cookie', async () => {
    const { createSession, destroySession, getSession } = await import('@/lib/auth/session');
    await createSession({ legacyId: 7, utype: 3, email: 'x@example.invalid' });
    expect(await getSession()).not.toBeNull();

    await destroySession();
    expect(await getSession()).toBeNull();
  });

  it('rejects an expired session (issuedAt beyond sessionLifetimeMinutes)', async () => {
    const { createSession, getSession, SESSION_COOKIE_NAME } = await import('@/lib/auth/session');
    await createSession({ legacyId: 5, utype: 3, email: 'expired@example.invalid' });

    // Re-sign a payload with an issuedAt far in the past, using the same
    // module's own signing so the signature is valid but the age check
    // fails — isolates the expiry check from the signature check.
    const original = cookieJar.get(SESSION_COOKIE_NAME)!.value;
    const json = original.split('.')[0]!;
    const payload = JSON.parse(Buffer.from(json, 'base64url').toString('utf-8'));
    payload.issuedAt = Date.now() - 200 * 60 * 1000; // 200 minutes ago, > 120 min lifetime

    const { createHmac } = await import('crypto');
    const newJson = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const newSignature = createHmac('sha256', 'test-session-secret-for-unit-tests-only')
      .update(newJson)
      .digest('base64url');
    cookieJar.set(SESSION_COOKIE_NAME, { value: `${newJson}.${newSignature}` });

    expect(await getSession()).toBeNull();
  });
});
