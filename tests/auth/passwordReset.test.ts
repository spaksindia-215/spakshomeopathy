/**
 * `@/lib/auth/passwordReset` tests — admin "forgot password" flow.
 * LABEL: UNIT.
 */

import { describe, it, expect } from 'vitest';
import { generateResetToken, verifyResetToken, hashToken } from '@/lib/auth/passwordReset';

describe('generateResetToken', () => {
  it('produces a raw token and a different, hashed value for storage', () => {
    const { rawToken, tokenHash } = generateResetToken();
    expect(rawToken).not.toBe(tokenHash);
    expect(rawToken.length).toBeGreaterThan(20);
  });

  it('sets an expiry roughly 1 hour in the future', () => {
    const { expiresAt } = generateResetToken();
    const deltaMs = expiresAt.getTime() - Date.now();
    expect(deltaMs).toBeGreaterThan(59 * 60 * 1000);
    expect(deltaMs).toBeLessThanOrEqual(60 * 60 * 1000);
  });

  it('produces a different raw token on every call', () => {
    const a = generateResetToken();
    const b = generateResetToken();
    expect(a.rawToken).not.toBe(b.rawToken);
  });
});

describe('hashToken', () => {
  it('is deterministic — the same raw token always hashes the same way', () => {
    const { rawToken, tokenHash } = generateResetToken();
    expect(hashToken(rawToken)).toBe(tokenHash);
  });
});

describe('verifyResetToken', () => {
  it('accepts a matching, unexpired token', () => {
    const { rawToken, tokenHash, expiresAt } = generateResetToken();
    expect(verifyResetToken(rawToken, tokenHash, expiresAt)).toBe(true);
  });

  it('rejects a raw token that does not match the stored hash', () => {
    const { tokenHash, expiresAt } = generateResetToken();
    expect(verifyResetToken('some-other-raw-token', tokenHash, expiresAt)).toBe(false);
  });

  it('rejects an expired token, even with a matching hash', () => {
    const { rawToken, tokenHash } = generateResetToken();
    const pastExpiry = new Date(Date.now() - 1000);
    expect(verifyResetToken(rawToken, tokenHash, pastExpiry)).toBe(false);
  });

  it('rejects when the raw token is missing', () => {
    const { tokenHash, expiresAt } = generateResetToken();
    expect(verifyResetToken(null, tokenHash, expiresAt)).toBe(false);
    expect(verifyResetToken(undefined, tokenHash, expiresAt)).toBe(false);
  });

  it('rejects when the stored hash is missing (no pending reset)', () => {
    const { rawToken, expiresAt } = generateResetToken();
    expect(verifyResetToken(rawToken, null, expiresAt)).toBe(false);
    expect(verifyResetToken(rawToken, undefined, expiresAt)).toBe(false);
  });

  it('rejects when the stored expiry is missing', () => {
    const { rawToken, tokenHash } = generateResetToken();
    expect(verifyResetToken(rawToken, tokenHash, null)).toBe(false);
    expect(verifyResetToken(rawToken, tokenHash, undefined)).toBe(false);
  });
});
