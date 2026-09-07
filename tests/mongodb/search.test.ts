/**
 * `CategoryRepository.searchByName` / `ProductRepository.searchByCategoryAndName`
 * tests — M5-C (Search), added retroactively closing this milestone's gate
 * report (`docs/GATE-REPORT-M5-C.md`). Both methods were implemented
 * 2026-08-26 (`search-products/route.ts`, `search-results/page.tsx`,
 * `diseases-list/page.tsx`) but shipped with no dedicated test coverage —
 * this file closes that gap, added at gate-close rather than at
 * implementation time.
 *
 * LABEL: FIXTURE. Against a minimal in-memory fake `Db`/`Collection`
 * (same small pattern as `tests/mongodb/enquiryRepository.test.ts` —
 * supports `insertOne`/`find().toArray()`, the operations
 * `ValidatedRepository.find()` actually calls; `$regex`/`$options`
 * matching is hand-implemented in-memory rather than a real MongoDB
 * connection). Never describe this file's assertions as "MongoDB
 * integration" — see `docs/M4-PREPARATION.md`'s test-label taxonomy.
 */

import { describe, it, expect } from 'vitest';
import { CategoryRepository } from '@/lib/mongodb/repositories/categoryRepository';
import { ProductRepository } from '@/lib/mongodb/repositories/productRepository';
import type { Category } from '@/lib/mongodb/schemas';
import type { Db, Collection, Document, Filter } from 'mongodb';
import { validProduct } from './fixtures';

/** Minimal fake `Db` supporting only what `ValidatedRepository.find()`
 * calls (`collection.find(filter).toArray()`), with a hand-rolled
 * `$regex`/`$options: 'i'` matcher — the one operator shape these two new
 * repository methods actually use beyond plain equality. */
function createFakeDb(seed: Document[] = []) {
  const store: Document[] = [...seed];
  const matches = (doc: Document, filter: Filter<Document>): boolean =>
    Object.entries(filter).every(([key, value]) => {
      if (
        value !== null &&
        typeof value === 'object' &&
        '$regex' in (value as Record<string, unknown>)
      ) {
        const { $regex, $options } = value as { $regex: string; $options?: string };
        const re = new RegExp($regex, $options);
        const field = doc[key];
        return typeof field === 'string' && re.test(field);
      }
      return doc[key] === value;
    });

  const db = {
    collection: () =>
      ({
        find: (filter: Filter<Document>) => ({
          toArray: async () => store.filter((d) => matches(d, filter)),
        }),
      }) as unknown as Collection<Document>,
  } as unknown as Db;
  return { db, store };
}

const baseCategory: Category = {
  legacyId: 1,
  name: 'Hair Fall',
  image: 'hairfall.jpg',
  slug: 'hair-fall',
  type: 'N',
  status: 1,
  createdAt: new Date('2020-01-01T00:00:00Z'),
};

// Reuses the shared, schema-complete fixture (tests/mongodb/fixtures.ts)
// rather than hand-rolling a partial Product — the full 83-column shape
// (F-20) means an incomplete inline fixture would either need an `as
// Product` cast (defeating ValidatedRepository's own point) or silently
// drift from the real schema over time.
const baseProduct = { ...validProduct, pName: 'Arnica Montana', pCat: 24 };

describe('CategoryRepository.searchByName (M5-C — Diseases branch of SearchProduct)', () => {
  it('matches case-insensitively on a substring, mirroring MariaDB LIKE on a latin1_swedish_ci column', async () => {
    const { db } = createFakeDb([baseCategory, { ...baseCategory, legacyId: 2, name: 'Dandruff' }]);
    const repo = new CategoryRepository(db);

    const results = await repo.searchByName('hair', 'N', 1);
    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe('Hair Fall');

    // Case-insensitivity, explicitly (not just a lucky substring match)
    const upper = await repo.searchByName('HAIR', 'N', 1);
    expect(upper).toHaveLength(1);
  });

  it('respects the type/status filter exactly like findByType — a Herb-type or inactive category never matches a Diseases-branch search', async () => {
    const { db } = createFakeDb([
      baseCategory,
      { ...baseCategory, legacyId: 2, type: 'H' }, // Herb, not Disease
      { ...baseCategory, legacyId: 3, status: 0 }, // inactive
    ]);
    const repo = new CategoryRepository(db);

    const results = await repo.searchByName('hair', 'N', 1);
    expect(results).toHaveLength(1);
    expect(results[0]?.legacyId).toBe(1);
  });

  it('returns an empty array for a term matching nothing, not null/undefined', async () => {
    const { db } = createFakeDb([baseCategory]);
    const repo = new CategoryRepository(db);

    await expect(repo.searchByName('nonexistent-term', 'N', 1)).resolves.toEqual([]);
  });
});

describe('ProductRepository.searchByCategoryAndName (M5-C — Herbs/else branch of SearchProduct, B-14)', () => {
  it('filters on the exact pCat passed in — the caller (search-results/page.tsx) is responsible for B-14’s hardcoded 24, not this method', async () => {
    const { db } = createFakeDb([
      baseProduct,
      { ...baseProduct, legacyId: 2, pCat: 5, pName: 'Different Category Arnica' },
    ]);
    const repo = new ProductRepository(db);

    const results = await repo.searchByCategoryAndName(24, 'arnica', 1);
    expect(results).toHaveLength(1);
    expect(results[0]?.legacyId).toBe(1);
  });

  it('matches case-insensitively on a substring, mirroring MariaDB LIKE on a latin1_swedish_ci products table', async () => {
    const { db } = createFakeDb([baseProduct]);
    const repo = new ProductRepository(db);

    const results = await repo.searchByCategoryAndName(24, 'ARNICA', 1);
    expect(results).toHaveLength(1);
  });

  it('respects pStatus — an inactive product never matches, mirroring products.p_status=1', async () => {
    const { db } = createFakeDb([{ ...baseProduct, pStatus: 0 }]);
    const repo = new ProductRepository(db);

    await expect(repo.searchByCategoryAndName(24, 'arnica', 1)).resolves.toEqual([]);
  });

  it('returns an empty array against pCat=24 with no matching category in a realistic dataset (documented expected-empty case, not a bug)', async () => {
    // Mirrors the real spaks_dev finding documented in search-results/
    // page.tsx's own header: zero real products exist under pCat=24 today.
    const { db } = createFakeDb([{ ...baseProduct, pCat: 5 }]);
    const repo = new ProductRepository(db);

    await expect(repo.searchByCategoryAndName(24, 'arnica', 1)).resolves.toEqual([]);
  });
});
