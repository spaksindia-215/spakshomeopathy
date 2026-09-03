/**
 * `checkoutService` tests — Milestone 6 (Checkout & orders).
 *
 * LABEL: UNIT + FIXTURE, against a minimal in-memory fake `Db` (same style
 * established by `tests/services/orderService.test.ts` and
 * `tests/cart/cartOrderId.test.ts`), NOT a real MongoDB connection — see
 * docs/GATE-REPORT-M6-CHECKOUT.md §"Verification Performed" for the
 * disclosed live-HTTP-verification gap this repeats from M5 (sandbox
 * MongoDB Atlas TLS connectivity failure).
 *
 * Exercises the business logic the task brief specifically calls out for
 * dedicated tests: fee arithmetic (P-17), GroupId generation (§7.5, R-6),
 * status-code writes (§7.6), and form-field parsing (postCheckout).
 * Encrypt/decrypt round-trip for cncl_id is already covered by
 * `tests/auth/orderToken.test.ts` (built in the B-12 slice) — not
 * duplicated here, per contract §5.2's "don't consolidate/duplicate"
 * guidance applied in reverse (don't re-test what's already tested).
 */

import { describe, it, expect, vi } from 'vitest';
import type { Db, Document, Filter } from 'mongodb';
import {
  validUser,
  validUserWithBuyerProfile,
  validProduct,
  validOrder,
  validOrderProduct,
  validPayment,
} from '../mongodb/fixtures';

/** A minimal, general-purpose fake `Db` supporting exactly the operations
 * `checkoutService.ts`'s repositories need: `find().sort().limit().toArray()`,
 * `findOne`, `find(filter).toArray()`, `insertOne`, `updateOne`. Extends the
 * pattern already established by `tests/services/orderService.test.ts`
 * (updateOne/updateMany) and `tests/cart/cartOrderId.test.ts` (sort/limit). */
function createFakeDb(seed: Record<string, Document[]>): {
  db: Db;
  stores: Record<string, Document[]>;
} {
  const stores: Record<string, Document[]> = Object.fromEntries(
    Object.entries(seed).map(([k, v]) => [k, [...v]])
  );

  function matches(doc: Document, filter: Filter<Document>): boolean {
    return Object.entries(filter).every(([key, value]) => {
      if (value !== null && typeof value === 'object' && '$in' in (value as object)) {
        const inValues = (value as { $in: unknown[] }).$in;
        return inValues.includes((doc as Record<string, unknown>)[key]);
      }
      return (doc as Record<string, unknown>)[key] === value;
    });
  }

  const db = {
    collection: (name: string) => {
      const data = (stores[name] ??= []);
      return {
        findOne: async (filter: Filter<Document>) => data.find((d) => matches(d, filter)) ?? null,
        find: (filter: Filter<Document> = {}) => ({
          sort: (spec: Record<string, 1 | -1>) => ({
            limit: (n: number) => ({
              toArray: async () => {
                const filtered = data.filter((d) => matches(d, filter));
                const key = Object.keys(spec)[0]!;
                const direction = spec[key]!;
                const sorted = [...filtered].sort((a, b) => {
                  const av = (a as Record<string, number>)[key] ?? 0;
                  const bv = (b as Record<string, number>)[key] ?? 0;
                  return direction === -1 ? bv - av : av - bv;
                });
                return sorted.slice(0, n);
              },
            }),
          }),
          toArray: async () => data.filter((d) => matches(d, filter)),
        }),
        insertOne: async (doc: Document) => {
          data.push(doc);
          return { acknowledged: true, insertedId: 'fake-id' };
        },
        updateOne: async (filter: Filter<Document>, update: { $set: Record<string, unknown> }) => {
          const doc = data.find((d) => matches(d, filter));
          if (doc) Object.assign(doc, update.$set);
          return { acknowledged: true, matchedCount: doc ? 1 : 0, modifiedCount: doc ? 1 : 0 };
        },
        updateMany: async (filter: Filter<Document>, update: { $set: Record<string, unknown> }) => {
          const docs = data.filter((d) => matches(d, filter));
          for (const doc of docs) Object.assign(doc, update.$set);
          return { acknowledged: true, matchedCount: docs.length, modifiedCount: docs.length };
        },
      };
    },
  } as unknown as Db;

  return { db, stores };
}

function makeCartLine(overrides: { price: number; quantity: number; id?: number }) {
  return {
    id: overrides.id ?? 1,
    name: 'Test Product',
    price: overrides.price,
    quantity: overrides.quantity,
    attributes: {
      image: 'img.jpg',
      image2: '',
      image3: '',
      image4: '',
      image5: '',
      image6: '',
      image7: '',
      image8: '',
      image9: '',
      image10: '',
      name2: '',
      name3: '',
      name4: '',
      name5: '',
      name6: '',
      name7: '',
      name8: '',
      name9: '',
      name10: '',
      uid: '',
    },
  };
}

describe('placeOfflinePaymentOrder (UNIT + FIXTURE) — HomeController::redirectToPaymentMethod', () => {
  it(
    'REPRODUCES a NEWLY DISCOVERED defect: the live orderproducts table has no ' +
      'qr_transection_id column, so a non-empty-cart placement throws ' +
      'OrderProductsColumnMismatchError — see checkoutService.ts header',
    async () => {
      vi.resetModules();
      vi.doMock('@/lib/cart', async () => {
        const actual = await vi.importActual<typeof import('@/lib/cart')>('@/lib/cart');
        return {
          ...actual,
          getCartContent: vi.fn().mockResolvedValue([makeCartLine({ price: 333, quantity: 1 })]),
          clearCart: vi.fn().mockResolvedValue(undefined),
        };
      });
      const { placeOfflinePaymentOrder, OrderProductsColumnMismatchError } = await import(
        '@/lib/services/checkoutService'
      );
      const { stores, db } = createFakeDb({
        users: [validUserWithBuyerProfile],
        products: [{ ...validProduct, legacyId: 1, uid: 7 }],
        orderProducts: [],
        orders: [],
        payments: [],
      });

      await expect(
        placeOfflinePaymentOrder(db, {
          buyerLegacyId: 1,
          transectionId: 'TXN123',
          pinCode: '110025',
          fullAddress: 'Addr',
          houseNo: '1',
          landmark: 'LM',
          state: 'Delhi',
          orderId: '999888',
          amount: '333',
          orderNotes: 'note',
          deliveryCharge: '0',
        })
      ).rejects.toBeInstanceOf(OrderProductsColumnMismatchError);

      // The `orders` header row DOES get written before the crash (source's
      // own INSERT at HomeController.php:770-783 runs before the failing
      // loop) — but NO orderProducts/payments row is ever written, matching
      // the point at which MySQL would reject the loop's first INSERT.
      expect(stores.orders!.length).toBe(1);
      expect(stores.orders![0]!.payMode).toBe('offline_payment');
      expect(stores.orders![0]!.orderStatus).toBe(0);
      expect(stores.orders![0]!.qrTransectionId).toBe('TXN123');
      expect(stores.orderProducts!.length).toBe(0);
      expect(stores.payments!.length).toBe(0);

      vi.doUnmock('@/lib/cart');
    }
  );

  it('does NOT throw for an EMPTY cart — source never enters the failing loop body at all', async () => {
    vi.resetModules();
    vi.doMock('@/lib/cart', async () => {
      const actual = await vi.importActual<typeof import('@/lib/cart')>('@/lib/cart');
      return {
        ...actual,
        getCartContent: vi.fn().mockResolvedValue([]),
        clearCart: vi.fn().mockResolvedValue(undefined),
      };
    });
    const { placeOfflinePaymentOrder } = await import('@/lib/services/checkoutService');
    const { stores, db } = createFakeDb({
      users: [validUserWithBuyerProfile],
      products: [],
      orderProducts: [],
      orders: [],
      payments: [],
    });

    await expect(
      placeOfflinePaymentOrder(db, {
        buyerLegacyId: 1,
        transectionId: 'T',
        pinCode: null,
        fullAddress: null,
        houseNo: null,
        landmark: null,
        state: null,
        orderId: '1',
        amount: '0',
        orderNotes: null,
        deliveryCharge: '0',
      })
    ).resolves.toBeUndefined();

    expect(stores.orders!.length).toBe(1);
    expect(stores.orderProducts!.length).toBe(0);

    vi.doUnmock('@/lib/cart');
  });

  it("GroupId = MAX(orderproducts.GroupId)+1 for the `orders` row, matching the FIRST of source's two reads", async () => {
    vi.resetModules();
    vi.doMock('@/lib/cart', async () => {
      const actual = await vi.importActual<typeof import('@/lib/cart')>('@/lib/cart');
      return {
        ...actual,
        getCartContent: vi.fn().mockResolvedValue([]), // empty — isolates the `orders`-row
        // GroupId assertion from the (separately tested) crash path above
        clearCart: vi.fn().mockResolvedValue(undefined),
      };
    });
    const { placeOfflinePaymentOrder } = await import('@/lib/services/checkoutService');
    const { stores, db } = createFakeDb({
      users: [validUserWithBuyerProfile],
      products: [],
      orderProducts: [{ ...validOrderProduct, legacyId: 1, groupId: 41 }],
      orders: [],
      payments: [],
    });

    await placeOfflinePaymentOrder(db, {
      buyerLegacyId: 1,
      transectionId: 'T',
      pinCode: null,
      fullAddress: null,
      houseNo: null,
      landmark: null,
      state: null,
      orderId: '1',
      amount: '0',
      orderNotes: null,
      deliveryCharge: '0',
    });

    // highest existing orderProducts.GroupId = 41 -> new GroupId = 42.
    expect(stores.orders![0]!.groupId).toBe(42);

    vi.doUnmock('@/lib/cart');
  });
});

describe(
  'computeOrderProductWrite (UNIT) — the P-17 arithmetic redirectToPaymentMethod' +
    "'s loop WOULD apply, if the live schema didn't reject the INSERT first",
  () => {
    it('AdminFee=round(total*5/100), SellerPay=total-AdminFee — preserved to the rupee', async () => {
      const { computeOrderProductWrite } = await import('@/lib/services/checkoutService');
      const item = makeCartLine({ price: 333, quantity: 1 });

      const { lineDoc, paymentDoc } = computeOrderProductWrite(
        item,
        42,
        {
          buyerLegacyId: 1,
          transectionId: 'T',
          pinCode: null,
          fullAddress: null,
          houseNo: null,
          landmark: null,
          state: null,
          orderId: null,
          amount: null,
          orderNotes: null,
          deliveryCharge: '0',
        },
        { uid: 9 }
      );

      // totalAmount = 1*333 = 333; AdminFee = round(333*5/100) = round(16.65) = 17
      expect(paymentDoc.totalAmount).toBe(333);
      expect(paymentDoc.adminFee).toBe(17);
      expect(paymentDoc.sellerPay).toBe(333 - 17);
      expect(paymentDoc.payMode).toBe('offline_payment');
      expect(paymentDoc.gid).toBe(42);
      expect(lineDoc.groupId).toBe(42);
      expect(lineDoc.sellerId).toBe(9);
      expect(lineDoc.orderStatus).toBe(0);
    });

    it('rounds .5 cases per JS Math.round (round-half-up for positive numbers, matching PHP round())', async () => {
      const { computeOrderProductWrite } = await import('@/lib/services/checkoutService');
      const item = makeCartLine({ price: 10, quantity: 1 }); // total=10, 10*5/100=0.5
      const { paymentDoc } = computeOrderProductWrite(
        item,
        1,
        {
          buyerLegacyId: 1,
          transectionId: 'T',
          pinCode: null,
          fullAddress: null,
          houseNo: null,
          landmark: null,
          state: null,
          orderId: null,
          amount: null,
          orderNotes: null,
          deliveryCharge: null,
        },
        null
      );
      expect(paymentDoc.adminFee).toBe(1); // round(0.5) = 1
      expect(paymentDoc.sellerPay).toBe(9);
    });
  }
);

describe('saveOrderLegacy (UNIT + FIXTURE) — HomeController::saveOrder (DEAD route, still ported)', () => {
  it("payMode='online_payment' (distinct literal from the live path's 'offline_payment')", async () => {
    vi.resetModules();
    vi.doMock('@/lib/cart', async () => {
      const actual = await vi.importActual<typeof import('@/lib/cart')>('@/lib/cart');
      return {
        ...actual,
        getCartContent: vi.fn().mockResolvedValue([
          {
            id: 1,
            name: 'P',
            price: 40,
            quantity: 3,
            attributes: {
              image: 'i.jpg',
              image2: '',
              image3: '',
              image4: '',
              image5: '',
              image6: '',
              image7: '',
              image8: '',
              image9: '',
              image10: '',
              name2: '',
              name3: '',
              name4: '',
              name5: '',
              name6: '',
              name7: '',
              name8: '',
              name9: '',
              name10: '',
              uid: '',
            },
          },
        ]),
        clearCart: vi.fn().mockResolvedValue(undefined),
      };
    });
    const { saveOrderLegacy } = await import('@/lib/services/checkoutService');
    const { stores, db } = createFakeDb({
      users: [validUser], // NOTE: no buyerProfile — exercises the "no else-insert" branch
      products: [{ ...validProduct, legacyId: 1, uid: 9 }],
      orderProducts: [],
      orders: [],
      payments: [],
    });

    const orderLegacyId = await saveOrderLegacy(db, {
      buyerLegacyId: 1,
      pinCode: '1',
      fullAddress: 'a',
      houseNo: '1',
      landmark: 'l',
      state: 's',
      orderId: '55',
      orderNotes: 'n',
    });

    expect(typeof orderLegacyId).toBe('number');
    const payment = stores.payments![0]!;
    expect(payment.payMode).toBe('online_payment');
    // AdminFee = round(120*5/100) = round(6) = 6
    expect(payment.totalAmount).toBe(120);
    expect(payment.adminFee).toBe(6);
    expect(payment.sellerPay).toBe(114);

    // buyer_profile update-only (no existing profile) — user stays without one.
    const user = stores.users!.find((u) => u.legacyId === 1)!;
    expect(user.buyerProfile).toBeUndefined();

    vi.doUnmock('@/lib/cart');
  });
});

describe('successOrderLegacy (UNIT + FIXTURE) — HomeController::SuccessOrder, contract §10.4', () => {
  it("orderId = 1200 + lastId is NUMERIC ADDITION, not string concatenation ('1200'+$id)", async () => {
    const { successOrderLegacy } = await import('@/lib/services/checkoutService');
    const { db } = createFakeDb({
      users: [validUserWithBuyerProfile],
      products: [{ ...validProduct, legacyId: 1, pPrice: 200, uid: 4 }],
      orders: [{ ...validOrder, legacyId: 57 }], // MAX(legacyId) = 57
      payments: [],
      baskets: [],
      sellerPayments: [],
    });

    const result = await successOrderLegacy(db, {
      buyerLegacyId: 1,
      pid: 1,
      pinCode: '1',
      fullAddress: 'a',
      houseNo: '1',
      landmark: 'l',
      state: 's',
      country: 'India',
      bid: null,
      sid: null,
      ptype: null,
      orderNotes: null,
      shippingTimeDays: 3,
    });

    expect(result.row).not.toBeNull();
    // 1200 + 57 = 1257 (numeric), NOT the string "120057" a naive
    // concatenation would produce.
    expect(result.row!.orderId).toBe(1257);
    expect(result.row!.orderId).not.toBe('120057' as unknown);
  });

  it('returns { row: null } for a non-matching product id (unreproducible PHP null-deref fatal)', async () => {
    const { successOrderLegacy } = await import('@/lib/services/checkoutService');
    const { db } = createFakeDb({
      users: [validUserWithBuyerProfile],
      products: [],
      orders: [],
      payments: [],
      baskets: [],
      sellerPayments: [],
    });

    const result = await successOrderLegacy(db, {
      buyerLegacyId: 1,
      pid: 999,
      pinCode: null,
      fullAddress: null,
      houseNo: null,
      landmark: null,
      state: null,
      country: null,
      bid: null,
      sid: null,
      ptype: null,
      orderNotes: null,
      shippingTimeDays: 0,
    });

    expect(result.row).toBeNull();
  });

  it('fee is UNROUNDED ((total*5)/100, no round()) — distinct from the live path', async () => {
    const { successOrderLegacy } = await import('@/lib/services/checkoutService');
    const { db, stores } = createFakeDb({
      users: [validUserWithBuyerProfile],
      products: [{ ...validProduct, legacyId: 1, pPrice: 333, uid: 4 }],
      orders: [{ ...validOrder, legacyId: 1 }],
      payments: [],
      baskets: [],
      sellerPayments: [],
    });

    await successOrderLegacy(db, {
      buyerLegacyId: 1,
      pid: 1,
      pinCode: '1',
      fullAddress: 'a',
      houseNo: '1',
      landmark: 'l',
      state: 's',
      country: 'India',
      bid: null,
      sid: null,
      ptype: null,
      orderNotes: null,
      shippingTimeDays: 0,
    });

    const sellerPayment = stores.sellerPayments![0]!;
    // totalPrice = 1*333 = 333; fee = (333*5)/100 = 16.65 (unrounded)
    expect(sellerPayment.fee).toBe('16.65');
  });
});

describe('buildPostCheckoutProducts (UNIT) — HomeController::postCheckout', () => {
  it('zips productIds[]/price[]/qty[] into {product_id,price,qty}-shaped lines, matching source key names', async () => {
    const { buildPostCheckoutProducts } = await import('@/lib/services/checkoutService');
    const form = new FormData();
    form.append('name', 'Ignored'); // dead read, see source
    form.append('productIds[]', '10');
    form.append('productIds[]', '20');
    form.append('price[]', '100');
    form.append('price[]', '200');
    form.append('qty[]', '1');
    form.append('qty[]', '2');

    const lines = buildPostCheckoutProducts(form);
    expect(lines).toEqual([
      { productId: '10', price: '100', qty: '1' },
      { productId: '20', price: '200', qty: '2' },
    ]);
  });

  it('handles zero product lines without throwing', async () => {
    const { buildPostCheckoutProducts } = await import('@/lib/services/checkoutService');
    const form = new FormData();
    const lines = buildPostCheckoutProducts(form);
    expect(lines).toEqual([]);
  });
});

describe('cancelOwnedOrder status codes (UNIT + FIXTURE) — re-verifying M6 checklist item', () => {
  it('buyer cancel writes 4 uniformly to orders/orderProducts/payments (no P-03 inconsistency on THIS path)', async () => {
    const { cancelOwnedOrder } = await import('@/lib/mongodb/repositories/orderRepository');
    const { db, stores } = createFakeDb({
      orders: [{ ...validOrder, groupId: 77, orderStatus: 0 }],
      orderProducts: [{ ...validOrderProduct, groupId: 77, buyerId: 1, orderStatus: 0 }],
      payments: [{ ...validPayment, gid: 77, orderStatus: 0 }],
    });

    const ok = await cancelOwnedOrder(db, 77, 1);
    expect(ok).toBe(true);
    expect(stores.orders![0]!.orderStatus).toBe(4);
    expect(stores.orderProducts![0]!.orderStatus).toBe(4);
    expect(stores.payments![0]!.orderStatus).toBe(4);
  });

  it('rejects cancellation for a non-owning buyer, performs no write', async () => {
    const { cancelOwnedOrder } = await import('@/lib/mongodb/repositories/orderRepository');
    const { db, stores } = createFakeDb({
      orders: [{ ...validOrder, groupId: 88, orderStatus: 0 }],
      orderProducts: [{ ...validOrderProduct, groupId: 88, buyerId: 1, orderStatus: 0 }],
      payments: [{ ...validPayment, gid: 88, orderStatus: 0 }],
    });

    const ok = await cancelOwnedOrder(db, 88, 999); // wrong buyer
    expect(ok).toBe(false);
    expect(stores.orders![0]!.orderStatus).toBe(0);
  });
});
