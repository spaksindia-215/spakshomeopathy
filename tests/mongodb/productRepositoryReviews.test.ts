/**
 * `ProductRepository.findAll` / `updateReviewStatus` tests — CR-006
 * Phase 7 (`docs/CR-006-PHASE-7-PLAN.md` §2.1). See
 * `productRepository.ts`'s own header on `updateReviewStatus` for why a
 * dedicated positional array-filtered update is used instead of the
 * generic `ValidatedRepository.updateOne`.
 *
 * LABEL: FIXTURE. `createFakeCrudDb` (`tests/mongodb/fakeDb.ts`) doesn't
 * model MongoDB's `arrayFilters`/positional-operator semantics (its
 * `updateOne` is a flat `Object.assign`, not a dotted-path/array-element
 * write), so this file uses its own minimal fake `Collection.updateOne`
 * that actually walks into the `reviews` array — the one piece of new
 * behavior this phase's repository method introduces. NOT a real
 * MongoDB connection.
 */

import { describe, it, expect } from 'vitest';
import { ProductRepository } from '@/lib/mongodb/repositories/productRepository';
import { validProduct } from './fixtures';
import type { Product } from '@/lib/mongodb/schemas';
import type { Db, Collection, Document, Filter, OptionalUnlessRequiredId } from 'mongodb';

function createFakeDbWithArrayFilters(seed: Product[] = []) {
  const store: Document[] = seed.map((doc) => ({ ...doc }) as unknown as Document);
  // CR-006 Phase 9: `auditLog` writes (from `updateReviewStatus`, which
  // calls `logMutation()` directly since it bypasses the base class's
  // instrumented `updateOne`) route to their own isolated bucket, not
  // `store`.
  const auditLogStore: Document[] = [];

  const matches = (doc: Document, filter: Filter<Document>): boolean =>
    Object.entries(filter).every(([k, v]) => doc[k] === v);

  const db = {
    collection: (name: string) =>
      name === 'auditLog'
        ? ({
            insertOne: async (doc: OptionalUnlessRequiredId<Document>) => {
              auditLogStore.push(doc as unknown as Document);
              return { acknowledged: true, insertedId: null };
            },
          } as unknown as Collection<Document>)
        : ({
            insertOne: async (doc: OptionalUnlessRequiredId<Document>) => {
              store.push(doc as unknown as Document);
              return { acknowledged: true, insertedId: null };
            },
            findOne: async (filter: Filter<Document>) => {
              return store.find((d) => matches(d, filter)) ?? null;
            },
            find: (filter: Filter<Document> = {}) => ({
              toArray: async () => store.filter((d) => matches(d, filter)),
            }),
            // Minimal positional-`arrayFilters` support — enough to exercise
            // `updateReviewStatus`'s exact shape (`'reviews.$[r].rStatus'` +
            // `arrayFilters: [{ 'r.legacyId': ... }]`), not a general
            // MongoDB update-operator emulator.
            updateOne: async (
              filter: Filter<Document>,
              update: { $set: Record<string, unknown> },
              options?: { arrayFilters?: Record<string, unknown>[] }
            ) => {
              const doc = store.find((d) => matches(d, filter));
              if (!doc) return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };

              for (const [path, value] of Object.entries(update.$set)) {
                const match = /^reviews\.\$\[(\w+)\]\.(\w+)$/.exec(path);
                if (!match) throw new Error(`Unsupported $set path in fake: ${path}`);
                const [, filterAlias, field] = match;
                const arrayFilter = options?.arrayFilters?.find((f) =>
                  Object.keys(f).some((k) => k.startsWith(`${filterAlias}.`))
                );
                if (!arrayFilter) throw new Error('Missing matching arrayFilter in fake');
                const [condKey, condValue] = Object.entries(arrayFilter)[0]!;
                const condField = condKey.split('.')[1]!;
                const reviews = doc.reviews as Document[];
                const target = reviews.find((r) => r[condField] === condValue);
                if (target) target[field!] = value;
              }
              return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
            },
            deleteOne: async (filter: Filter<Document>) => {
              const index = store.findIndex((d) => matches(d, filter));
              if (index !== -1) store.splice(index, 1);
              return { acknowledged: true, deletedCount: index !== -1 ? 1 : 0 };
            },
          } as unknown as Collection<Document>),
  } as unknown as Db;

  return { db, store };
}

describe('ProductRepository.findAll (FIXTURE — fake Db)', () => {
  it('returns every product, unfiltered', async () => {
    const { db } = createFakeDbWithArrayFilters([
      validProduct,
      { ...validProduct, legacyId: 2 },
    ]);
    const repo = new ProductRepository(db);

    const all = await repo.findAll();

    expect(all).toHaveLength(2);
  });

  it('returns an empty array when there are no products', async () => {
    const { db } = createFakeDbWithArrayFilters([]);
    const repo = new ProductRepository(db);

    await expect(repo.findAll()).resolves.toEqual([]);
  });
});

describe('ProductRepository.updateReviewStatus (FIXTURE — fake Db)', () => {
  const productWithReviews: Product = {
    ...validProduct,
    reviews: [
      { legacyId: 1, rName: 'Alice', rEmail: null, rRating: 5, rReview: 'Great!', rStatus: 1 },
      { legacyId: 2, rName: 'Bob', rEmail: null, rRating: 3, rReview: 'Okay.', rStatus: 0 },
    ],
  };

  it('updates only the targeted review inside the array, leaving others untouched', async () => {
    const { db, store } = createFakeDbWithArrayFilters([productWithReviews]);
    const repo = new ProductRepository(db);

    await repo.updateReviewStatus(validProduct.legacyId, 1, 0);

    const reviews = store[0]!.reviews as Array<{ legacyId: number; rStatus: number }>;
    expect(reviews.find((r) => r.legacyId === 1)?.rStatus).toBe(0);
    expect(reviews.find((r) => r.legacyId === 2)?.rStatus).toBe(0); // unchanged (was already 0)
  });

  it('does not affect a review with the same legacyId on a DIFFERENT product', async () => {
    const otherProduct: Product = {
      ...validProduct,
      legacyId: 99,
      reviews: [{ legacyId: 1, rName: 'Carol', rEmail: null, rRating: 4, rReview: 'Fine', rStatus: 1 }],
    };
    const { db, store } = createFakeDbWithArrayFilters([productWithReviews, otherProduct]);
    const repo = new ProductRepository(db);

    await repo.updateReviewStatus(validProduct.legacyId, 1, 0);

    const untouchedProduct = store.find((d) => d.legacyId === 99)!;
    const untouchedReviews = untouchedProduct.reviews as Array<{ legacyId: number; rStatus: number }>;
    expect(untouchedReviews[0]?.rStatus).toBe(1);
  });

  it('is a no-op when the product does not exist', async () => {
    const { db, store } = createFakeDbWithArrayFilters([productWithReviews]);
    const repo = new ProductRepository(db);

    await repo.updateReviewStatus(9999, 1, 0);

    expect(store).toHaveLength(1);
  });
});
