/**
 * `RedirectRepository` / `redirectDocSchema` tests — CR-006 Phase 8.
 *
 * LABEL: FIXTURE. Against a minimal in-memory fake `Db`/`Collection`, NOT
 * a real MongoDB connection — same pattern as
 * `tests/lib/pageRepository.test.ts`.
 */

import { describe, it, expect } from 'vitest';
import { RedirectRepository } from '@/lib/redirects/repository';
import { redirectDocSchema } from '@/lib/redirects/schema';
import type { RedirectDoc } from '@/lib/redirects/schema';
import type { Db, Collection, Document, Filter, OptionalUnlessRequiredId } from 'mongodb';

function createFakeDb(seed: RedirectDoc[] = []) {
  const store: Document[] = [...seed] as unknown as Document[];
  // CR-006 Phase 9: `auditLog` writes (from `RedirectRepository.upsert()`/
  // `.deleteById()`, which call `logMutation()` directly since they
  // bypass the base class's instrumented methods) route to their own
  // isolated bucket, not `store`.
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

const sampleRedirect: RedirectDoc = {
  id: 'rd-test-1',
  fromPath: '/old-page',
  toPath: '/new-page',
  statusCode: 301,
  createdAt: '2026-09-16T00:00:00.000Z',
  updatedAt: '2026-09-16T00:00:00.000Z',
};

describe('redirectDocSchema', () => {
  it('validates a well-formed 301 redirect', () => {
    expect(() => redirectDocSchema.parse(sampleRedirect)).not.toThrow();
  });

  it('validates a well-formed 302 redirect', () => {
    expect(() => redirectDocSchema.parse({ ...sampleRedirect, statusCode: 302 })).not.toThrow();
  });

  it('rejects a status code other than 301/302', () => {
    expect(() => redirectDocSchema.parse({ ...sampleRedirect, statusCode: 200 })).toThrow();
  });

  it('rejects an empty fromPath', () => {
    expect(() => redirectDocSchema.parse({ ...sampleRedirect, fromPath: '' })).toThrow();
  });

  it('rejects an empty toPath', () => {
    expect(() => redirectDocSchema.parse({ ...sampleRedirect, toPath: '' })).toThrow();
  });

  it('rejects a fromPath not starting with "/"', () => {
    expect(() => redirectDocSchema.parse({ ...sampleRedirect, fromPath: 'old-page' })).toThrow();
  });

  it('rejects a toPath not starting with "/"', () => {
    expect(() => redirectDocSchema.parse({ ...sampleRedirect, toPath: 'new-page' })).toThrow();
  });
});

describe('RedirectRepository (FIXTURE — fake Db, no real MongoDB connection)', () => {
  it('findById returns null when no document matches', async () => {
    const { db } = createFakeDb();
    const repo = new RedirectRepository(db);
    await expect(repo.findById('does-not-exist')).resolves.toBeNull();
  });

  it('findByFromPath returns null when no document matches', async () => {
    const { db } = createFakeDb();
    const repo = new RedirectRepository(db);
    await expect(repo.findByFromPath('/nothing-here')).resolves.toBeNull();
  });

  it('upsert inserts a new document, findAll/findById/findByFromPath read it back', async () => {
    const { db } = createFakeDb();
    const repo = new RedirectRepository(db);

    const saved = await repo.upsert(sampleRedirect);
    expect(saved.id).toBe('rd-test-1');

    const all = await repo.findAll();
    expect(all).toHaveLength(1);

    const byId = await repo.findById('rd-test-1');
    expect(byId?.toPath).toBe('/new-page');

    const byFromPath = await repo.findByFromPath('/old-page');
    expect(byFromPath?.id).toBe('rd-test-1');
  });

  it('upsert on an existing id replaces the document rather than duplicating it', async () => {
    const { db } = createFakeDb([sampleRedirect]);
    const repo = new RedirectRepository(db);

    await repo.upsert({ ...sampleRedirect, toPath: '/updated-page', statusCode: 302 });

    const all = await repo.findAll();
    expect(all).toHaveLength(1);
    expect(all[0]?.toPath).toBe('/updated-page');
    expect(all[0]?.statusCode).toBe(302);
  });

  it('deleteById removes the document', async () => {
    const { db } = createFakeDb([sampleRedirect]);
    const repo = new RedirectRepository(db);

    await repo.deleteById('rd-test-1');

    await expect(repo.findAll()).resolves.toHaveLength(0);
  });

  it('rejects a document that fails schema validation (e.g. bad status code)', async () => {
    const { db } = createFakeDb();
    const repo = new RedirectRepository(db);
    const invalid = { ...sampleRedirect, statusCode: 404 } as unknown as RedirectDoc;

    await expect(repo.upsert(invalid)).rejects.toThrow();
  });
});
