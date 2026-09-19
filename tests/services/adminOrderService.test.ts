/**
 * `adminOrderService` tests — CR-006 Phase 3. Exercises the thin service
 * wrappers over the ALREADY-EXISTING `OrderRepository`/
 * `OrderProductRepository`/`PaymentRepository` (built M3-A), same pattern
 * as `tests/services/orderService.test.ts` for the buyer-side equivalents.
 *
 * LABEL: UNIT + FIXTURE. Against a minimal seeded fake `Db` (same pattern
 * as `orderService.test.ts`), NOT a real MongoDB connection.
 */

import { describe, it, expect } from 'vitest';
import {
  getAdminOrderListView,
  getSellerOrdersView,
  shipOrder,
  adminCancelOrder,
  getAdminOrderDetail,
} from '@/lib/services/adminOrderService';
import {
  validOrder,
  validOrderProduct,
  validPayment,
  validProduct,
  validUser,
  validUserWithBuyerProfile,
} from '../mongodb/fixtures';
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
        find: (filter: Filter<Document> = {}) => ({
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

describe('getAdminOrderListView (UNIT + FIXTURE)', () => {
  it('mirrors ManageOrders: ALL order lines, no buyer filter, joined to products', async () => {
    const otherBuyerLine = { ...validOrderProduct, legacyId: 2, buyerId: 999, groupId: 200 };
    const db = createSeededFakeDb({
      orderProducts: [validOrderProduct, otherBuyerLine],
      products: [validProduct],
    });

    const rows = await getAdminOrderListView(db);

    // Unlike the buyer-side view, ManageOrders has NO buyer filter — both
    // lines must appear regardless of buyerId.
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.orderLineLegacyId).sort()).toEqual([1, 2]);
  });

  it('sorts DESC by the underlying order line legacyId, matching orderBy(id, DESC)', async () => {
    const older = { ...validOrderProduct, legacyId: 1 };
    const newer = { ...validOrderProduct, legacyId: 5 };
    const db = createSeededFakeDb({
      orderProducts: [older, newer],
      products: [validProduct],
    });

    const rows = await getAdminOrderListView(db);

    expect(rows.map((r) => r.orderLineLegacyId)).toEqual([5, 1]);
  });

  it('joins product name/slug via legacyId, and reads image from the order line itself (not the product)', async () => {
    const db = createSeededFakeDb({
      orderProducts: [validOrderProduct],
      products: [validProduct],
    });

    const rows = await getAdminOrderListView(db);

    expect(rows[0]?.productName).toBe(validProduct.pName);
    expect(rows[0]?.productSlug).toBe(validProduct.pSlug);
    expect(rows[0]?.orderImage).toBe(validOrderProduct.orderImage);
  });
});

describe('getSellerOrdersView (UNIT + FIXTURE)', () => {
  it('filters by sellerId, matching SellerOrders’ SellerId join condition', async () => {
    const sellerLine = { ...validOrderProduct, legacyId: 3, sellerId: 42 };
    const otherSellerLine = { ...validOrderProduct, legacyId: 4, sellerId: 43 };
    const db = createSeededFakeDb({
      orderProducts: [sellerLine, otherSellerLine],
      products: [validProduct],
      users: [{ ...validUser, legacyId: 42, email: 'seller42@example.invalid' }],
    });

    const rows = await getSellerOrdersView(db, 42);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.orderLineLegacyId).toBe(3);
    expect(rows[0]?.sellerEmail).toBe('seller42@example.invalid');
  });
});

describe('shipOrder (UNIT + FIXTURE)', () => {
  it('mirrors ChangeOrderStatus: sets orderProducts.orderStatus=3 ONLY, does not touch orders', async () => {
    const db = createSeededFakeDb({
      orders: [{ ...validOrder }],
      orderProducts: [{ ...validOrderProduct }],
    });

    await shipOrder(db, validOrderProduct.groupId!);

    const [order] = await db.collection('orders').find({}).toArray();
    const [line] = await db.collection('orderProducts').find({}).toArray();

    expect(line?.orderStatus).toBe(3);
    // The documented asymmetry: `orders.orderStatus` must remain
    // UNCHANGED from its seeded value — ChangeOrderStatus never touches
    // the `orders` collection at all.
    expect(order?.orderStatus).toBe(validOrder.orderStatus);
  });
});

describe('adminCancelOrder (UNIT + FIXTURE)', () => {
  it('mirrors CancelOrder: orders/orderProducts=5, payments=4 (P-03 mismatch preserved)', async () => {
    const db = createSeededFakeDb({
      orders: [{ ...validOrder }],
      orderProducts: [{ ...validOrderProduct }],
      payments: [{ ...validPayment }],
    });

    await adminCancelOrder(db, validOrder.groupId!);

    const [order] = await db.collection('orders').find({}).toArray();
    const [line] = await db.collection('orderProducts').find({}).toArray();
    const [payment] = await db.collection('payments').find({}).toArray();

    expect(order?.orderStatus).toBe(5);
    expect(line?.orderStatus).toBe(5);
    // P-03: payments gets a DIFFERENT value (4) than orders/orderProducts
    // (5) — this is the actual, preserved Laravel behavior, not a bug in
    // this test.
    expect(payment?.orderStatus).toBe(4);
  });

  it('performs no ownership check — cancels regardless of which buyer the order belongs to', async () => {
    const db = createSeededFakeDb({
      orders: [{ ...validOrder, custId: 999 }],
      orderProducts: [{ ...validOrderProduct, buyerId: 999 }],
      payments: [{ ...validPayment }],
    });

    // No buyerId parameter exists on this function's signature at all —
    // an admin can cancel any order, matching AdminController::CancelOrder
    // exactly (contrast with the buyer path's owner-authorized ownership
    // check in cancelOwnedOrder/cancelBuyerOrder).
    await adminCancelOrder(db, validOrder.groupId!);

    const [order] = await db.collection('orders').find({}).toArray();
    expect(order?.orderStatus).toBe(5);
  });
});

describe('getAdminOrderDetail (UNIT + FIXTURE)', () => {
  it('mirrors ViewOrder: looked up by the ORDER LINE legacyId, not GroupId', async () => {
    const line = {
      ...validOrderProduct,
      legacyId: 42,
      buyerId: validUserWithBuyerProfile.legacyId,
    };
    const db = createSeededFakeDb({
      orderProducts: [line],
      products: [validProduct],
      users: [validUserWithBuyerProfile],
    });

    const detail = await getAdminOrderDetail(db, 42);

    expect(detail).not.toBeNull();
    expect(detail?.orderLineLegacyId).toBe(42);
  });

  it('joins buyer name/mobile/email from users and address fields from the embedded buyerProfile', async () => {
    const line = { ...validOrderProduct, buyerId: validUserWithBuyerProfile.legacyId };
    const db = createSeededFakeDb({
      orderProducts: [line],
      products: [validProduct],
      users: [validUserWithBuyerProfile],
    });

    const detail = await getAdminOrderDetail(db, line.legacyId);

    expect(detail?.buyerName).toBe(validUserWithBuyerProfile.name);
    expect(detail?.buyerMobile).toBe(validUserWithBuyerProfile.mobile);
    expect(detail?.buyerEmail).toBe(validUserWithBuyerProfile.email);
    expect(detail?.fullAddress).toBe(validUserWithBuyerProfile.buyerProfile?.fullAddress);
    expect(detail?.pinCode).toBe(validUserWithBuyerProfile.buyerProfile?.pinCode);
    expect(detail?.state).toBe(validUserWithBuyerProfile.buyerProfile?.state);
  });

  it('returns null for a non-existent order line, instead of reproducing a null-object crash', async () => {
    const db = createSeededFakeDb({ orderProducts: [] });

    const detail = await getAdminOrderDetail(db, 9999);

    expect(detail).toBeNull();
  });

  it('resolves product name/HSN code via the join, and leaves them null when the product is missing', async () => {
    const line = { ...validOrderProduct, productId: null };
    const db = createSeededFakeDb({ orderProducts: [line], users: [] });

    const detail = await getAdminOrderDetail(db, line.legacyId);

    expect(detail?.productName).toBeNull();
    expect(detail?.hsnCode).toBeNull();
  });
});
