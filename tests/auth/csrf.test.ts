/**
 * `csrf` (generateCsrfToken/verifyCsrfToken) tests — added M5-B (CSRF
 * protection for existing mutation endpoints). Owner-approved mechanism:
 * a stateless, HMAC-signed token (see `src/lib/auth/csrf.ts`'s own header
 * for the full reasoning on why this replaced a literal cookie-based
 * double-submit token).
 *
 * LABEL: UNIT. `getCryptoConfig()` is mocked the same way
 * `tests/auth/orderToken.test.ts`/`tests/auth/session.test.ts` mock it,
 * for a deterministic secret.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/env', () => ({
  getCryptoConfig: () => ({
    appKey: 'base64:test-key-not-real',
    sessionSecret: 'test-session-secret-for-unit-tests-only',
    sessionLifetimeMinutes: 120,
  }),
}));

describe('generateCsrfToken / verifyCsrfToken (UNIT)', () => {
  it('a freshly generated token verifies successfully', async () => {
    const { generateCsrfToken, verifyCsrfToken } = await import('@/lib/auth/csrf');
    const token = generateCsrfToken();
    expect(verifyCsrfToken(token)).toBe(true);
  });

  it('produces a DIFFERENT token on each call (issuedAt-dependent, not a fixed constant)', async () => {
    vi.useFakeTimers();
    const { generateCsrfToken } = await import('@/lib/auth/csrf');
    vi.setSystemTime(1000);
    const tokenA = generateCsrfToken();
    vi.setSystemTime(2000);
    const tokenB = generateCsrfToken();
    expect(tokenA).not.toBe(tokenB);
    vi.useRealTimers();
  });

  it('rejects null/undefined/empty — matches "no _token field submitted"', async () => {
    const { verifyCsrfToken } = await import('@/lib/auth/csrf');
    expect(verifyCsrfToken(null)).toBe(false);
    expect(verifyCsrfToken(undefined)).toBe(false);
    expect(verifyCsrfToken('')).toBe(false);
  });

  it('rejects garbage input without throwing', async () => {
    const { verifyCsrfToken } = await import('@/lib/auth/csrf');
    expect(verifyCsrfToken('not-a-real-token')).toBe(false);
    expect(verifyCsrfToken('!!!')).toBe(false);
    expect(verifyCsrfToken('a.b.c')).toBe(false);
  });

  it('rejects a tampered signature (flipped character)', async () => {
    const { generateCsrfToken, verifyCsrfToken } = await import('@/lib/auth/csrf');
    const token = generateCsrfToken();
    const tampered = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A');
    expect(verifyCsrfToken(tampered)).toBe(false);
  });

  it('rejects a token forged with a different secret — the core CSRF-defense property', async () => {
    vi.resetModules();
    vi.doMock('@/lib/env', () => ({
      getCryptoConfig: () => ({
        appKey: 'base64:test-key-not-real',
        sessionSecret: 'an-attacker-would-not-have-this-secret',
        sessionLifetimeMinutes: 120,
      }),
    }));
    const { generateCsrfToken: generateWithOtherSecret } = await import('@/lib/auth/csrf');
    const forgedToken = generateWithOtherSecret();

    vi.resetModules();
    vi.doMock('@/lib/env', () => ({
      getCryptoConfig: () => ({
        appKey: 'base64:test-key-not-real',
        sessionSecret: 'test-session-secret-for-unit-tests-only',
        sessionLifetimeMinutes: 120,
      }),
    }));
    const { verifyCsrfToken } = await import('@/lib/auth/csrf');
    expect(verifyCsrfToken(forgedToken)).toBe(false);
  });

  describe('expiry', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('accepts a token well within the expiry window', async () => {
      vi.setSystemTime(0);
      const { generateCsrfToken, verifyCsrfToken } = await import('@/lib/auth/csrf');
      const token = generateCsrfToken();

      vi.setSystemTime(30 * 60 * 1000); // 30 minutes later
      expect(verifyCsrfToken(token)).toBe(true);
    });

    it('rejects a token past the expiry window', async () => {
      vi.setSystemTime(0);
      const { generateCsrfToken, verifyCsrfToken } = await import('@/lib/auth/csrf');
      const token = generateCsrfToken();

      vi.setSystemTime(2 * 60 * 60 * 1000); // 2 hours later — past the 1-hour window
      expect(verifyCsrfToken(token)).toBe(false);
    });

    it('rejects a token with an issuedAt timestamp in the future (clock-tamper attempt)', async () => {
      vi.setSystemTime(0);
      const { generateCsrfToken, verifyCsrfToken } = await import('@/lib/auth/csrf');
      const token = generateCsrfToken();

      vi.setSystemTime(-1000); // "now" moved BEFORE the token's issuedAt
      expect(verifyCsrfToken(token)).toBe(false);
    });
  });
});
