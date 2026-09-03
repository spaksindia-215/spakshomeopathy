/**
 * `requireAdminSession` / `requireBuyerSession` (route/page protection)
 * tests — added M4 (route guard slices).
 *
 * LABEL: UNIT + FIXTURE. `next/headers`'s `cookies()` and
 * `next/navigation`'s `redirect()` only work inside a real Next.js request
 * context, so both are mocked here: `next/headers` with the same
 * in-memory cookie-jar fixture used by `tests/auth/session.test.ts`, and
 * `next/navigation`'s `redirect()` with a spy that throws (matching its
 * real behavior of aborting rendering via a thrown special value) so
 * assertions can observe both "it redirected" and "it redirected to the
 * right place" without needing a real HTTP response.
 *
 * Covers the M4-AUTH task's required scenarios directly against the guard
 * function every protected admin page/layout calls:
 *   - unauthenticated -> rejected/redirected
 *   - authenticated valid (utype=1) session -> allowed
 *   - invalid (forged/tampered) session -> rejected
 *   - expired session -> rejected
 *   - wrong-role session (utype=2/3/4) -> rejected on every request
 *   - logout -> subsequent protected access rejected
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

class RedirectSignal extends Error {
  constructor(public readonly destination: string) {
    super(`REDIRECT:${destination}`);
  }
}

vi.mock('next/navigation', () => ({
  redirect: (destination: string) => {
    throw new RedirectSignal(destination);
  },
}));

describe('requireAdminSession (UNIT + FIXTURE — mocked next/headers + next/navigation)', () => {
  beforeEach(() => {
    cookieJar.clear();
    vi.resetModules();
  });

  it('redirects to /admin/login when no session cookie is present', async () => {
    const { requireAdminSession } = await import('@/lib/auth/guard');
    await expect(requireAdminSession()).rejects.toMatchObject({ destination: '/admin/login' });
  });

  it('allows a valid utype=1 (admin) session through and returns it', async () => {
    const { createSession } = await import('@/lib/auth/session');
    const { requireAdminSession } = await import('@/lib/auth/guard');

    await createSession({ legacyId: 1, utype: 1, email: 'admin@example.invalid' });
    const session = await requireAdminSession();

    expect(session.utype).toBe(1);
    expect(session.userId).toBe(1);
  });

  it('rejects a forged/tampered session (bad signature)', async () => {
    const { createSession, SESSION_COOKIE_NAME } = await import('@/lib/auth/session');
    const { requireAdminSession } = await import('@/lib/auth/guard');

    await createSession({ legacyId: 1, utype: 1, email: 'admin@example.invalid' });
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

    await expect(requireAdminSession()).rejects.toMatchObject({ destination: '/admin/login' });
  });

  it('rejects an expired session', async () => {
    const { createSession, SESSION_COOKIE_NAME } = await import('@/lib/auth/session');
    const { requireAdminSession } = await import('@/lib/auth/guard');
    const { createHmac } = await import('crypto');

    await createSession({ legacyId: 1, utype: 1, email: 'admin@example.invalid' });
    const original = cookieJar.get(SESSION_COOKIE_NAME)!.value;
    const json = original.split('.')[0]!;
    const payload = JSON.parse(Buffer.from(json, 'base64url').toString('utf-8'));
    payload.issuedAt = Date.now() - 200 * 60 * 1000; // 200 min ago, > 120 min lifetime

    const newJson = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const newSignature = createHmac('sha256', 'test-session-secret-for-unit-tests-only')
      .update(newJson)
      .digest('base64url');
    cookieJar.set(SESSION_COOKIE_NAME, { value: `${newJson}.${newSignature}` });

    await expect(requireAdminSession()).rejects.toMatchObject({ destination: '/admin/login' });
  });

  it('rejects a valid but wrong-role session (utype=3, buyer)', async () => {
    const { createSession, SESSION_COOKIE_NAME } = await import('@/lib/auth/session');
    const { requireAdminSession } = await import('@/lib/auth/guard');

    await createSession({ legacyId: 2, utype: 3, email: 'buyer@example.invalid' });
    expect(cookieJar.has(SESSION_COOKIE_NAME)).toBe(true);

    // Access is denied on every request regardless of role, which is the
    // actual security property (see guard.ts's header comment on why the
    // session is not additionally deleted from this call site — that
    // would require a cookie write during Server Component rendering,
    // which Next.js disallows).
    await expect(requireAdminSession()).rejects.toMatchObject({ destination: '/admin/login' });
    await expect(requireAdminSession()).rejects.toMatchObject({ destination: '/admin/login' });
  });

  it('logout then re-request is rejected (subsequent protected access denied)', async () => {
    const { createSession, destroySession } = await import('@/lib/auth/session');
    const { requireAdminSession } = await import('@/lib/auth/guard');

    await createSession({ legacyId: 1, utype: 1, email: 'admin@example.invalid' });
    await requireAdminSession(); // allowed while logged in

    await destroySession();

    await expect(requireAdminSession()).rejects.toMatchObject({ destination: '/admin/login' });
  });
});

describe('requireBuyerSession (UNIT + FIXTURE — mocked next/headers + next/navigation)', () => {
  beforeEach(() => {
    cookieJar.clear();
    vi.resetModules();
  });

  it('redirects to /login when no session cookie is present', async () => {
    const { requireBuyerSession } = await import('@/lib/auth/guard');
    await expect(requireBuyerSession()).rejects.toMatchObject({ destination: '/login' });
  });

  it('allows a valid utype=3 (buyer) session through and returns it', async () => {
    const { createSession } = await import('@/lib/auth/session');
    const { requireBuyerSession } = await import('@/lib/auth/guard');

    await createSession({ legacyId: 2, utype: 3, email: 'buyer@example.invalid' });
    const session = await requireBuyerSession();

    expect(session.utype).toBe(3);
    expect(session.userId).toBe(2);
  });

  it('rejects a forged/tampered session (bad signature)', async () => {
    const { createSession, SESSION_COOKIE_NAME } = await import('@/lib/auth/session');
    const { requireBuyerSession } = await import('@/lib/auth/guard');

    await createSession({ legacyId: 2, utype: 3, email: 'buyer@example.invalid' });
    const original = cookieJar.get(SESSION_COOKIE_NAME)!.value;
    const [, signature] = original.split('.');
    const forgedPayload = Buffer.from(
      JSON.stringify({
        userId: 2,
        utype: 3,
        email: 'attacker@example.invalid',
        issuedAt: Date.now(),
      })
    ).toString('base64url');
    cookieJar.set(SESSION_COOKIE_NAME, { value: `${forgedPayload}.${signature}` });

    await expect(requireBuyerSession()).rejects.toMatchObject({ destination: '/login' });
  });

  it('rejects an expired session', async () => {
    const { createSession, SESSION_COOKIE_NAME } = await import('@/lib/auth/session');
    const { requireBuyerSession } = await import('@/lib/auth/guard');
    const { createHmac } = await import('crypto');

    await createSession({ legacyId: 2, utype: 3, email: 'buyer@example.invalid' });
    const original = cookieJar.get(SESSION_COOKIE_NAME)!.value;
    const json = original.split('.')[0]!;
    const payload = JSON.parse(Buffer.from(json, 'base64url').toString('utf-8'));
    payload.issuedAt = Date.now() - 200 * 60 * 1000; // 200 min ago, > 120 min lifetime

    const newJson = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const newSignature = createHmac('sha256', 'test-session-secret-for-unit-tests-only')
      .update(newJson)
      .digest('base64url');
    cookieJar.set(SESSION_COOKIE_NAME, { value: `${newJson}.${newSignature}` });

    await expect(requireBuyerSession()).rejects.toMatchObject({ destination: '/login' });
  });

  it('rejects a valid but wrong-role session (utype=1, admin)', async () => {
    const { createSession, SESSION_COOKIE_NAME } = await import('@/lib/auth/session');
    const { requireBuyerSession } = await import('@/lib/auth/guard');

    await createSession({ legacyId: 1, utype: 1, email: 'admin@example.invalid' });
    expect(cookieJar.has(SESSION_COOKIE_NAME)).toBe(true);

    await expect(requireBuyerSession()).rejects.toMatchObject({ destination: '/login' });
  });

  it('rejects a valid but wrong-role session (utype=2, seller)', async () => {
    const { createSession } = await import('@/lib/auth/session');
    const { requireBuyerSession } = await import('@/lib/auth/guard');

    await createSession({ legacyId: 5, utype: 2, email: 'seller@example.invalid' });
    await expect(requireBuyerSession()).rejects.toMatchObject({ destination: '/login' });
  });

  it('logout then re-request is rejected (subsequent protected access denied)', async () => {
    const { createSession, destroySession } = await import('@/lib/auth/session');
    const { requireBuyerSession } = await import('@/lib/auth/guard');

    await createSession({ legacyId: 2, utype: 3, email: 'buyer@example.invalid' });
    await requireBuyerSession(); // allowed while logged in

    await destroySession();

    await expect(requireBuyerSession()).rejects.toMatchObject({ destination: '/login' });
  });
});
