/**
 * `CategoryRepository` admin CRUD tests — M5-E (admin CRUD write paths,
 * fourth sub-slice: categories/disease-herb tree). Covers
 * `findAllDescending`/`findByLegacyId`/`insertCategory`/`updateCategory`,
 * added this sub-slice. `findByType`/`searchByName` (pre-existing, M3-A/
 * M5-C) are NOT re-tested here — see `tests/mongodb/search.test.ts` for
 * those.
 *
 * LABEL: FIXTURE. Against `createFakeCrudDb` (`tests/mongodb/fakeDb.ts`)
 * — NOT a real MongoDB connection.
 */

import { describe, it, expect } from 'vitest';
import { CategoryRepository } from '@/lib/mongodb/repositories/categoryRepository';
import type { Category } from '@/lib/mongodb/schemas';
import { createFakeCrudDb } from './fakeDb';

const createFakeDb = createFakeCrudDb<Category>;

const baseCategory: Category = {
  legacyId: 1,
  name: 'Hair Fall',
  image: '1700000000gimage.jpg',
  slug: 'hair-fall-54321',
  type: 'N',
  status: 1,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

describe('CategoryRepository admin CRUD (FIXTURE — fake Db)', () => {
  it('insertCategory writes all fields, no updatedAt (categories has no such column in source)', async () => {
    const { db, store } = createFakeDb();
    const repo = new CategoryRepository(db);

    await repo.insertCategory(baseCategory);

    expect(store).toHaveLength(1);
    expect(store[0]?.name).toBe('Hair Fall');
    expect(store[0]?.type).toBe('N');
    expect(store[0]).not.toHaveProperty('updatedAt');
  });

  it('findAllDescending sorts by legacyId DESC, mirroring orderBy(id,DESC)', async () => {
    const { db } = createFakeDb([
      { ...baseCategory, legacyId: 1 },
      { ...baseCategory, legacyId: 3 },
      { ...baseCategory, legacyId: 2 },
    ]);
    const repo = new CategoryRepository(db);

    const results = await repo.findAllDescending();
    expect(results.map((r) => r.legacyId)).toEqual([3, 2, 1]);
  });

  it("findAllByNameAscending sorts by name ASC, mirroring AddPost/SavePost's $getHomo query — DIFFERENT sort from findAllDescending", async () => {
    const { db } = createFakeDb([
      { ...baseCategory, legacyId: 1, name: 'Zebra' },
      { ...baseCategory, legacyId: 2, name: 'Apple' },
      { ...baseCategory, legacyId: 3, name: 'Middle' },
    ]);
    const repo = new CategoryRepository(db);

    const results = await repo.findAllByNameAscending();
    expect(results.map((r) => r.name)).toEqual(['Apple', 'Middle', 'Zebra']);
  });

  it('findByLegacyId reads by legacyId (== source id)', async () => {
    const { db } = createFakeDb([baseCategory]);
    const repo = new CategoryRepository(db);

    const found = await repo.findByLegacyId(1);
    expect(found?.name).toBe('Hair Fall');

    await expect(repo.findByLegacyId(999)).resolves.toBeNull();
  });

  it('updateCategory updates name/image/type/status, leaves legacyId/slug/createdAt untouched', async () => {
    const { db, store } = createFakeDb([baseCategory]);
    const repo = new CategoryRepository(db);

    await repo.updateCategory(1, {
      name: 'Updated Name',
      image: '1700000100gnew.jpg',
      type: 'H',
      status: 0,
    });

    expect(store[0]?.name).toBe('Updated Name');
    expect(store[0]?.image).toBe('1700000100gnew.jpg');
    expect(store[0]?.type).toBe('H');
    expect(store[0]?.status).toBe(0);
    expect(store[0]?.legacyId).toBe(1); // untouched
    expect(store[0]?.slug).toBe('hair-fall-54321'); // untouched — UpdateCategory never re-slugs
    expect(store[0]?.createdAt).toEqual(baseCategory.createdAt); // untouched
  });

  it('updateCategory can set status alone, mirroring UpdateCategoryStausActive/Inactive', async () => {
    const { db, store } = createFakeDb([baseCategory]);
    const repo = new CategoryRepository(db);

    await repo.updateCategory(1, { status: 0 });

    expect(store[0]?.status).toBe(0);
    expect(store[0]?.name).toBe('Hair Fall'); // untouched — only status was passed
  });

  it('updateCategory against a non-existent legacyId is a silent no-op', async () => {
    const { db, store } = createFakeDb([baseCategory]);
    const repo = new CategoryRepository(db);

    await expect(repo.updateCategory(999, { status: 0 })).resolves.toBeUndefined();
    expect(store[0]?.status).toBe(1); // unchanged
  });

  it('nextLegacyIdGeneric (inherited) returns MAX(legacyId)+1', async () => {
    const { db } = createFakeDb([
      { ...baseCategory, legacyId: 5 },
      { ...baseCategory, legacyId: 12 },
    ]);
    const repo = new CategoryRepository(db);

    await expect(repo.nextLegacyIdGeneric()).resolves.toBe(13);
  });
});
