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

export function createFakeCrudDb<T extends Document>(seed: T[] = []) {
  // Deep-clones each seed document — a shallow array copy alone would let
  // updateOne's Object.assign mutate a shared literal (e.g. a module-level
  // base fixture) across independent test cases that all seed from the
  // same constant. Found as a real bug during the pincode sub-slice's own
  // test-writing session.
  const store: Document[] = seed.map((doc) => ({ ...doc }) as unknown as Document);

  const matches = (doc: Document, filter: Filter<Document>): boolean =>
    Object.entries(filter).every(([k, v]) => doc[k] === v);

  const db = {
    collection: () =>
      ({
        insertOne: async (doc: OptionalUnlessRequiredId<Document>) => {
          store.push(doc as unknown as Document);
          return { acknowledged: true, insertedId: null };
        },
        findOne: async (filter: Filter<Document>) => {
          return store.find((d) => matches(d, filter)) ?? null;
        },
        find: (filter: Filter<Document> = {}) => ({
          sort: (sortSpec: Record<string, 1 | -1>) => ({
            limit: (n: number) => ({
              toArray: async () => {
                const entry = Object.entries(sortSpec)[0];
                if (!entry) return [];
                const [field, dir] = entry;
                const sorted = [...store.filter((d) => matches(d, filter))].sort(
                  (a, b) => ((a[field] as number) - (b[field] as number)) * dir
                );
                return sorted.slice(0, n);
              },
            }),
          }),
          toArray: async () => store.filter((d) => matches(d, filter)),
        }),
        updateOne: async (filter: Filter<Document>, update: { $set: Record<string, unknown> }) => {
          const doc = store.find((d) => matches(d, filter));
          if (doc) Object.assign(doc, update.$set);
          return { acknowledged: true, matchedCount: doc ? 1 : 0, modifiedCount: doc ? 1 : 0 };
        },
        deleteOne: async (filter: Filter<Document>) => {
          const index = store.findIndex((d) => matches(d, filter));
          if (index !== -1) store.splice(index, 1);
          return { acknowledged: true, deletedCount: index !== -1 ? 1 : 0 };
        },
      }) as unknown as Collection<Document>,
  } as unknown as Db;

  return { db, store };
}
