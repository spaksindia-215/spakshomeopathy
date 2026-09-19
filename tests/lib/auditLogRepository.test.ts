/**
 * `AuditLogRepository` / `auditLogEntrySchema` tests — CR-006 Phase 9.
 *
 * LABEL: FIXTURE. Against a minimal in-memory fake `Db`/`Collection`, NOT
 * a real MongoDB connection — same pattern as `tests/lib/pageRepository.test.ts`.
 */

import { describe, it, expect } from 'vitest';
import { AuditLogRepository } from '@/lib/audit/repository';
import { auditLogEntrySchema } from '@/lib/audit/schema';
import type { AuditLogEntry } from '@/lib/audit/schema';
import type { Db, Collection, Document, Filter, OptionalUnlessRequiredId } from 'mongodb';

function createFakeDb(seed: AuditLogEntry[] = []) {
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
        find: (filter: Filter<Document> = {}) => ({
          toArray: async () =>
            store.filter((d) => Object.entries(filter).every(([k, v]) => d[k] === v)),
        }),
      }) as unknown as Collection<Document>,
  } as unknown as Db;
  return { db, store };
}

const sampleEntry: AuditLogEntry = {
  id: 'al-1',
  actorUserId: 42,
  actorEmail: 'admin@example.invalid',
  action: 'insert',
  collectionName: 'products',
  targetId: '5',
  timestamp: '2026-09-16T10:00:00.000Z',
};

describe('auditLogEntrySchema', () => {
  it('validates a well-formed entry', () => {
    expect(() => auditLogEntrySchema.parse(sampleEntry)).not.toThrow();
  });

  it('validates an entry with changedFields', () => {
    expect(() =>
      auditLogEntrySchema.parse({ ...sampleEntry, changedFields: ['name', 'price'] })
    ).not.toThrow();
  });

  it('validates null actor fields (no session at write time)', () => {
    expect(() =>
      auditLogEntrySchema.parse({ ...sampleEntry, actorUserId: null, actorEmail: null })
    ).not.toThrow();
  });

  it('rejects an unrecognized action value', () => {
    expect(() => auditLogEntrySchema.parse({ ...sampleEntry, action: 'destroy' })).toThrow();
  });

  it('rejects an empty collectionName', () => {
    expect(() => auditLogEntrySchema.parse({ ...sampleEntry, collectionName: '' })).toThrow();
  });
});

describe('AuditLogRepository (FIXTURE — fake Db, no real MongoDB connection)', () => {
  it('findRecent with no filter returns every entry, newest first', async () => {
    const { db } = createFakeDb([
      { ...sampleEntry, id: 'al-1', timestamp: '2026-09-16T10:00:00.000Z' },
      { ...sampleEntry, id: 'al-2', timestamp: '2026-09-16T12:00:00.000Z' },
      { ...sampleEntry, id: 'al-3', timestamp: '2026-09-16T11:00:00.000Z' },
    ]);
    const repo = new AuditLogRepository(db);

    const results = await repo.findRecent();

    expect(results.map((e) => e.id)).toEqual(['al-2', 'al-3', 'al-1']);
  });

  it('findRecent filters by collectionName', async () => {
    const { db } = createFakeDb([
      { ...sampleEntry, id: 'al-1', collectionName: 'products' },
      { ...sampleEntry, id: 'al-2', collectionName: 'categories' },
    ]);
    const repo = new AuditLogRepository(db);

    const results = await repo.findRecent({ collectionName: 'categories' });

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('al-2');
  });

  it('findRecent filters by actorEmail', async () => {
    const { db } = createFakeDb([
      { ...sampleEntry, id: 'al-1', actorEmail: 'a@example.invalid' },
      { ...sampleEntry, id: 'al-2', actorEmail: 'b@example.invalid' },
    ]);
    const repo = new AuditLogRepository(db);

    const results = await repo.findRecent({ actorEmail: 'b@example.invalid' });

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('al-2');
  });

  it('findRecent respects the limit parameter', async () => {
    const { db } = createFakeDb([
      { ...sampleEntry, id: 'al-1', timestamp: '2026-09-16T10:00:00.000Z' },
      { ...sampleEntry, id: 'al-2', timestamp: '2026-09-16T11:00:00.000Z' },
      { ...sampleEntry, id: 'al-3', timestamp: '2026-09-16T12:00:00.000Z' },
    ]);
    const repo = new AuditLogRepository(db);

    const results = await repo.findRecent({}, 2);

    expect(results).toHaveLength(2);
    expect(results.map((e) => e.id)).toEqual(['al-3', 'al-2']);
  });
});
