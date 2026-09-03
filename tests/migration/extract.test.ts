/**
 * Extraction stage tests — SQL dump parser correctness.
 */

import { describe, it, expect } from 'vitest';
import { extractTable } from '@/lib/migration/extract';
import { SAMPLE_DUMP } from './fixtures/sample-dump';

describe('extractTable', () => {
  it('extracts the correct row count for a small table', () => {
    expect(extractTable(SAMPLE_DUMP, 'users')).toHaveLength(3);
  });

  it('extracts columns in declaration order, matched by name to values', () => {
    const users = extractTable(SAMPLE_DUMP, 'users');
    expect(users[0]).toMatchObject({ id: 1, name: 'Normal User', email: 'normal@test.invalid' });
  });

  it('parses NULL as null, not the string "NULL"', () => {
    const users = extractTable(SAMPLE_DUMP, 'users');
    const nullUser = users.find((u) => u.id === 2);
    expect(nullUser?.mobile).toBeNull();
    expect(nullUser?.utype).toBeNull();
  });

  it('parses integer literals as numbers', () => {
    const products = extractTable(SAMPLE_DUMP, 'products');
    expect(typeof products[0]!.p_mrp).toBe('number');
    expect(products[0]!.p_mrp).toBe(100);
  });

  it('preserves varchar-typed numeric-looking values as strings (orders.SellPrice)', () => {
    const orders = extractTable(SAMPLE_DUMP, 'orders');
    const order = orders.find((o) => o.GroupId === 100);
    expect(typeof order?.SellPrice).toBe('string');
    expect(order?.SellPrice).toBe('90.50');
  });

  it('preserves int-typed numeric values as numbers (orderproducts.SellPrice) — the opposite of orders.SellPrice', () => {
    const orderProducts = extractTable(SAMPLE_DUMP, 'orderproducts');
    const line = orderProducts.find((op) => op.id === 1);
    expect(typeof line?.SellPrice).toBe('number');
  });

  it('correctly unescapes an embedded apostrophe inside a string literal', () => {
    const enquiries = extractTable(SAMPLE_DUMP, 'enquiries');
    expect(enquiries[0]!.message).toContain("apostrophe's");
  });

  it('correctly handles parentheses inside a string literal without breaking row boundaries', () => {
    const enquiries = extractTable(SAMPLE_DUMP, 'enquiries');
    expect(enquiries[0]!.message).toContain('(parentheses)');
    // If parens inside the string had confused the paren-depth counter,
    // this row (and likely the whole table) would have failed to parse
    // at all, or produced a wrong field count — the fact that ALL
    // expected fields parsed correctly is the real assertion here.
    expect(Object.keys(enquiries[0]!)).toHaveLength(8);
  });

  it('extracts a 0-row table cleanly (sliders has zero data in the fixture, matching production)', () => {
    expect(extractTable(SAMPLE_DUMP, 'slider')).toHaveLength(0);
  });

  it('throws a clear error for a nonexistent table rather than returning empty silently', () => {
    expect(() => extractTable(SAMPLE_DUMP, 'this_table_does_not_exist')).toThrow(
      /no CREATE TABLE found/
    );
  });
});
