/**
 * `ProductCategoryRepository` admin CRUD tests — M5-E (admin CRUD write
 * paths, seventh sub-slice: product_category, all 3 levels: top-level,
 * sub-category, "other" category). `findChildren` (pre-existing, M3-A)
 * is NOT re-tested here.
 *
 * LABEL: FIXTURE. Against `createFakeCrudDb` (`tests/mongodb/fakeDb.ts`)
 * — NOT a real MongoDB connection.
 */

import { describe, it, expect } from 'vitest';
import { ProductCategoryRepository } from '@/lib/mongodb/repositories/categoryRepository';
import type { ProductCategory } from '@/lib/mongodb/schemas';
import { createFakeCrudDb } from './fakeDb';

const createFakeDb = createFakeCrudDb<ProductCategory>;

const baseTopLevel: ProductCategory = {
  legacyId: 1,
  parentId: 0,
  catName: 'Ayurvedic Products',
  catImage: '1700000000gimage.jpg',
  catLevel: 1,
  catSlug: 'ayurvedic-products-ab12c',
  catStatus: 1,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('ProductCategoryRepository admin CRUD (FIXTURE — fake Db)', () => {
  it('insertProductCategory writes all fields for a top-level category (parentId=0, catLevel=1)', async () => {
    const { db, store } = createFakeDb();
    const repo = new ProductCategoryRepository(db);

    await repo.insertProductCategory(baseTopLevel);

    expect(store).toHaveLength(1);
    expect(store[0]?.catName).toBe('Ayurvedic Products');
    expect(store[0]?.parentId).toBe(0);
    expect(store[0]?.catLevel).toBe(1);
  });

  it('insertProductCategory writes a sub-category (catLevel=2, parentId set to a real top-level id)', async () => {
    const { db, store } = createFakeDb();
    const repo = new ProductCategoryRepository(db);

    await repo.insertProductCategory({
      ...baseTopLevel,
      legacyId: 2,
      parentId: 1,
      catLevel: 2,
      catName: 'Oils',
    });

    expect(store[0]?.catLevel).toBe(2);
    expect(store[0]?.parentId).toBe(1);
  });

  it('insertProductCategory writes an "other" category with a null parentId, mirroring the always-empty p_subcat submission', async () => {
    const { db, store } = createFakeDb();
    const repo = new ProductCategoryRepository(db);

    await repo.insertProductCategory({
      ...baseTopLevel,
      legacyId: 3,
      parentId: null,
      catLevel: 3,
      catName: 'Seasonal',
    });

    expect(store[0]?.catLevel).toBe(3);
    expect(store[0]?.parentId).toBeNull();
  });

  it('findAllDescending sorts by legacyId DESC with NO catLevel filter, mirroring ProductCategoryList exactly', async () => {
    const { db } = createFakeDb([
      { ...baseTopLevel, legacyId: 1, catLevel: 1 },
      { ...baseTopLevel, legacyId: 2, catLevel: 2 },
      { ...baseTopLevel, legacyId: 3, catLevel: 3 },
    ]);
    const repo = new ProductCategoryRepository(db);

    const results = await repo.findAllDescending();
    // All 3 levels present — no filter applied.
    expect(results.map((r) => r.legacyId)).toEqual([3, 2, 1]);
  });

  it('findByLevelDescending filters by catLevel AND sorts DESC, mirroring ProductSubCategoryList/OtherCategoryList', async () => {
    const { db } = createFakeDb([
      { ...baseTopLevel, legacyId: 1, catLevel: 1 },
      { ...baseTopLevel, legacyId: 2, catLevel: 2 },
      { ...baseTopLevel, legacyId: 3, catLevel: 2 },
      { ...baseTopLevel, legacyId: 4, catLevel: 3 },
    ]);
    const repo = new ProductCategoryRepository(db);

    const subcats = await repo.findByLevelDescending(2);
    expect(subcats.map((r) => r.legacyId)).toEqual([3, 2]);

    const others = await repo.findByLevelDescending(3);
    expect(others.map((r) => r.legacyId)).toEqual([4]);
  });

  it("findTopLevel returns only parentId=0 rows, mirroring AddProductSubCategory's dropdown query", async () => {
    const { db } = createFakeDb([
      { ...baseTopLevel, legacyId: 1, parentId: 0 },
      { ...baseTopLevel, legacyId: 2, parentId: 1, catLevel: 2 },
      { ...baseTopLevel, legacyId: 3, parentId: 0 },
    ]);
    const repo = new ProductCategoryRepository(db);

    const results = await repo.findTopLevel();
    expect(results.map((r) => r.legacyId).sort()).toEqual([1, 3]);
  });

  it('findByLegacyId reads by legacyId (== source id)', async () => {
    const { db } = createFakeDb([baseTopLevel]);
    const repo = new ProductCategoryRepository(db);

    const found = await repo.findByLegacyId(1);
    expect(found?.catName).toBe('Ayurvedic Products');

    await expect(repo.findByLegacyId(999)).resolves.toBeNull();
  });

  it('deleteProductCategory removes the matching document by legacyId, regardless of catLevel (shared delete handler)', async () => {
    const { db, store } = createFakeDb([
      { ...baseTopLevel, legacyId: 1, catLevel: 1 },
      { ...baseTopLevel, legacyId: 2, catLevel: 3 },
    ]);
    const repo = new ProductCategoryRepository(db);

    await repo.deleteProductCategory(2);

    expect(store).toHaveLength(1);
    expect(store[0]?.legacyId).toBe(1);
  });

  it('deleteProductCategory against a non-existent legacyId is a silent no-op', async () => {
    const { db, store } = createFakeDb([baseTopLevel]);
    const repo = new ProductCategoryRepository(db);

    await expect(repo.deleteProductCategory(999)).resolves.toBeUndefined();
    expect(store).toHaveLength(1);
  });

  it('nextLegacyIdGeneric (inherited) returns MAX(legacyId)+1 across all levels combined (one shared id sequence)', async () => {
    const { db } = createFakeDb([
      { ...baseTopLevel, legacyId: 5, catLevel: 1 },
      { ...baseTopLevel, legacyId: 12, catLevel: 3 },
    ]);
    const repo = new ProductCategoryRepository(db);

    await expect(repo.nextLegacyIdGeneric()).resolves.toBe(13);
  });
});
