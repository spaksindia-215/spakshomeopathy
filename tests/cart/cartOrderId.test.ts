/**
 * `generateCartOrderId` tests — mirrors `CartController.php:283-286`
 * (blueprint §7.5's "Cart checkout" `getOrderId` scheme).
 *
 * LABEL: UNIT + FIXTURE. Against a minimal seeded fake `Db` supporting
 * `.find().sort().limit().toArray()` (same fake-Db style as
 * `tests/services/orderService.test.ts`, extended with sort/limit
 * chaining since `OrderRepository.findHighestLegacyId` needs it), NOT a
 * real MongoDB connection.
 */

import { describe, it, expect, vi } from 'vitest';
import type { Db, Document } from 'mongodb';

function createFakeDbWithOrders(orders: Document[]): Db {
  return {
    collection: () => ({
      find: () => ({
        sort: (spec: Record<string, 1 | -1>) => ({
          limit: (n: number) => ({
            toArray: async () => {
              const key = Object.keys(spec)[0]!;
              const direction = spec[key]!;
              const sorted = [...orders].sort((a, b) => {
                const av = (a as Record<string, number>)[key]!;
                const bv = (b as Record<string, number>)[key]!;
                return direction === -1 ? bv - av : av - bv;
              });
              return sorted.slice(0, n);
            },
          }),
        }),
      }),
    }),
  } as unknown as Db;
}

const baseOrder = {
  qrTransectionId: 'QR-TEST-001',
  custId: 1,
  sellerId: null,
  groupId: 100,
  productId: 1,
  quantity: 2,
  sellPrice: '90',
  deliveryPrice: 0,
  totalPrice: 180,
  orderId: 1200101,
  orderNotes: null,
  orderStatus: 1,
  payMode: 'qr',
  orderDate: '2026-01-01',
  deliveryDate: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('generateCartOrderId (UNIT + FIXTURE — fake Db)', () => {
  it('generates "{rand(99-9999)}{MAX(legacyId)+1}" — CartController.php:283-286', async () => {
    const { generateCartOrderId } = await import('@/lib/cartOrderId');
    const db = createFakeDbWithOrders([
      { ...baseOrder, legacyId: 5 },
      { ...baseOrder, legacyId: 12 }, // highest
      { ...baseOrder, legacyId: 3 },
    ]);

    const orderId = await generateCartOrderId(db);
    // IncrementId = MAX(legacyId) + 1 = 13; randPart in [99, 9999]
    expect(orderId).toMatch(/^\d+13$/);
    const randPart = Number(orderId.slice(0, orderId.length - 2));
    expect(randPart).toBeGreaterThanOrEqual(99);
    expect(randPart).toBeLessThanOrEqual(9999);
  });

  it('is a plain numeric-string CONCATENATION, not addition (PHP `.` operator, not `+`)', async () => {
    const { generateCartOrderId } = await import('@/lib/cartOrderId');
    const db = createFakeDbWithOrders([{ ...baseOrder, legacyId: 0 }]);

    // Force a deterministic rand() for this one assertion.
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0); // -> randInclusive(99,9999) = 99
    const orderId = await generateCartOrderId(db);
    randSpy.mockRestore();

    // IncrementId = 0 + 1 = 1; concatenation of "99" and "1" = "991", NOT 100
    expect(orderId).toBe('991');
  });

  it('handles an empty orders collection without throwing (IncrementId = 0)', async () => {
    const { generateCartOrderId } = await import('@/lib/cartOrderId');
    const db = createFakeDbWithOrders([]);

    const orderId = await generateCartOrderId(db);
    expect(orderId).toMatch(/^\d+0$/);
  });
});
