/**
 * Idempotency mechanism tests — proves upsertByLegacyId does not create
 * duplicates on a second call, WITHOUT a real MongoDB connection (a
 * minimal in-memory fake standing in for the `Collection` interface).
 *
 * Owner instruction (M3-B §6): "A second execution against the same
 * target should not create duplicate records. Do not solve this by
 * changing business identifiers."
 */

import { describe, it, expect } from 'vitest';
import { upsertByLegacyId, buildMigrationStateRecord } from '@/lib/mongodb/migrationState';
import type { Collection, Document } from 'mongodb';

interface FakeDoc extends Document {
  legacyId: number;
  value: string;
}

/** Minimal fake satisfying only the one method upsertByLegacyId calls —
 * not a full MongoDB Collection mock, deliberately kept small so this
 * test exercises the IDEMPOTENCY LOGIC, not driver behavior. */
function createFakeCollection(): { collection: Collection<FakeDoc>; store: Map<number, FakeDoc> } {
  const store = new Map<number, FakeDoc>();
  const collection = {
    updateOne: async (
      filter: { legacyId: number },
      update: { $set: FakeDoc },
      options: { upsert: boolean }
    ) => {
      const existed = store.has(filter.legacyId);
      if (existed || options.upsert) {
        store.set(filter.legacyId, update.$set);
      }
      return { matchedCount: existed ? 1 : 0, upsertedCount: existed ? 0 : 1 };
    },
  } as unknown as Collection<FakeDoc>;
  return { collection, store };
}

describe('upsertByLegacyId — idempotency without changing business identifiers', () => {
  it('inserts a new document on first call', async () => {
    const { collection, store } = createFakeCollection();
    await upsertByLegacyId(collection, { legacyId: 1, value: 'first' });
    expect(store.size).toBe(1);
    expect(store.get(1)?.value).toBe('first');
  });

  it('a second call with the SAME legacyId REPLACES the document, does not duplicate it', async () => {
    const { collection, store } = createFakeCollection();
    await upsertByLegacyId(collection, { legacyId: 1, value: 'first' });
    await upsertByLegacyId(collection, { legacyId: 1, value: 'second-run' });

    expect(store.size).toBe(1); // still one document, not two
    expect(store.get(1)?.value).toBe('second-run');
  });

  it('the legacyId itself is never altered by the upsert mechanism', async () => {
    const { collection, store } = createFakeCollection();
    await upsertByLegacyId(collection, { legacyId: 42, value: 'a' });
    await upsertByLegacyId(collection, { legacyId: 42, value: 'b' });
    expect(store.get(42)?.legacyId).toBe(42); // unchanged across both calls
  });

  it('reports matched=false on first insert, matched=true on the idempotent re-run', async () => {
    const { collection } = createFakeCollection();
    const first = await upsertByLegacyId(collection, { legacyId: 7, value: 'x' });
    const second = await upsertByLegacyId(collection, { legacyId: 7, value: 'y' });
    expect(first.matched).toBe(false);
    expect(second.matched).toBe(true);
  });

  it('different legacyIds never collide with each other', async () => {
    const { collection, store } = createFakeCollection();
    await upsertByLegacyId(collection, { legacyId: 1, value: 'a' });
    await upsertByLegacyId(collection, { legacyId: 2, value: 'b' });
    expect(store.size).toBe(2);
  });
});

describe('buildMigrationStateRecord', () => {
  it('records the collection name and legacyId without modifying either', () => {
    const record = buildMigrationStateRecord('products', 42, 'abc123hash');
    expect(record.collectionName).toBe('products');
    expect(record.legacyId).toBe(42);
    expect(record.contentHash).toBe('abc123hash');
    expect(record.migratedAt).toBeInstanceOf(Date);
  });

  it('contentHash is optional', () => {
    const record = buildMigrationStateRecord('products', 42);
    expect(record.contentHash).toBeUndefined();
  });
});
