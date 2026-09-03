/**
 * `orderService` tests — added M4-PREP (docs/M4-PREPARATION.md), EXTENDED
 * M4 buyer-orders slice (B-12 correction). Exercises the thin service
 * wrapper over the ALREADY-EXISTING `getOrderByGroupId`/
 * `getOrderGroupIdsForBuyer` (built M3-A, already covered by
 * tests/mongodb/readBack.test.ts) plus the NEW ownership-checked
 * functions this slice adds (`getBuyerManageOrdersView`,
 * `getBuyerOrderDetail`, `cancelBuyerOrder`) — these tests specifically
 * prove the SERVICE FUNCTIONS behave the same as the repository functions
 * they wrap, not re-testing the repository logic itself from scratch
 * (repository-level ownership/mutation logic has its own dedicated tests
 * in `tests/mongodb/orderOwnership.test.ts`).
 *
 * LABEL: UNIT + FIXTURE. Against a minimal seeded fake `Db` (same pattern
 * as readBack.test.ts, extended with `updateOne`/`updateMany` for the
 * new mutation-capable functions), NOT a real MongoDB connection.
 */

import { describe, it, expect } from 'vitest';
import {
  getBuyerOrderGroupIds,
  getBuyerOrderView,
  getBuyerManageOrdersView,
  getBuyerOrderDetail,
  cancelBuyerOrder,
} from '@/lib/services/orderService';
import { validOrder, validOrderProduct, validPayment, validProduct } from '../mongodb/fixtures';
import type { Db, Collection, Document, Filter } from 'mongodb';

function createSeededFakeDb(seed: Record<string, Document[]>): Db {
  const stores: Record<string, Document[]> = { ...seed };
  return {
    collection: (name: string) => {
      const data = (stores[name] ??= []);
      return {
        findOne: async (filter: Filter<Document>) => {
          return data.find((d) => matchesFilter(d, filter)) ?? null;
        },
        find: (filter: Filter<Document>) => ({
          toArray: async () => data.filter((d) => matchesFilter(d, filter)),
        }),
        updateOne: async (filter: Filter<Document>, update: { $set: Record<string, unknown> }) => {
          const doc = data.find((d) => matchesFilter(d, filter));
          if (doc) Object.assign(doc, update.$set);
          return { acknowledged: true, matchedCount: doc ? 1 : 0, modifiedCount: doc ? 1 : 0 };
        },
        updateMany: async (filter: Filter<Document>, update: { $set: Record<string, unknown> }) => {
          const docs = data.filter((d) => matchesFilter(d, filter));
          for (const doc of docs) Object.assign(doc, update.$set);
          return { acknowledged: true, matchedCount: docs.length, modifiedCount: docs.length };
        },
      } as unknown as Collection<Document>;
    },
  } as unknown as Db;
}

function matchesFilter(doc: Document, filter: Filter<Document>): boolean {
  return Object.entries(filter).every(([key, value]) => {
    if (value !== null && typeof value === 'object' && '$in' in (value as object)) {
      const inValues = (value as { $in: unknown[] }).$in;
      return inValues.includes(doc[key]);
    }
    return doc[key] === value;
  });
}

describe('getBuyerOrderGroupIds (UNIT + FIXTURE)', () => {
  it('returns the distinct GroupIds for a buyer, mirroring ManageOrders’ BuyerId filter', async () => {
    const db = createSeededFakeDb({ orderProducts: [validOrderProduct] });

    const groupIds = await getBuyerOrderGroupIds(db, validOrderProduct.buyerId!);

    expect(groupIds).toEqual([validOrderProduct.groupId]);
  });
});

describe('getBuyerOrderView (UNIT + FIXTURE)', () => {
  it('reconstructs order/lines/payments for a GroupId, without reproducing B-12’s crash', async () => {
    const db = createSeededFakeDb({
      orders: [validOrder],
      orderProducts: [validOrderProduct],
      payments: [validPayment],
    });

    // The real Laravel ViewOrder route (B-12) throws a SQL error on every
    // real request (joins on a nonexistent orders.pid column). This
    // service function succeeds by design — see orderService.ts's file
    // header for why that is the deliberate, documented choice here.
    const result = await getBuyerOrderView(db, validOrder.groupId!);

    expect(result.order?.legacyId).toBe(validOrder.legacyId);
    expect(result.lines).toHaveLength(1);
    expect(result.payments).toHaveLength(1);
    // Type preservation carried through the service layer unchanged:
    expect(typeof result.order?.orderId).toBe('number');
    expect(typeof result.payments[0]?.orderId).toBe('string');
  });

  it('returns a null order (not a throw) for a GroupId with no matching order row', async () => {
    const db = createSeededFakeDb({ orders: [], orderProducts: [], payments: [] });

    const result = await getBuyerOrderView(db, 9999);

    expect(result.order).toBeNull();
    expect(result.lines).toEqual([]);
    expect(result.payments).toEqual([]);
  });
});

describe('getBuyerManageOrdersView (UNIT + FIXTURE) — M4 buyer-orders slice', () => {
  it('joins product name/slug into each order-line row, buyer-filtered', async () => {
    const db = createSeededFakeDb({
      orders: [validOrder],
      orderProducts: [validOrderProduct],
      payments: [validPayment],
      products: [validProduct],
    });

    const rows = await getBuyerManageOrdersView(db, validOrderProduct.buyerId!);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      groupId: validOrder.groupId,
      qrTransectionId: validOrder.qrTransectionId,
      productSlug: validProduct.pSlug,
      productName: validProduct.pName,
      quantity: validOrderProduct.quantity,
      sellPrice: validOrderProduct.sellPrice,
      totalPrice: validOrderProduct.totalPrice,
      orderStatus: validOrderProduct.orderStatus,
    });
  });

  it("returns an empty array for a buyer with no orders (does not throw, does not leak another buyer's rows)", async () => {
    const db = createSeededFakeDb({
      orders: [validOrder],
      orderProducts: [validOrderProduct], // belongs to buyerId 1
      payments: [validPayment],
      products: [validProduct],
    });

    const rows = await getBuyerManageOrdersView(db, 999999);

    expect(rows).toEqual([]);
  });

  it('returns rows for MULTIPLE order lines within one GroupId (one order, several products)', async () => {
    const secondLine = {
      ...validOrderProduct,
      legacyId: validOrderProduct.legacyId + 1,
      productId: validProduct.legacyId + 1,
    };
    const secondProduct = {
      ...validProduct,
      legacyId: validProduct.legacyId + 1,
      pSlug: 'second-product',
      pName: 'Second Product',
    };
    const db = createSeededFakeDb({
      orders: [validOrder],
      orderProducts: [validOrderProduct, secondLine],
      payments: [validPayment],
      products: [validProduct, secondProduct],
    });

    const rows = await getBuyerManageOrdersView(db, validOrderProduct.buyerId!);

    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.productSlug).sort()).toEqual(['second-product', 'test-product']);
  });
});

describe('getBuyerOrderDetail (UNIT + FIXTURE) — M4 buyer-orders slice, B-12 correction', () => {
  it('returns the order with product-joined lines when the buyer owns it', async () => {
    const db = createSeededFakeDb({
      orders: [validOrder],
      orderProducts: [validOrderProduct],
      payments: [validPayment],
      products: [validProduct],
    });

    const detail = await getBuyerOrderDetail(db, validOrder.groupId!, validOrderProduct.buyerId!);

    expect(detail).not.toBeNull();
    expect(detail?.order.legacyId).toBe(validOrder.legacyId);
    expect(detail?.lines).toHaveLength(1);
    expect(detail?.lines[0]?.product?.pSlug).toBe(validProduct.pSlug);
    expect(detail?.payments).toHaveLength(1);
  });

  it("returns null when a different buyer requests the order (B-12 correction's security requirement)", async () => {
    const db = createSeededFakeDb({
      orders: [validOrder],
      orderProducts: [validOrderProduct],
      payments: [validPayment],
      products: [validProduct],
    });

    const detail = await getBuyerOrderDetail(
      db,
      validOrder.groupId!,
      validOrderProduct.buyerId! + 999
    );

    expect(detail).toBeNull();
  });

  it('returns null for a nonexistent GroupId (same shape as wrong-owner — no enumeration signal)', async () => {
    const db = createSeededFakeDb({ orders: [], orderProducts: [], payments: [], products: [] });

    const detail = await getBuyerOrderDetail(db, 999999, 1);

    expect(detail).toBeNull();
  });

  it('sets product to null for a line whose productId has no matching product (tolerant, not a throw)', async () => {
    const orphanLine = { ...validOrderProduct, productId: 999999 };
    const db = createSeededFakeDb({
      orders: [validOrder],
      orderProducts: [orphanLine],
      payments: [validPayment],
      products: [validProduct],
    });

    const detail = await getBuyerOrderDetail(db, validOrder.groupId!, orphanLine.buyerId!);

    expect(detail?.lines[0]?.product).toBeNull();
  });
});

describe('cancelBuyerOrder (UNIT + FIXTURE) — M4 buyer-orders slice', () => {
  it("cancels the buyer's own order", async () => {
    const db = createSeededFakeDb({
      orders: [{ ...validOrder }],
      orderProducts: [{ ...validOrderProduct }],
      payments: [{ ...validPayment }],
    });

    const result = await cancelBuyerOrder(db, validOrder.groupId!, validOrderProduct.buyerId!);

    expect(result).toBe(true);
  });

  it("refuses to cancel another buyer's order", async () => {
    const db = createSeededFakeDb({
      orders: [{ ...validOrder }],
      orderProducts: [{ ...validOrderProduct }],
      payments: [{ ...validPayment }],
    });

    const result = await cancelBuyerOrder(
      db,
      validOrder.groupId!,
      validOrderProduct.buyerId! + 999
    );

    expect(result).toBe(false);
  });
});
