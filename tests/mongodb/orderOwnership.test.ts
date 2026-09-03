/**
 * `getOwnedOrderByGroupId` / `cancelOwnedOrder` / `getOrderGroupIdsForBuyer`
 * (ordering) tests — added M4 (buyer orders slice, B-12 correction).
 *
 * LABEL: UNIT + FIXTURE. A minimal in-memory fake `Db`/`Collection`
 * supporting `findOne`, `find`, `updateOne`, `updateMany` — the
 * operations these functions actually call — NOT a real MongoDB
 * connection. Real-data live verification is separate (see
 * `docs/B-12-RESOLUTION.md` §"Tests proving the correction" for the
 * `spaks_dev`-backed check).
 *
 * THE HIGHEST-VALUE ASSERTIONS HERE are the security-relevant ones this
 * task explicitly requires: ownership is checked BEFORE data is returned
 * or mutated, and a wrong-owner request changes NOTHING (no partial
 * write, no data leak).
 */

import { describe, it, expect } from 'vitest';
import {
  getOwnedOrderByGroupId,
  cancelOwnedOrder,
  getOrderGroupIdsForBuyer,
} from '@/lib/mongodb/repositories/orderRepository';
import { validOrder, validOrderProduct, validPayment } from './fixtures';
import type { Order, OrderProduct, Payment } from '@/lib/mongodb/schemas';
import type { Db, Collection, Document, Filter } from 'mongodb';

function createFakeDb(seed: {
  orders?: Order[];
  orderProducts?: OrderProduct[];
  payments?: Payment[];
}): { db: Db; seed: { orders: Order[]; orderProducts: OrderProduct[]; payments: Payment[] } } {
  const store = {
    orders: [...(seed.orders ?? [])] as Document[],
    orderProducts: [...(seed.orderProducts ?? [])] as Document[],
    payments: [...(seed.payments ?? [])] as Document[],
  };

  function matches(doc: Document, filter: Filter<Document>): boolean {
    return Object.entries(filter).every(([k, v]) => doc[k] === v);
  }

  function makeCollection(name: keyof typeof store): Collection<Document> {
    return {
      findOne: async (filter: Filter<Document>) => {
        return store[name].find((d) => matches(d, filter)) ?? null;
      },
      find: (filter: Filter<Document>) => ({
        toArray: async () => store[name].filter((d) => matches(d, filter)),
      }),
      updateOne: async (filter: Filter<Document>, update: { $set: Record<string, unknown> }) => {
        const doc = store[name].find((d) => matches(d, filter));
        if (doc) Object.assign(doc, update.$set);
        return { acknowledged: true, matchedCount: doc ? 1 : 0, modifiedCount: doc ? 1 : 0 };
      },
      updateMany: async (filter: Filter<Document>, update: { $set: Record<string, unknown> }) => {
        const docs = store[name].filter((d) => matches(d, filter));
        for (const doc of docs) Object.assign(doc, update.$set);
        return { acknowledged: true, matchedCount: docs.length, modifiedCount: docs.length };
      },
    } as unknown as Collection<Document>;
  }

  const db = {
    collection: (name: string) => makeCollection(name as keyof typeof store),
  } as unknown as Db;

  return {
    db,
    seed: store as unknown as {
      orders: Order[];
      orderProducts: OrderProduct[];
      payments: Payment[];
    },
  };
}

describe('getOwnedOrderByGroupId (UNIT + FIXTURE)', () => {
  it('returns the reconstructed order when the requesting buyer owns it', async () => {
    const { db } = createFakeDb({
      orders: [validOrder],
      orderProducts: [validOrderProduct],
      payments: [validPayment],
    });

    const result = await getOwnedOrderByGroupId(
      db,
      validOrder.groupId!,
      validOrderProduct.buyerId!
    );

    expect(result).not.toBeNull();
    expect(result?.order?.legacyId).toBe(validOrder.legacyId);
    expect(result?.lines).toHaveLength(1);
    expect(result?.payments).toHaveLength(1);
  });

  it("returns null when a DIFFERENT buyer requests someone else's order (buyer A cannot view buyer B's order)", async () => {
    const { db } = createFakeDb({
      orders: [validOrder],
      orderProducts: [validOrderProduct], // buyerId: 1
      payments: [validPayment],
    });

    const wrongBuyerId = validOrderProduct.buyerId! + 999;
    const result = await getOwnedOrderByGroupId(db, validOrder.groupId!, wrongBuyerId);

    expect(result).toBeNull();
  });

  it('returns null for a nonexistent GroupId (matches "order not found" outcome, not distinguishable from wrong-owner)', async () => {
    const { db } = createFakeDb({ orders: [], orderProducts: [], payments: [] });

    const result = await getOwnedOrderByGroupId(db, 999999, 1);

    expect(result).toBeNull();
  });
});

describe('cancelOwnedOrder (UNIT + FIXTURE)', () => {
  it('cancels (sets orderStatus=4 in all three collections) when the buyer owns the order', async () => {
    const { db, seed } = createFakeDb({
      orders: [{ ...validOrder }],
      orderProducts: [{ ...validOrderProduct }],
      payments: [{ ...validPayment }],
    });

    const result = await cancelOwnedOrder(db, validOrder.groupId!, validOrderProduct.buyerId!);

    expect(result).toBe(true);
    expect(seed.orders[0]?.orderStatus).toBe(4);
    expect(seed.orderProducts[0]?.orderStatus).toBe(4);
    expect(seed.payments[0]?.orderStatus).toBe(4);
  });

  it("does NOT cancel when a DIFFERENT buyer attempts it (buyer A cannot cancel buyer B's order) — nothing is mutated", async () => {
    const { db, seed } = createFakeDb({
      orders: [{ ...validOrder }],
      orderProducts: [{ ...validOrderProduct }], // buyerId: 1, orderStatus: 1
      payments: [{ ...validPayment }],
    });

    const wrongBuyerId = validOrderProduct.buyerId! + 999;
    const result = await cancelOwnedOrder(db, validOrder.groupId!, wrongBuyerId);

    expect(result).toBe(false);
    // Nothing was touched — status values remain exactly as seeded.
    expect(seed.orders[0]?.orderStatus).toBe(validOrder.orderStatus);
    expect(seed.orderProducts[0]?.orderStatus).toBe(validOrderProduct.orderStatus);
    expect(seed.payments[0]?.orderStatus).toBe(validPayment.orderStatus);
  });

  it('returns false for a nonexistent GroupId, performs no writes', async () => {
    const { db, seed } = createFakeDb({ orders: [], orderProducts: [], payments: [] });

    const result = await cancelOwnedOrder(db, 999999, 1);

    expect(result).toBe(false);
    expect(seed.orders).toHaveLength(0);
  });

  it('cancels ALL orderProducts lines sharing a GroupId, not just the first (updateMany, not updateOne)', async () => {
    const secondLine: OrderProduct = {
      ...validOrderProduct,
      legacyId: validOrderProduct.legacyId + 1,
      orderStatus: 2,
    };
    const { db, seed } = createFakeDb({
      orders: [{ ...validOrder }],
      orderProducts: [{ ...validOrderProduct }, secondLine],
      payments: [{ ...validPayment }],
    });

    await cancelOwnedOrder(db, validOrder.groupId!, validOrderProduct.buyerId!);

    expect(seed.orderProducts.every((l) => l.orderStatus === 4)).toBe(true);
  });
});

describe('getOrderGroupIdsForBuyer ordering (UNIT + FIXTURE)', () => {
  it('returns GroupIds ordered DESC by the underlying line legacyId (newest first, matching orderBy id DESC)', async () => {
    const buyerId = 42;
    const lines: OrderProduct[] = [
      { ...validOrderProduct, legacyId: 1, groupId: 100, buyerId },
      { ...validOrderProduct, legacyId: 3, groupId: 102, buyerId },
      { ...validOrderProduct, legacyId: 2, groupId: 101, buyerId },
    ];
    const { db } = createFakeDb({ orderProducts: lines });

    const groupIds = await getOrderGroupIdsForBuyer(db, buyerId);

    expect(groupIds).toEqual([102, 101, 100]); // legacyId 3, 2, 1 → DESC
  });

  it('deduplicates a GroupId with multiple lines, keeping its position from the NEWEST line', async () => {
    const buyerId = 42;
    const lines: OrderProduct[] = [
      { ...validOrderProduct, legacyId: 1, groupId: 100, buyerId },
      { ...validOrderProduct, legacyId: 5, groupId: 100, buyerId }, // same GroupId, newer line
      { ...validOrderProduct, legacyId: 2, groupId: 101, buyerId },
    ];
    const { db } = createFakeDb({ orderProducts: lines });

    const groupIds = await getOrderGroupIdsForBuyer(db, buyerId);

    // GroupId 100's newest line (legacyId 5) outranks GroupId 101's only
    // line (legacyId 2), so 100 comes first despite also having an older
    // line (legacyId 1).
    expect(groupIds).toEqual([100, 101]);
  });
});
