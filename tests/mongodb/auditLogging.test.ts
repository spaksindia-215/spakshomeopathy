/**
 * `ValidatedRepository`'s centralized audit-log write — CR-006 Phase 9
 * (`docs/CR-006-PHASE-9-PLAN.md` §2.1). See `base.ts`'s own `logMutation`
 * for the full design and `src/lib/audit/context.ts` for the actor
 * context this depends on.
 *
 * LABEL: FIXTURE. A local fake `Db` distinguishing collections by name
 * (unlike the plain single-store fakes elsewhere in this suite, this one
 * needs to — the whole point here is verifying `auditLog` gets a SEPARATE
 * write from the target collection).
 */

import { describe, it, expect } from 'vitest';
import { ValidatedRepository } from '@/lib/mongodb/repositories/base';
import { runWithActor, getCurrentActor } from '@/lib/audit/context';
import { z } from 'zod';
import type { Db, Collection, Document, Filter, OptionalUnlessRequiredId } from 'mongodb';
import type { SessionPayload } from '@/lib/auth/session';

const testSchema = z.object({ legacyId: z.number(), name: z.string() });
type TestDoc = z.infer<typeof testSchema>;

function createFakeMultiCollectionDb() {
  const stores = new Map<string, Document[]>();
  function storeFor(name: string): Document[] {
    if (!stores.has(name)) stores.set(name, []);
    return stores.get(name)!;
  }
  const matches = (doc: Document, filter: Filter<Document>): boolean =>
    Object.entries(filter).every(([k, v]) => doc[k] === v);

  const db = {
    collection: (name: string) =>
      ({
        insertOne: async (doc: OptionalUnlessRequiredId<Document>) => {
          storeFor(name).push(doc as unknown as Document);
          return { acknowledged: true, insertedId: null };
        },
        findOne: async (filter: Filter<Document>) => {
          return storeFor(name).find((d) => matches(d, filter)) ?? null;
        },
        find: (filter: Filter<Document> = {}) => ({
          toArray: async () => storeFor(name).filter((d) => matches(d, filter)),
        }),
        updateOne: async (filter: Filter<Document>, update: { $set: Document }) => {
          const doc = storeFor(name).find((d) => matches(d, filter));
          if (doc) Object.assign(doc, update.$set);
          return { acknowledged: true, matchedCount: doc ? 1 : 0, modifiedCount: doc ? 1 : 0 };
        },
        deleteOne: async (filter: Filter<Document>) => {
          const arr = storeFor(name);
          const idx = arr.findIndex((d) => matches(d, filter));
          if (idx !== -1) arr.splice(idx, 1);
          return { acknowledged: true, deletedCount: idx !== -1 ? 1 : 0 };
        },
      }) as unknown as Collection<Document>,
  } as unknown as Db;

  return { db, stores };
}

const sampleSession: SessionPayload = {
  userId: 42,
  utype: 1,
  email: 'admin@example.invalid',
  issuedAt: Date.now(),
};

describe('ValidatedRepository — centralized audit logging (CR-006 Phase 9)', () => {
  it('insertOne writes both the target document and an auditLog entry with the current actor', async () => {
    const { db, stores } = createFakeMultiCollectionDb();
    const repo = new ValidatedRepository(db, 'widgets', testSchema);

    await runWithActor(sampleSession, async () => {
      await repo.insertOne({ legacyId: 1, name: 'Widget' });
    });

    expect(stores.get('widgets')).toHaveLength(1);
    const auditEntries = stores.get('auditLog') ?? [];
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0]).toMatchObject({
      action: 'insert',
      collectionName: 'widgets',
      targetId: '1',
      actorUserId: 42,
      actorEmail: 'admin@example.invalid',
    });
  });

  it('updateOne logs the action and which fields changed', async () => {
    const { db, stores } = createFakeMultiCollectionDb();
    const repo = new ValidatedRepository(db, 'widgets', testSchema);
    stores.set('widgets', [{ legacyId: 1, name: 'Old' }]);

    await runWithActor(sampleSession, async () => {
      await repo.updateOne({ legacyId: 1 } as TestDoc, { name: 'New' } as Partial<TestDoc>);
    });

    const auditEntries = stores.get('auditLog') ?? [];
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0]).toMatchObject({
      action: 'update',
      collectionName: 'widgets',
      targetId: '1',
      changedFields: ['name'],
    });
  });

  it('deleteOne logs the action', async () => {
    const { db, stores } = createFakeMultiCollectionDb();
    const repo = new ValidatedRepository(db, 'widgets', testSchema);
    stores.set('widgets', [{ legacyId: 1, name: 'Doomed' }]);

    await runWithActor(sampleSession, async () => {
      await repo.deleteOne({ legacyId: 1 } as TestDoc);
    });

    const auditEntries = stores.get('auditLog') ?? [];
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0]).toMatchObject({ action: 'delete', collectionName: 'widgets' });
  });

  it('writes with a null actor when no actor context is set', async () => {
    const { db, stores } = createFakeMultiCollectionDb();
    const repo = new ValidatedRepository(db, 'widgets', testSchema);

    // No runWithActor wrapper — simulates a write path that hasn't been
    // updated to set the actor context (or a non-admin write path).
    await repo.insertOne({ legacyId: 1, name: 'Widget' });

    const auditEntries = stores.get('auditLog') ?? [];
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0]).toMatchObject({ actorUserId: null, actorEmail: null });
  });

  it('does not log writes to the auditLog collection itself (no self-logging loop)', async () => {
    const { db, stores } = createFakeMultiCollectionDb();
    const auditRepo = new ValidatedRepository(db, 'auditLog', testSchema);

    await runWithActor(sampleSession, async () => {
      await auditRepo.insertOne({ legacyId: 1, name: 'should not recurse' });
    });

    // Exactly the one direct write — no second, self-generated entry.
    expect(stores.get('auditLog')).toHaveLength(1);
  });

  it('the underlying write still succeeds even when the audit-log write throws', async () => {
    // A Db whose 'widgets' collection works normally but whose 'auditLog'
    // collection.insertOne always throws — proves logMutation's
    // try/catch (base.ts) never lets a logging failure fail the real
    // write, per the Phase 9 plan's explicit fail-open requirement.
    const widgets: Document[] = [];
    const db = {
      collection: (name: string) =>
        name === 'auditLog'
          ? ({
              insertOne: async () => {
                throw new Error('simulated audit-log outage');
              },
            } as unknown as Collection<Document>)
          : ({
              insertOne: async (doc: OptionalUnlessRequiredId<Document>) => {
                widgets.push(doc as unknown as Document);
                return { acknowledged: true, insertedId: null };
              },
            } as unknown as Collection<Document>),
    } as unknown as Db;

    const repo = new ValidatedRepository(db, 'widgets', testSchema);

    await expect(
      runWithActor(sampleSession, async () => {
        await repo.insertOne({ legacyId: 1, name: 'Widget' });
      })
    ).resolves.not.toThrow();

    expect(widgets).toHaveLength(1);
  });

  it('getCurrentActor returns null outside of runWithActor', () => {
    expect(getCurrentActor()).toBeNull();
  });

  it('getCurrentActor reflects the session passed to runWithActor while inside it', async () => {
    await runWithActor(sampleSession, async () => {
      expect(getCurrentActor()).toEqual({ userId: 42, email: 'admin@example.invalid' });
    });
    // Context does not leak past the callback.
    expect(getCurrentActor()).toBeNull();
  });
});
