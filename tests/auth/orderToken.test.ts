/**
 * `orderToken` (encryptGroupId/decryptGroupId) tests — added M4 (buyer
 * orders slice, B-12 correction). The Next.js equivalent of Laravel's
 * `encrypt()`/`decrypt()` for the `cncl_id` cancel-order token.
 *
 * LABEL: UNIT. `getCryptoConfig()` is mocked the same way
 * `tests/auth/session.test.ts` mocks it, for a deterministic secret.
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  getCryptoConfig: () => ({
    appKey: 'base64:test-key-not-real',
    sessionSecret: 'test-session-secret-for-unit-tests-only',
    sessionLifetimeMinutes: 120,
  }),
}));

describe('encryptGroupId / decryptGroupId (UNIT)', () => {
  it('round-trips a GroupId through encrypt then decrypt', async () => {
    const { encryptGroupId, decryptGroupId } = await import('@/lib/auth/orderToken');
    const token = encryptGroupId(12345);
    expect(decryptGroupId(token)).toBe(12345);
  });

  it('produces an opaque token — the raw GroupId is not visible in the ciphertext', async () => {
    const { encryptGroupId } = await import('@/lib/auth/orderToken');
    const token = encryptGroupId(42);
    expect(token).not.toContain('42');
  });

  it('produces a DIFFERENT token each time for the same GroupId (random IV)', async () => {
    const { encryptGroupId } = await import('@/lib/auth/orderToken');
    const tokenA = encryptGroupId(7);
    const tokenB = encryptGroupId(7);
    expect(tokenA).not.toBe(tokenB);
  });

  it('rejects a tampered token (flipped character) — auth tag fails', async () => {
    const { encryptGroupId, decryptGroupId } = await import('@/lib/auth/orderToken');
    const token = encryptGroupId(99);
    const tampered = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A');
    expect(decryptGroupId(tampered)).toBeNull();
  });

  it('rejects garbage input without throwing', async () => {
    const { decryptGroupId } = await import('@/lib/auth/orderToken');
    expect(decryptGroupId('not-a-real-token')).toBeNull();
    expect(decryptGroupId('')).toBeNull();
    expect(decryptGroupId('!!!')).toBeNull();
  });

  it('rejects a token encrypted with a different key', async () => {
    vi.resetModules();
    vi.doMock('@/lib/env', () => ({
      getCryptoConfig: () => ({
        appKey: 'base64:test-key-not-real',
        sessionSecret: 'a-completely-different-secret',
        sessionLifetimeMinutes: 120,
      }),
    }));
    const { encryptGroupId: encryptWithOtherKey } = await import('@/lib/auth/orderToken');
    const tokenFromOtherKey = encryptWithOtherKey(555);

    vi.resetModules();
    vi.doMock('@/lib/env', () => ({
      getCryptoConfig: () => ({
        appKey: 'base64:test-key-not-real',
        sessionSecret: 'test-session-secret-for-unit-tests-only',
        sessionLifetimeMinutes: 120,
      }),
    }));
    const { decryptGroupId } = await import('@/lib/auth/orderToken');
    expect(decryptGroupId(tokenFromOtherKey)).toBeNull();
  });
});
