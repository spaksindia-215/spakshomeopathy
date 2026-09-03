/**
 * Collection-creation tests, against a minimal in-memory fake `Db` — no
 * real MongoDB connection.
 */

import { describe, it, expect } from 'vitest';
import { ensureCollections, M3C_COLLECTIONS_TO_CREATE } from '@/lib/mongodb/collectionSetup';
import { COLLECTIONS } from '@/lib/mongodb/collections';
import type { Db } from 'mongodb';

function createFakeDb(existingCollections: string[] = []) {
  const created: string[] = [];
  const db = {
    listCollections: () => ({
      toArray: async () => existingCollections.map((name) => ({ name })),
    }),
    createCollection: async (name: string) => {
      created.push(name);
    },
  } as unknown as Db;
  return { db, created };
}

describe('M3C_COLLECTIONS_TO_CREATE', () => {
  it('includes the three DR-01-approved order-group collections as SEPARATE entries', () => {
    expect(M3C_COLLECTIONS_TO_CREATE).toContain(COLLECTIONS.orders);
    expect(M3C_COLLECTIONS_TO_CREATE).toContain(COLLECTIONS.orderProducts);
    expect(M3C_COLLECTIONS_TO_CREATE).toContain(COLLECTIONS.payments);
  });

  it('does not contain any name that is not also present in the master COLLECTIONS constant (no invented collections)', () => {
    const validNames = new Set(Object.values(COLLECTIONS));
    for (const name of M3C_COLLECTIONS_TO_CREATE) {
      expect(validNames.has(name as (typeof COLLECTIONS)[keyof typeof COLLECTIONS])).toBe(true);
    }
  });

  it('has no duplicate entries', () => {
    expect(new Set(M3C_COLLECTIONS_TO_CREATE).size).toBe(M3C_COLLECTIONS_TO_CREATE.length);
  });
});

describe('ensureCollections', () => {
  it('creates every collection when none exist yet', async () => {
    const { db, created } = createFakeDb([]);
    const results = await ensureCollections(db);
    expect(created).toHaveLength(M3C_COLLECTIONS_TO_CREATE.length);
    expect(results.every((r) => r.created)).toBe(true);
  });

  it('skips a collection that already exists (idempotent)', async () => {
    const { db, created } = createFakeDb([COLLECTIONS.users, COLLECTIONS.products]);
    const results = await ensureCollections(db);
    expect(created).not.toContain(COLLECTIONS.users);
    expect(created).not.toContain(COLLECTIONS.products);
    const userResult = results.find((r) => r.collection === COLLECTIONS.users);
    expect(userResult?.created).toBe(false);
  });

  it('reports one result per target collection, matching the count exactly', async () => {
    const { db } = createFakeDb([]);
    const results = await ensureCollections(db);
    expect(results).toHaveLength(M3C_COLLECTIONS_TO_CREATE.length);
  });
});
