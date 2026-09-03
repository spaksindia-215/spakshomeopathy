/**
 * `HerbProductRepository` tests.
 *
 * LABEL: FIXTURE. Against a minimal in-memory fake `Db`/`Collection`, NOT
 * a real MongoDB connection — same pattern as
 * `tests/mongodb/appointmentRepository.test.ts` (see that file's own
 * header for the full rationale).
 */

import { describe, it, expect } from 'vitest';
import { HerbProductRepository } from '@/lib/herbs/db/herbProductRepository';
import type { HerbProductDoc } from '@/lib/herbs/db/schema';
import type { Db, Collection, Document, Filter, OptionalUnlessRequiredId } from 'mongodb';

function createFakeDb(seed: HerbProductDoc[] = []) {
  const store: Document[] = [...seed] as unknown as Document[];
  const db = {
    collection: () =>
      ({
        insertOne: async (doc: OptionalUnlessRequiredId<Document>) => {
          store.push(doc as unknown as Document);
          return { acknowledged: true, insertedId: null };
        },
        findOne: async (filter: Filter<Document>) => {
          return store.find((d) => Object.entries(filter).every(([k, v]) => d[k] === v)) ?? null;
        },
        find: () => ({
          toArray: async () => [...store],
        }),
        updateOne: async (
          filter: Filter<Document>,
          update: { $set: Document },
          options?: { upsert?: boolean }
        ) => {
          const idx = store.findIndex((d) => Object.entries(filter).every(([k, v]) => d[k] === v));
          if (idx >= 0) {
            store[idx] = { ...store[idx], ...update.$set };
            return { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
          }
          if (options?.upsert) {
            store.push(update.$set);
            return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
          }
          return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
        },
        deleteOne: async (filter: Filter<Document>) => {
          const idx = store.findIndex((d) => Object.entries(filter).every(([k, v]) => d[k] === v));
          if (idx >= 0) store.splice(idx, 1);
          return { acknowledged: true, deletedCount: idx >= 0 ? 1 : 0 };
        },
      }) as unknown as Collection<Document>,
  } as unknown as Db;
  return { db, store };
}

const sampleHerb: HerbProductDoc = {
  id: 'hp-test-1',
  name: 'Test Herb',
  slug: 'test-herb',
  sku: 'SPK-TEST-001',
  shortDescription: 'A test herb.',
  description: 'A longer description of a test herb.',
  benefits: ['Testing'],
  ingredients: ['100% Test Herb'],
  botanicalName: 'Testus herbus',
  howToUse: 'Use for testing.',
  precautions: 'None.',
  image: 'default',
  gallery: ['default'],
  form: 'whole-herbs',
  categoryLabel: 'Whole Herbs',
  wellnessCategories: ['general-wellness'],
  variants: [{ label: '100g', sortWeight: 100, price: 99, sku: 'SPK-TEST-001', stock: 10 }],
  rating: 4.5,
  reviewCount: 10,
  stock: 10,
  status: 'active',
  featured: false,
  bestseller: false,
  newArrival: true,
  tags: ['test'],
  metaTitle: 'Test Herb | Spaks Herbs',
  metaDescription: 'A test herb.',
  createdAt: '2026-08-30T00:00:00.000Z',
  updatedAt: '2026-08-30T00:00:00.000Z',
};

describe('HerbProductRepository (FIXTURE — fake Db, no real MongoDB connection)', () => {
  it('findBySlug returns null when no document matches', async () => {
    const { db } = createFakeDb();
    const repo = new HerbProductRepository(db);
    await expect(repo.findBySlug('does-not-exist')).resolves.toBeNull();
  });

  it('upsert inserts a new document, findAll and findBySlug read it back', async () => {
    const { db } = createFakeDb();
    const repo = new HerbProductRepository(db);

    const saved = await repo.upsert(sampleHerb);
    expect(saved.id).toBe('hp-test-1');

    const all = await repo.findAll();
    expect(all).toHaveLength(1);

    const found = await repo.findBySlug('test-herb');
    expect(found?.name).toBe('Test Herb');
  });

  it('upsert on an existing id replaces the document rather than duplicating it', async () => {
    const { db } = createFakeDb([sampleHerb]);
    const repo = new HerbProductRepository(db);

    await repo.upsert({ ...sampleHerb, name: 'Updated Test Herb', stock: 5 });

    const all = await repo.findAll();
    expect(all).toHaveLength(1);
    expect(all[0]?.name).toBe('Updated Test Herb');
    expect(all[0]?.stock).toBe(5);
  });

  it('deleteById removes the document', async () => {
    const { db } = createFakeDb([sampleHerb]);
    const repo = new HerbProductRepository(db);

    await repo.deleteById('hp-test-1');

    await expect(repo.findAll()).resolves.toHaveLength(0);
  });

  it('rejects a document that fails schema validation (e.g. negative price)', async () => {
    const { db } = createFakeDb();
    const repo = new HerbProductRepository(db);
    const invalid = {
      ...sampleHerb,
      variants: [{ ...sampleHerb.variants[0], price: -10 }],
    } as HerbProductDoc;

    await expect(repo.upsert(invalid)).rejects.toThrow();
  });
});
