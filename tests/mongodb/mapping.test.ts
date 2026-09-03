/**
 * M3-A mapping utility tests. Pure functions, no database connection.
 */

import { describe, it, expect } from 'vitest';
import { toLegacyId, decodeLatin1, preserveReference, toDate } from '@/lib/mongodb/mapping';

describe('toLegacyId', () => {
  it('passes through a number unchanged', () => {
    expect(toLegacyId(42)).toBe(42);
  });

  it('parses a numeric string', () => {
    expect(toLegacyId('42')).toBe(42);
  });

  it('throws on a non-numeric string rather than silently coercing to NaN', () => {
    expect(() => toLegacyId('not-a-number')).toThrow();
  });
});

describe('decodeLatin1', () => {
  it('passes through a string unchanged', () => {
    expect(decodeLatin1('hello')).toBe('hello');
  });

  it('decodes a latin1-encoded Buffer to a string', () => {
    const buf = Buffer.from('café', 'latin1');
    expect(decodeLatin1(buf)).toBe(buf.toString('latin1'));
  });
});

describe('preserveReference', () => {
  it('passes through a valid reference value unchanged', () => {
    expect(preserveReference(5)).toBe(5);
  });

  it('passes through null unchanged (an orphaned or absent reference)', () => {
    expect(preserveReference(null)).toBeNull();
  });

  it('does not validate the reference exists — this is documented, not a bug', () => {
    // preserveReference has no way to check existence (it doesn't touch a
    // database) — this test documents that it's a pure pass-through by
    // design, matching source's own zero-FK-enforcement behavior.
    const arbitraryUnvalidatedId = 999999;
    expect(preserveReference(arbitraryUnvalidatedId)).toBe(arbitraryUnvalidatedId);
  });
});

describe('toDate', () => {
  it('parses a valid timestamp string', () => {
    const d = toDate('2026-01-01 00:00:00');
    expect(d).toBeInstanceOf(Date);
  });

  it('returns null for a null input', () => {
    expect(toDate(null)).toBeNull();
  });

  it('returns null for an undefined input', () => {
    expect(toDate(undefined)).toBeNull();
  });

  it('returns null for an empty string (matches nullable timestamp columns)', () => {
    expect(toDate('')).toBeNull();
  });

  it('throws on an unparseable non-empty string rather than silently producing an Invalid Date', () => {
    expect(() => toDate('not-a-date')).toThrow();
  });
});
