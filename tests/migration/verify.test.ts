/**
 * Verify stage tests — orphan detection, duplicate identity detection,
 * type-conversion tracking, parity report generation.
 *
 * Owner instruction (M3-B §5): "Create explicit validation that detects:
 * orphan orderProducts, orphan payments, missing orders, duplicate
 * identities, broken GroupId relationships, unexpected type conversions.
 * Do not silently repair these. Report them."
 */

import { describe, it, expect } from 'vitest';
import {
  detectOrderOrphans,
  detectDuplicateIdentities,
  isExpectedConversion,
  EXPECTED_TYPE_CONVERSIONS,
  buildEntitySection,
  buildParityReport,
  renderHumanReadable,
} from '@/lib/migration/verify';
import { validateEntity } from '@/lib/migration/validate';
import { z } from 'zod';
import type { Order, OrderProduct, Payment } from '@/lib/mongodb/schemas';

function order(overrides: Partial<Order> = {}): Order {
  return {
    legacyId: 1,
    qrTransectionId: 'x',
    custId: null,
    sellerId: null,
    groupId: 1,
    productId: null,
    quantity: null,
    sellPrice: null,
    deliveryPrice: null,
    totalPrice: null,
    orderId: null,
    orderNotes: null,
    orderStatus: null,
    payMode: null,
    orderDate: null,
    deliveryDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
function orderProduct(overrides: Partial<OrderProduct> = {}): OrderProduct {
  return {
    legacyId: 1,
    groupId: 1,
    productId: null,
    orderImage: null,
    quantity: null,
    sellPrice: null,
    deliveryCharge: null,
    totalPrice: null,
    sellerId: null,
    buyerId: null,
    trackingCode: null,
    delaveryDate: null,
    delaveryBy: null,
    orderStatus: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
function payment(overrides: Partial<Payment> = {}): Payment {
  return {
    legacyId: 1,
    pid: null,
    qunt: null,
    gid: 1,
    cid: null,
    sid: null,
    amount: null,
    totalAmount: null,
    orderId: null,
    payStatus: null,
    orderStatus: null,
    adminFee: null,
    sellerPay: null,
    discount: null,
    payMode: null,
    payDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('detectOrderOrphans', () => {
  it('finds no orphans when every groupId/gid has a matching order', () => {
    const orders = [order({ legacyId: 1, groupId: 100 })];
    const lines = [orderProduct({ legacyId: 1, groupId: 100 })];
    const payments = [payment({ legacyId: 1, gid: 100 })];
    const report = detectOrderOrphans(orders, lines, payments);
    expect(report.orphanOrderProducts).toHaveLength(0);
    expect(report.orphanPayments).toHaveLength(0);
    expect(report.missingOrders).toHaveLength(0);
  });

  it('detects an orphan orderProduct (groupId matches no order)', () => {
    const orders = [order({ legacyId: 1, groupId: 100 })];
    const lines = [orderProduct({ legacyId: 2, groupId: 999 })];
    const report = detectOrderOrphans(orders, lines, []);
    expect(report.orphanOrderProducts).toEqual([{ legacyId: 2, groupId: 999 }]);
    expect(report.missingOrders).toEqual([999]);
  });

  it('detects an orphan payment (gid matches no order)', () => {
    const orders = [order({ legacyId: 1, groupId: 100 })];
    const payments = [payment({ legacyId: 2, gid: 999 })];
    const report = detectOrderOrphans(orders, [], payments);
    expect(report.orphanPayments).toEqual([{ legacyId: 2, gid: 999 }]);
  });

  it('detects an orderProduct with a null groupId as orphaned (a real production case, id=1)', () => {
    const orders = [order({ legacyId: 1, groupId: 100 })];
    const lines = [orderProduct({ legacyId: 1, groupId: null })];
    const report = detectOrderOrphans(orders, lines, []);
    expect(report.orphanOrderProducts).toEqual([{ legacyId: 1, groupId: null }]);
  });

  it('detects an order with no matching line items', () => {
    const orders = [order({ legacyId: 1, groupId: 100 })];
    const report = detectOrderOrphans(orders, [], []);
    expect(report.ordersWithNoLines).toEqual([100]);
  });

  it('never mutates or repairs — the input arrays are returned untouched by reference identity where applicable', () => {
    const orders = [order({ legacyId: 1, groupId: 100 })];
    const lines = [orderProduct({ legacyId: 1, groupId: 999 })];
    const beforeLength = lines.length;
    detectOrderOrphans(orders, lines, []);
    expect(lines).toHaveLength(beforeLength);
    expect(lines[0]!.groupId).toBe(999); // not "fixed" to 100 or removed
  });
});

describe('detectDuplicateIdentities', () => {
  it('finds no duplicates in a set of unique legacyIds', () => {
    const report = detectDuplicateIdentities('test', [
      order({ legacyId: 1 }),
      order({ legacyId: 2 }),
    ]);
    expect(report.duplicateLegacyIds).toHaveLength(0);
  });

  it('detects a duplicate legacyId and reports its count', () => {
    const report = detectDuplicateIdentities('test', [
      order({ legacyId: 1 }),
      order({ legacyId: 1 }),
      order({ legacyId: 1 }),
    ]);
    expect(report.duplicateLegacyIds).toEqual([{ legacyId: 1, count: 3 }]);
  });
});

describe('type conversion tracking', () => {
  it('recognizes the documented orders.orderId / payments.orderId mismatch as EXPECTED', () => {
    expect(isExpectedConversion('orders', 'orderId')).toBeDefined();
    expect(isExpectedConversion('payments', 'orderId')).toBeDefined();
  });

  it('returns undefined for a field not in the expected-conversion list (would be an UNEXPECTED conversion)', () => {
    expect(isExpectedConversion('orders', 'someFieldNeverDocumented')).toBeUndefined();
  });

  it('every expected conversion entry has a non-empty reason', () => {
    for (const c of EXPECTED_TYPE_CONVERSIONS) {
      expect(c.reason.length).toBeGreaterThan(0);
    }
  });
});

describe('parity report — count reconciliation and human-readable rendering', () => {
  const schema = z.object({ legacyId: z.number(), name: z.string() });

  it('reflects a rejection in both rejectedCount and rejectedSamples', () => {
    const validation = validateEntity(
      'widgets',
      [
        { ok: true as const, value: { legacyId: 1, name: 'a' }, legacyId: 1 },
        { ok: false as const, legacyId: 2, reason: 'bad row', sourceRecord: {} },
      ],
      schema
    );
    const section = buildEntitySection(
      validation,
      { entityName: 'widgets', duplicateLegacyIds: [] },
      [],
      ['1:1 field copy']
    );
    expect(section.sourceCount).toBe(2);
    expect(section.targetCount).toBe(1);
    expect(section.rejectedCount).toBe(1);
    expect(section.rejectedSamples[0]!.reason).toBe('bad row');
  });

  it('renders a human-readable report that clearly marks dry-run mode', () => {
    const validation = validateEntity(
      'widgets',
      [{ ok: true as const, value: { legacyId: 1, name: 'a' }, legacyId: 1 }],
      schema
    );
    const section = buildEntitySection(
      validation,
      { entityName: 'widgets', duplicateLegacyIds: [] },
      [],
      []
    );
    const report = buildParityReport('dry-run', [section]);
    const text = renderHumanReadable(report);
    expect(text).toContain('DRY-RUN');
    expect(text).toContain('NO DATABASE WRITES PERFORMED');
    expect(text).toContain('widgets');
  });

  it('includes duplicate-identity warnings in the rendered report', () => {
    const validation = validateEntity(
      'widgets',
      [{ ok: true as const, value: { legacyId: 1, name: 'a' }, legacyId: 1 }],
      schema
    );
    const section = buildEntitySection(
      validation,
      { entityName: 'widgets', duplicateLegacyIds: [{ legacyId: 1, count: 2 }] },
      [],
      []
    );
    expect(section.warningCount).toBeGreaterThan(0);
    const text = renderHumanReadable(buildParityReport('dry-run', [section]));
    expect(text).toContain('duplicate');
  });
});
