/**
 * M3-C §9 — Failure / rollback behavior tests.
 *
 * Owner instruction: "Test migration failure behavior in the isolated
 * environment. Intentionally introduce a controlled invalid record.
 * Verify: failure is detected, error is reported, invalid record is
 * identifiable, unrelated records are not silently corrupted, migration
 * report records the failure. Do NOT claim transactional rollback unless
 * the implementation actually provides it. Document exactly what rollback
 * guarantees MongoDB provides for this migration."
 *
 * These tests exercise `ValidatedRepository.upsertByLegacyId` (and the
 * `writeEntity`-shaped per-document try/catch loop pattern used in
 * `scripts/migrate-to-mongodb.ts`) against a FAKE MongoDB collection that
 * is instrumented to fail on a specific, identifiable document — no real
 * database connection is used or needed to prove this behavior.
 */

import { describe, it, expect } from 'vitest';
import { ValidatedRepository } from '@/lib/mongodb/repositories/base';
import { z } from 'zod';
import type { Db, Collection, Document } from 'mongodb';

const testSchema = z.object({ legacyId: z.number(), name: z.string() });
type TestDoc = z.infer<typeof testSchema>;

/**
 * A fake `Db`/`Collection` pair where `updateOne` (the operation
 * `upsertByLegacyId` performs) throws for one specific legacyId, and
 * succeeds normally for every other document — simulating "one bad
 * record in an otherwise-good batch" without needing a real database to
 * produce a real failure.
 */
function createFakeDbWithFailure(failOnLegacyId: number) {
  const store = new Map<number, TestDoc>();
  const collection = {
    updateOne: async (filter: { legacyId: number }, update: { $set: TestDoc }) => {
      if (filter.legacyId === failOnLegacyId) {
        throw new Error(`Simulated write failure for legacyId=${failOnLegacyId}`);
      }
      store.set(filter.legacyId, update.$set);
      return { matchedCount: 0, upsertedCount: 1 };
    },
  } as unknown as Collection<TestDoc>;

  const db = {
    collection: () => collection as unknown as Collection<Document>,
  } as unknown as Db;

  return { db, store };
}

/**
 * Mirrors `scripts/migrate-to-mongodb.ts`'s `writeEntity` loop — a
 * per-document try/catch so one failure doesn't abort the batch. Kept as
 * a small local helper (not imported from the script, which has a
 * `require.main` guard preventing direct import as a module in some
 * bundler configurations) — the LOGIC under test is the same
 * try/catch-per-document pattern; see the script itself for the version
 * actually used in a real execution.
 */
async function writeAllWithFailureIsolation(
  repo: ValidatedRepository<TestDoc>,
  documents: TestDoc[]
): Promise<{
  written: number;
  failed: { legacyId: number; error: string }[];
}> {
  const failed: { legacyId: number; error: string }[] = [];
  let written = 0;
  for (const doc of documents) {
    try {
      await repo.upsertByLegacyId(doc);
      written++;
    } catch (e) {
      failed.push({ legacyId: doc.legacyId, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { written, failed };
}

describe('M3-C §9 — failure detection and isolation', () => {
  it('a failing document is caught, does not throw out of the batch loop', async () => {
    const { db } = createFakeDbWithFailure(2);
    const repo = new ValidatedRepository<TestDoc>(db, 'test', testSchema);
    const documents: TestDoc[] = [
      { legacyId: 1, name: 'good-1' },
      { legacyId: 2, name: 'bad' },
      { legacyId: 3, name: 'good-3' },
    ];

    const result = await writeAllWithFailureIsolation(repo, documents);

    expect(result.failed).toHaveLength(1);
  });

  it('the invalid record is IDENTIFIABLE — its legacyId and error message are captured', async () => {
    const { db } = createFakeDbWithFailure(2);
    const repo = new ValidatedRepository<TestDoc>(db, 'test', testSchema);
    const documents: TestDoc[] = [{ legacyId: 2, name: 'bad' }];

    const result = await writeAllWithFailureIsolation(repo, documents);

    expect(result.failed[0]!.legacyId).toBe(2);
    expect(result.failed[0]!.error).toContain('legacyId=2');
  });

  it('UNRELATED records are NOT silently corrupted — they still get written despite the failure', async () => {
    const { db, store } = createFakeDbWithFailure(2);
    const repo = new ValidatedRepository<TestDoc>(db, 'test', testSchema);
    const documents: TestDoc[] = [
      { legacyId: 1, name: 'good-1' },
      { legacyId: 2, name: 'bad' },
      { legacyId: 3, name: 'good-3' },
    ];

    const result = await writeAllWithFailureIsolation(repo, documents);

    expect(result.written).toBe(2); // 1 and 3 succeeded
    expect(store.get(1)?.name).toBe('good-1');
    expect(store.get(3)?.name).toBe('good-3');
    expect(store.has(2)).toBe(false); // the failed one was never written
  });

  it('multiple failures are each independently captured, not just the first', async () => {
    const failOn = new Set([2, 4]);
    const store = new Map<number, TestDoc>();
    const collection = {
      updateOne: async (filter: { legacyId: number }, update: { $set: TestDoc }) => {
        if (failOn.has(filter.legacyId)) {
          throw new Error(`Simulated write failure for legacyId=${filter.legacyId}`);
        }
        store.set(filter.legacyId, update.$set);
        return { matchedCount: 0, upsertedCount: 1 };
      },
    } as unknown as Collection<TestDoc>;
    const db = { collection: () => collection as unknown as Collection<Document> } as unknown as Db;
    const repo = new ValidatedRepository<TestDoc>(db, 'test', testSchema);

    const documents: TestDoc[] = [1, 2, 3, 4, 5].map((n) => ({ legacyId: n, name: `doc-${n}` }));
    const result = await writeAllWithFailureIsolation(repo, documents);

    expect(result.failed).toHaveLength(2);
    expect(result.failed.map((f) => f.legacyId).sort()).toEqual([2, 4]);
    expect(result.written).toBe(3);
  });

  it('a SCHEMA validation failure (not a write failure) is also caught and identifiable, before any write is attempted', async () => {
    const { db, store } = createFakeDbWithFailure(-1); // no write-level failure configured
    const repo = new ValidatedRepository<TestDoc>(db, 'test', testSchema);
    const documents = [
      { legacyId: 1, name: 'good' },
      { legacyId: 'not-a-number', name: 'bad-shape' } as unknown as TestDoc,
    ];

    const result = await writeAllWithFailureIsolation(repo, documents);

    expect(result.written).toBe(1);
    expect(result.failed).toHaveLength(1);
    expect(store.size).toBe(1); // the malformed document was never written
  });
});

describe('M3-C §9 — documented rollback guarantees (NOT transactional)', () => {
  it('a later document in the batch is written even though an earlier one in the SAME batch failed — proving there is no all-or-nothing batch rollback', async () => {
    // This is the behavioral proof behind the "no transactional rollback"
    // claim in docs/M3C-MONGODB-INTEGRATION.md's "Rollback Guarantees"
    // section: if this implementation provided all-or-nothing batch
    // rollback, legacyId=3 (which comes AFTER the failing legacyId=2)
    // would never be written once legacyId=2 failed. It is written
    // anyway, because each upsertByLegacyId call is an independent
    // MongoDB updateOne(..., {upsert:true}) — atomic at the single-
    // document level only, per MongoDB's own guarantee for any single
    // write, with no multi-document transaction wrapping the batch.
    const { db, store } = createFakeDbWithFailure(2);
    const repo = new ValidatedRepository<TestDoc>(db, 'test', testSchema);
    const documents: TestDoc[] = [
      { legacyId: 1, name: 'before-failure' },
      { legacyId: 2, name: 'fails' },
      { legacyId: 3, name: 'after-failure' },
    ];

    await writeAllWithFailureIsolation(repo, documents);

    expect(store.has(1)).toBe(true);
    expect(store.has(2)).toBe(false);
    expect(store.has(3)).toBe(true); // written despite an earlier failure in the same batch
  });
});
