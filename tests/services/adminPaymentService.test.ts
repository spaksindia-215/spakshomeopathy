/**
 * `adminPaymentService` tests — CR-006 Phase 3. Same fixture pattern as
 * `adminOrderService.test.ts`/`orderService.test.ts`.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  getAdminPaymentsView,
  getSellerPaymentsView,
  updatePaymentStatus,
} from '@/lib/services/adminPaymentService';
import { validPayment, validProduct } from '../mongodb/fixtures';
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

describe('getAdminPaymentsView (UNIT + FIXTURE)', () => {
  it('mirrors ManagePayment: ALL payments joined to products/users', async () => {
    const payment = { ...validPayment, sid: 42 };
    const db = createSeededFakeDb({
      payments: [payment],
      products: [validProduct],
      users: [{ legacyId: 42, email: 'seller42@example.invalid' }],
    });

    const rows = await getAdminPaymentsView(db);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.sellerEmail).toBe('seller42@example.invalid');
    expect(rows[0]?.productName).toBe(validProduct.pName);
    expect(rows[0]?.qunt).toBe(validPayment.qunt);
  });
});

describe('getSellerPaymentsView (UNIT + FIXTURE)', () => {
  it('filters by sid, matching SellerPayment’s WHERE clause', async () => {
    const paymentA = { ...validPayment, legacyId: 1, sid: 42 };
    const paymentB = { ...validPayment, legacyId: 2, sid: 43 };
    const db = createSeededFakeDb({
      payments: [paymentA, paymentB],
      products: [validProduct],
      users: [{ legacyId: 42, email: 'seller42@example.invalid' }],
    });

    const rows = await getSellerPaymentsView(db, 42);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.paymentLegacyId).toBe(1);
  });
});

describe('updatePaymentStatus (UNIT + FIXTURE)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('mirrors ChangePaymentStatus: sets payStatus=2 and payDate to today, formatted "d M, Y"', async () => {
    // Fixed to local noon (not UTC midnight/end-of-day) so this assertion
    // is stable regardless of the test runner's timezone — formatPayDate
    // uses LOCAL date parts (getDate/getFullYear), matching PHP's
    // date('d M, Y') own server-local-time behavior; a UTC-boundary
    // timestamp would make this test's expected string timezone-dependent
    // for the wrong reason (test fragility, not a real behavior question).
    const fixedNow = new Date();
    fixedNow.setHours(12, 0, 0, 0);
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);

    const expectedDay = String(fixedNow.getDate()).padStart(2, '0');
    const expectedMonth = fixedNow.toLocaleString('en-US', { month: 'short' });
    const expectedYear = fixedNow.getFullYear();
    const expectedPayDate = `${expectedDay} ${expectedMonth}, ${expectedYear}`;

    const db = createSeededFakeDb({ payments: [{ ...validPayment }] });

    await updatePaymentStatus(db, validPayment.legacyId);

    const [payment] = await db.collection('payments').find({}).toArray();
    expect(payment?.payStatus).toBe(2);
    expect(payment?.payDate).toBe(expectedPayDate);
  });
});
