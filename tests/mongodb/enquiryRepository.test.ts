/**
 * `EnquiryRepository` tests — added M4-PREP (docs/M4-PREPARATION.md).
 * Extended M5-A with `nextLegacyId()` coverage.
 *
 * LABEL: FIXTURE. Against a minimal in-memory fake `Db`/`Collection`
 * (the same small pattern `readBack.test.ts` established — supports
 * `insertOne`/`findOne`/`find().sort().limit().toArray()`, the operations
 * this repository's own and inherited `ValidatedRepository` methods
 * actually call), NOT a real MongoDB connection. Never describe this
 * file's assertions as "MongoDB integration" — see
 * docs/M4-PREPARATION.md's test-label taxonomy.
 */

import { describe, it, expect } from 'vitest';
import { EnquiryRepository } from '@/lib/mongodb/repositories/enquiryRepository';
import type { Enquiry } from '@/lib/mongodb/schemas';
import type { Db, Collection, Document, Filter, OptionalUnlessRequiredId } from 'mongodb';

/** Minimal fake `Db` — one in-memory array, supporting the operations
 * `ValidatedRepository.insertOne`/`.findOne` and
 * `EnquiryRepository.nextLegacyId()` call. Deliberately small, same
 * scope-limiting rationale as readBack.test.ts's own fake; the
 * `find().sort().limit().toArray()` shape matches
 * `authService.test.ts`'s established fake for the same
 * `UserRepository.nextLegacyId()`-style operation. */
function createFakeDb(seedEnquiries: Enquiry[] = []) {
  const store: Document[] = [...seedEnquiries] as unknown as Document[];
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
          sort: () => ({
            limit: () => ({
              toArray: async () => {
                const sorted = [...store].sort(
                  (a, b) => (b.legacyId as number) - (a.legacyId as number)
                );
                return sorted.slice(0, 1);
              },
            }),
          }),
        }),
      }) as unknown as Collection<Document>,
  } as unknown as Db;
  return { db, store };
}

const sampleEnquiry: Enquiry = {
  legacyId: 1,
  name: 'Test User',
  email: 'test@example.invalid',
  mobile: null,
  subject: 'Test subject',
  message: 'Test message',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('EnquiryRepository (FIXTURE — fake Db, no real MongoDB connection)', () => {
  it('insertOne validates and stores a well-formed Enquiry, findOne reads it back', async () => {
    const { db } = createFakeDb();
    const repo = new EnquiryRepository(db);

    const inserted = await repo.insertOne(sampleEnquiry);
    expect(inserted.legacyId).toBe(1);

    const found = await repo.findOne({ legacyId: 1 });
    expect(found?.subject).toBe('Test subject');
    expect(found?.mobile).toBeNull(); // P-01: preserved on read-back
  });

  it('findOne throws when a stored document fails schema validation (e.g. legacyId as a string)', async () => {
    const { db, store } = createFakeDb();
    const repo = new EnquiryRepository(db);
    // Bypass insertOne's own validation to simulate a document that
    // shouldn't have gotten in (e.g. a bug elsewhere, or a manual edit) —
    // this repository must still refuse to hand it to a caller unvalidated.
    store.push({ ...sampleEnquiry, legacyId: 'not-a-number' });

    await expect(repo.findOne({ email: sampleEnquiry.email })).rejects.toThrow();
  });

  it('nextLegacyId returns 1 against an empty collection', async () => {
    const { db } = createFakeDb([]);
    const repo = new EnquiryRepository(db);

    await expect(repo.nextLegacyId()).resolves.toBe(1);
  });

  it('nextLegacyId returns MAX(legacyId) + 1, same strategy as UserRepository', async () => {
    const { db } = createFakeDb([
      { ...sampleEnquiry, legacyId: 5 },
      { ...sampleEnquiry, legacyId: 12 },
      { ...sampleEnquiry, legacyId: 3 },
    ]);
    const repo = new EnquiryRepository(db);

    await expect(repo.nextLegacyId()).resolves.toBe(13);
  });
});
