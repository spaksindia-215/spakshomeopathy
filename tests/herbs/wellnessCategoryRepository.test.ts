/**
 * `WellnessCategoryRepository` tests — CR-006 Phase 6.
 *
 * LABEL: FIXTURE. Against a minimal in-memory fake `Db`/`Collection`, NOT
 * a real MongoDB connection — same pattern as
 * `tests/herbs/herbProductRepository.test.ts`.
 */

import { describe, it, expect } from 'vitest';
import { WellnessCategoryRepository } from '@/lib/herbs/db/wellnessCategoryRepository';
import type { WellnessCategoryDoc } from '@/lib/herbs/db/wellnessCategorySchema';
import type { Db, Collection, Document, Filter, OptionalUnlessRequiredId } from 'mongodb';

function createFakeDb(seed: WellnessCategoryDoc[] = []) {
  const store: Document[] = [...seed] as unknown as Document[];
  // CR-006 Phase 9: `auditLog` writes (from `ValidatedRepository`'s
  // inherited `updateOne`, which `WellnessCategoryRepository.hide()`
  // calls) route to their own isolated bucket, not `store` — otherwise
  // `findAll()` would try to validate an audit-log-shaped document
  // against `wellnessCategoryDocSchema` and fail.
  const auditLogStore: Document[] = [];
  function backingStore(name: string): Document[] {
    return name === 'auditLog' ? auditLogStore : store;
  }
  const db = {
    collection: (name: string) =>
      ({
        insertOne: async (doc: OptionalUnlessRequiredId<Document>) => {
          backingStore(name).push(doc as unknown as Document);
          return { acknowledged: true, insertedId: null };
        },
        findOne: async (filter: Filter<Document>) => {
          return (
            backingStore(name).find((d) => Object.entries(filter).every(([k, v]) => d[k] === v)) ??
            null
          );
        },
        find: () => ({
          toArray: async () => [...backingStore(name)],
        }),
        updateOne: async (
          filter: Filter<Document>,
          update: { $set: Document },
          options?: { upsert?: boolean }
        ) => {
          const bs = backingStore(name);
          const idx = bs.findIndex((d) => Object.entries(filter).every(([k, v]) => d[k] === v));
          if (idx >= 0) {
            bs[idx] = { ...bs[idx], ...update.$set };
            return { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
          }
          if (options?.upsert) {
            bs.push(update.$set);
            return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
          }
          return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
        },
        deleteOne: async (filter: Filter<Document>) => {
          const bs = backingStore(name);
          const idx = bs.findIndex((d) => Object.entries(filter).every(([k, v]) => d[k] === v));
          if (idx >= 0) bs.splice(idx, 1);
          return { acknowledged: true, deletedCount: idx >= 0 ? 1 : 0 };
        },
      }) as unknown as Collection<Document>,
  } as unknown as Db;
  return { db, store };
}

const sampleCategory: WellnessCategoryDoc = {
  key: 'hair-care',
  label: 'Hair Care',
  description: 'Herbs traditionally used to support healthy-looking hair',
  icon: 'hair',
  sortOrder: 0,
  status: 'active',
  createdAt: '2026-09-15T00:00:00.000Z',
  updatedAt: '2026-09-15T00:00:00.000Z',
};

describe('WellnessCategoryRepository (FIXTURE — fake Db, no real MongoDB connection)', () => {
  it('findByKey returns null when no document matches', async () => {
    const { db } = createFakeDb();
    const repo = new WellnessCategoryRepository(db);
    await expect(repo.findByKey('does-not-exist')).resolves.toBeNull();
  });

  it('upsert inserts a new document, findAll and findByKey read it back', async () => {
    const { db } = createFakeDb();
    const repo = new WellnessCategoryRepository(db);

    const saved = await repo.upsert(sampleCategory);
    expect(saved.key).toBe('hair-care');

    const all = await repo.findAll();
    expect(all).toHaveLength(1);

    const found = await repo.findByKey('hair-care');
    expect(found?.label).toBe('Hair Care');
  });

  it('upsert on an existing key replaces the document rather than duplicating it', async () => {
    const { db } = createFakeDb([sampleCategory]);
    const repo = new WellnessCategoryRepository(db);

    await repo.upsert({ ...sampleCategory, label: 'Updated Hair Care', sortOrder: 5 });

    const all = await repo.findAll();
    expect(all).toHaveLength(1);
    expect(all[0]?.label).toBe('Updated Hair Care');
    expect(all[0]?.sortOrder).toBe(5);
  });

  it('findAll sorts by sortOrder ascending', async () => {
    const { db } = createFakeDb([
      { ...sampleCategory, key: 'b', sortOrder: 2 },
      { ...sampleCategory, key: 'a', sortOrder: 1 },
      { ...sampleCategory, key: 'c', sortOrder: 3 },
    ]);
    const repo = new WellnessCategoryRepository(db);

    const all = await repo.findAll();
    expect(all.map((c) => c.key)).toEqual(['a', 'b', 'c']);
  });

  it('findAllActive excludes hidden categories', async () => {
    const { db } = createFakeDb([
      { ...sampleCategory, key: 'visible', status: 'active' },
      { ...sampleCategory, key: 'hidden-one', status: 'hidden' },
    ]);
    const repo = new WellnessCategoryRepository(db);

    const active = await repo.findAllActive();
    expect(active.map((c) => c.key)).toEqual(['visible']);
  });

  it('hide sets status to hidden without deleting the document', async () => {
    const { db } = createFakeDb([sampleCategory]);
    const repo = new WellnessCategoryRepository(db);

    await repo.hide('hair-care');

    const found = await repo.findByKey('hair-care');
    expect(found?.status).toBe('hidden');
    const all = await repo.findAll();
    expect(all).toHaveLength(1);
  });

  it('deleteByKey removes the document', async () => {
    const { db } = createFakeDb([sampleCategory]);
    const repo = new WellnessCategoryRepository(db);

    await repo.deleteByKey('hair-care');

    await expect(repo.findAll()).resolves.toHaveLength(0);
  });

  it('rejects a document that fails schema validation (e.g. empty key)', async () => {
    const { db } = createFakeDb();
    const repo = new WellnessCategoryRepository(db);
    const invalid = { ...sampleCategory, key: '' } as WellnessCategoryDoc;

    await expect(repo.upsert(invalid)).rejects.toThrow();
  });
});
