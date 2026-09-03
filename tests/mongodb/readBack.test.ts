/**
 * M3-C §10 — Read-back tests.
 *
 * Owner instruction: "After migration, read representative records back
 * through the MongoDB repositories. Verify that the repositories return
 * the expected structures. Test at least: product, user/buyer, order,
 * orderProducts, payment, enquiry, appointment, category. Do NOT build UI
 * yet. Do NOT replace Laravel APIs yet. This is repository/data-layer
 * verification only."
 *
 * Against a FAKE MongoDB `Db`/`Collection` seeded with one representative
 * document per entity — proves the repository's find/findOne methods
 * return correctly-shaped, correctly-typed data, WITHOUT any real
 * database connection. This is the repository-layer read-back the owner
 * asked for; it is explicitly NOT a UI test and NOT a Laravel-API
 * replacement (no route, no page, no fetch handler exists here).
 */

import { describe, it, expect } from 'vitest';
import { UserRepository } from '@/lib/mongodb/repositories/userRepository';
import { ProductRepository } from '@/lib/mongodb/repositories/productRepository';
import { CategoryRepository } from '@/lib/mongodb/repositories/categoryRepository';
import {
  OrderRepository,
  OrderProductRepository,
  PaymentRepository,
  getOrderByGroupId,
} from '@/lib/mongodb/repositories/orderRepository';
import { ValidatedRepository } from '@/lib/mongodb/repositories/base';
import {
  enquirySchema,
  appointmentSchema,
  type Enquiry,
  type Appointment,
} from '@/lib/mongodb/schemas';
import {
  validUser,
  validProduct,
  validOrder,
  validOrderProduct,
  validPayment,
  validCategory,
} from '../mongodb/fixtures';
import type { Db, Collection, Document, Filter } from 'mongodb';

/**
 * A minimal fake `Db` backed by an in-memory array per collection,
 * supporting only `findOne`/`find` (the operations
 * `ValidatedRepository.findOne`/`.find` actually call) — deliberately
 * small so these tests exercise the REPOSITORY'S OWN LOGIC (validation on
 * read, filter matching) rather than a reimplementation of MongoDB query
 * semantics.
 */
function createSeededFakeDb(seed: Record<string, Document[]>): Db {
  return {
    collection: (name: string) => {
      const data = seed[name] ?? [];
      return {
        findOne: async (filter: Filter<Document>) => {
          return data.find((d) => matchesFilter(d, filter)) ?? null;
        },
        find: (filter: Filter<Document>) => ({
          toArray: async () => data.filter((d) => matchesFilter(d, filter)),
        }),
      } as unknown as Collection<Document>;
    },
  } as unknown as Db;
}

/** Minimal equality-only filter matcher — sufficient for these tests'
 * single-field filters (email, pSlug, groupId, etc.), not a general
 * MongoDB query-operator implementation. */
function matchesFilter(doc: Document, filter: Filter<Document>): boolean {
  return Object.entries(filter).every(([key, value]) => doc[key] === value);
}

describe('M3-C §10 — read-back: product', () => {
  it('ProductRepository.findBySlug returns the expected Product structure', async () => {
    const db = createSeededFakeDb({ products: [validProduct] });
    const repo = new ProductRepository(db);
    const result = await repo.findBySlug(validProduct.pSlug!);

    expect(result).not.toBeNull();
    expect(result?.legacyId).toBe(validProduct.legacyId);
    expect(result?.images).toEqual(validProduct.images);
    expect(result?.slot2).toEqual(validProduct.slot2); // 10-slot structure intact
  });
});

describe('M3-C §10 — read-back: user/buyer', () => {
  it('UserRepository.findByEmail returns the expected User structure, including embedded buyerProfile', async () => {
    const userWithProfile = {
      ...validUser,
      buyerProfile: {
        legacyId: 1,
        pinCode: '110025',
        fullAddress: 'Test',
        houseNo: null,
        landmark: null,
        state: null,
        country: null,
        deliveryType: null,
      },
    };
    const db = createSeededFakeDb({ users: [userWithProfile] });
    const repo = new UserRepository(db);
    const result = await repo.findByEmail(validUser.email);

    expect(result).not.toBeNull();
    expect(result?.email).toBe(validUser.email);
    expect(result?.buyerProfile?.pinCode).toBe('110025');
  });
});

describe('M3-C §10 — read-back: order, orderProducts, payment (via getOrderByGroupId)', () => {
  it('reconstructs an order with its lines and payments, matching the ★ join pattern', async () => {
    const db = createSeededFakeDb({
      orders: [validOrder],
      orderProducts: [validOrderProduct],
      payments: [validPayment],
    });

    const reconstructed = await getOrderByGroupId(db, validOrder.groupId!);

    expect(reconstructed.order?.legacyId).toBe(validOrder.legacyId);
    expect(reconstructed.lines).toHaveLength(1);
    expect(reconstructed.lines[0]?.legacyId).toBe(validOrderProduct.legacyId);
    expect(reconstructed.payments).toHaveLength(1);
    expect(reconstructed.payments[0]?.legacyId).toBe(validPayment.legacyId);
  });

  it('OrderRepository/OrderProductRepository/PaymentRepository individually read back their own shape correctly', async () => {
    const db = createSeededFakeDb({
      orders: [validOrder],
      orderProducts: [validOrderProduct],
      payments: [validPayment],
    });

    const orderRepo = new OrderRepository(db);
    const lineRepo = new OrderProductRepository(db);
    const paymentRepo = new PaymentRepository(db);

    const order = await orderRepo.findOne({ groupId: validOrder.groupId });
    const line = await lineRepo.findOne({ groupId: validOrderProduct.groupId });
    const payment = await paymentRepo.findOne({ gid: validPayment.gid });

    expect(typeof order?.orderId).toBe('number'); // preserved type
    expect(typeof line?.sellPrice).toBe('number'); // preserved type
    expect(typeof payment?.orderId).toBe('string'); // preserved type
  });
});

describe('M3-C §10 — read-back: enquiry', () => {
  it('a generic ValidatedRepository reads back an Enquiry document correctly', async () => {
    const enquiry: Enquiry = {
      legacyId: 1,
      name: 'Test',
      email: 'test@example.invalid',
      mobile: null,
      subject: 'Subject',
      message: 'Message',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    };
    const db = createSeededFakeDb({ enquiries: [enquiry] });
    const repo = new ValidatedRepository<Enquiry>(db, 'enquiries', enquirySchema);
    const result = await repo.findOne({ legacyId: 1 });

    expect(result?.subject).toBe('Subject');
    expect(result?.mobile).toBeNull(); // P-01: always null, preserved on read-back too
  });
});

describe('M3-C §10 — read-back: appointment', () => {
  it('a generic ValidatedRepository reads back an Appointment document correctly', async () => {
    const appointment: Appointment = {
      legacyId: 1,
      name: 'Test Patient',
      age: 30,
      gender: 'M',
      phone: '9000000000',
      appointmentDate: '2026-02-01',
      consultantHour: '10 AM',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    };
    const db = createSeededFakeDb({ appointments: [appointment] });
    const repo = new ValidatedRepository<Appointment>(db, 'appointments', appointmentSchema);
    const result = await repo.findOne({ legacyId: 1 });

    expect(result?.name).toBe('Test Patient');
    expect(result?.age).toBe(30);
  });
});

describe('M3-C §10 — read-back: category', () => {
  it('CategoryRepository.findByType returns the expected Category structure', async () => {
    const db = createSeededFakeDb({ categories: [validCategory] });
    const repo = new CategoryRepository(db);
    const results = await repo.findByType(validCategory.type, validCategory.status!);

    expect(results).toHaveLength(1);
    expect(results[0]?.type).toBe('N');
  });
});

// SCOPE NOTE (owner instruction, M3-C §10): this file's own import list
// above references only src/lib/mongodb/repositories/* and
// src/lib/mongodb/schemas — nothing under src/app/ or src/components/ is
// imported anywhere in this file. This is repository/data-layer
// verification only: no page, route, fetch handler, or React component
// exists here, per "Do NOT build UI yet. Do NOT replace Laravel APIs
// yet."
