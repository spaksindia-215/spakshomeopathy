/**
 * Shared minimal in-memory fake `Db`/`Collection` for repository FIXTURE
 * tests that exercise `ValidatedRepository`'s generic CRUD methods
 * (`insertOne`/`findOne`/`find` with `.sort().limit().toArray()` chaining/
 * `updateOne`/`deleteOne`) — added M5-E to avoid re-copying the same fake
 * across `pinCodeRepository.test.ts`, `sliderRepository.test.ts`, and
 * every future M5-E sub-slice's own repository test file. Extracted after
 * the pincode sub-slice's own inline copy proved it would otherwise be
 * duplicated a third time verbatim (contract §5.2's "don't duplicate"
 * principle, applied here to test infrastructure rather than application
 * code — no contract rule governs test helpers directly, but the same
 * reasoning applies).
 *
 * NOT a real MongoDB connection — see each repository test file's own
 * header for why FIXTURE-level testing is this project's established
 * standard where a live Atlas connection is unavailable.
 */

import type { Db, Collection, Document, Filter, OptionalUnlessRequiredId } from 'mongodb';

/**
 * ADDITIVE (CR-006 Phase 9): `db.collection(name)` now routes by name
 * instead of always returning the same backing store, so
 * `ValidatedRepository`'s new audit-log write (`base.ts`'s
 * `logMutation()`, which calls `db.collection('auditLog').insertOne(...)`
 * directly on every insert/update/delete) lands in its own separate
 * bucket instead of silently polluting the SAME `store` array every
 * existing test in this file's 27 callers asserts against.
 * Specifically: the `auditLog` collection name gets its own isolated,
 * unasserted bucket, created lazily; every OTHER name still shares
 * `store`, exactly as before — so every pre-existing caller (none of
 * which distinguish collection names) is unaffected, since audit-log
 * writes (the only new, previously-nonexistent caller of a DIFFERENT
 * collection name) are now routed elsewhere instead of appended to it.
 */
export function createFakeCrudDb<T extends Document>(seed: T[] = []) {
  // Deep-clones each seed document — a shallow array copy alone would let
  // updateOne's Object.assign mutate a shared literal (e.g. a module-level
  // base fixture) across independent test cases that all seed from the
  // same constant. Found as a real bug during the pincode sub-slice's own
  // test-writing session.
  const store: Document[] = seed.map((doc) => ({ ...doc }) as unknown as Document);

  // ADDITIVE (CR-006 Phase 5): also supports MongoDB's real
  // scalar-matches-array-element semantic — `{ field: v }` matches a
  // document where `doc[field]` is an ARRAY containing `v`, exactly as
  // real MongoDB does for a plain (non-`$elemMatch`/`$in`) equality
  // filter against an array field. Strict `===` (the pre-existing
  // behavior, unchanged) still applies whenever `doc[k]` is not an
  // array, so every existing caller of this fixture is unaffected.
  const matches = (doc: Document, filter: Filter<Document>): boolean =>
    Object.entries(filter).every(([k, v]) => {
      const docValue = doc[k];
      if (Array.isArray(docValue)) return docValue.includes(v);
      return docValue === v;
    });

  function makeCollection(backingStore: Document[]): Collection<Document> {
    return {
      insertOne: async (doc: OptionalUnlessRequiredId<Document>) => {
        backingStore.push(doc as unknown as Document);
        return { acknowledged: true, insertedId: null };
      },
      findOne: async (filter: Filter<Document>) => {
        return backingStore.find((d) => matches(d, filter)) ?? null;
      },
      find: (filter: Filter<Document> = {}) => ({
        sort: (sortSpec: Record<string, 1 | -1>) => ({
          limit: (n: number) => ({
            toArray: async () => {
              const entry = Object.entries(sortSpec)[0];
              if (!entry) return [];
              const [field, dir] = entry;
              const sorted = [...backingStore.filter((d) => matches(d, filter))].sort(
                (a, b) => ((a[field] as number) - (b[field] as number)) * dir
              );
              return sorted.slice(0, n);
            },
          }),
        }),
        toArray: async () => backingStore.filter((d) => matches(d, filter)),
      }),
      updateOne: async (filter: Filter<Document>, update: { $set: Record<string, unknown> }) => {
        const doc = backingStore.find((d) => matches(d, filter));
        if (doc) Object.assign(doc, update.$set);
        return { acknowledged: true, matchedCount: doc ? 1 : 0, modifiedCount: doc ? 1 : 0 };
      },
      deleteOne: async (filter: Filter<Document>) => {
        const index = backingStore.findIndex((d) => matches(d, filter));
        if (index !== -1) backingStore.splice(index, 1);
        return { acknowledged: true, deletedCount: index !== -1 ? 1 : 0 };
      },
    } as unknown as Collection<Document>;
  }

  // Every collection name OTHER than `auditLog` shares `store`, exactly
  // matching this fixture's pre-Phase-9 behavior for every existing
  // caller (none of which distinguish collection names). Only
  // `auditLog` — `base.ts`'s `logMutation()`, the one new caller that
  // targets a DIFFERENT collection than the repository under test — gets
  // its own isolated, never-asserted-against bucket, created lazily so
  // fixtures that seed no data still avoid a real allocation until used.
  const auditLogStore: Document[] = [];

  const db = {
    collection: (name: string) =>
      name === 'auditLog' ? makeCollection(auditLogStore) : makeCollection(store),
  } as unknown as Db;

  return { db, store };
}
