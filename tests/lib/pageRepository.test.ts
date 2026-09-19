/**
 * `PageRepository` tests — CR-006 Phase 7.
 *
 * LABEL: FIXTURE. Against a minimal in-memory fake `Db`/`Collection`, NOT
 * a real MongoDB connection — same pattern as
 * `tests/herbs/wellnessCategoryRepository.test.ts`.
 */

import { describe, it, expect } from 'vitest';
import { PageRepository } from '@/lib/pages/repository';
import type { PageDoc } from '@/lib/pages/schema';
import type { Db, Collection, Document, Filter, OptionalUnlessRequiredId } from 'mongodb';

function createFakeDb(seed: PageDoc[] = []) {
  const store: Document[] = [...seed] as unknown as Document[];
  // CR-006 Phase 9: `auditLog` writes (from `PageRepository.upsert()`,
  // which calls `logMutation()` directly since it bypasses the base
  // class's instrumented `updateOne`) route to their own isolated
  // bucket, not `store`.
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

const sampleDoc: PageDoc = {
  slug: 'terms',
  title: 'Terms and Conditions',
  bodyHtml: '<h1>Terms</h1><p>Sample content.</p>',
  updatedAt: '2026-09-15T00:00:00.000Z',
};

describe('PageRepository (FIXTURE — fake Db, no real MongoDB connection)', () => {
  it('findBySlug returns null when no document matches', async () => {
    const { db } = createFakeDb();
    const repo = new PageRepository(db);
    await expect(repo.findBySlug('terms')).resolves.toBeNull();
  });

  it('upsert inserts a new document, findAll and findBySlug read it back', async () => {
    const { db } = createFakeDb();
    const repo = new PageRepository(db);

    const saved = await repo.upsert(sampleDoc);
    expect(saved.slug).toBe('terms');

    const all = await repo.findAll();
    expect(all).toHaveLength(1);

    const found = await repo.findBySlug('terms');
    expect(found?.title).toBe('Terms and Conditions');
  });

  it('upsert on an existing slug replaces the document rather than duplicating it', async () => {
    const { db } = createFakeDb([sampleDoc]);
    const repo = new PageRepository(db);

    await repo.upsert({ ...sampleDoc, title: 'Updated Terms', bodyHtml: '<p>New content.</p>' });

    const all = await repo.findAll();
    expect(all).toHaveLength(1);
    expect(all[0]?.title).toBe('Updated Terms');
    expect(all[0]?.bodyHtml).toBe('<p>New content.</p>');
  });

  it('rejects an invalid slug not in the closed enum', async () => {
    const { db } = createFakeDb();
    const repo = new PageRepository(db);
    const invalid = { ...sampleDoc, slug: 'about' } as unknown as PageDoc;

    await expect(repo.upsert(invalid)).rejects.toThrow();
  });

  it('rejects an empty title', async () => {
    const { db } = createFakeDb();
    const repo = new PageRepository(db);
    const invalid = { ...sampleDoc, title: '' } as PageDoc;

    await expect(repo.upsert(invalid)).rejects.toThrow();
  });
});
