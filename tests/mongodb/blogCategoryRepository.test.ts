/**
 * `BlogCategoryRepository` tests — M5-E (admin CRUD write paths, third
 * sub-slice: blog categories). Covers plain CRUD correctness plus the
 * `updateBlogCategory` field-omission contract (no `updatedAt` param
 * accepted at all — see the type signature in
 * `blogCategoryRepository.ts` and `update-blog-category/route.ts`'s
 * FIX-004 note).
 *
 * LABEL: FIXTURE. Against `createFakeCrudDb` (`tests/mongodb/fakeDb.ts`),
 * shared with `pinCodeRepository.test.ts`/`sliderRepository.test.ts` —
 * NOT a real MongoDB connection.
 */

import { describe, it, expect } from 'vitest';
import { BlogCategoryRepository } from '@/lib/mongodb/repositories/blogCategoryRepository';
import type { BlogCategory } from '@/lib/mongodb/schemas';
import { createFakeCrudDb } from './fakeDb';

const createFakeDb = createFakeCrudDb<BlogCategory>;

const baseCategory: BlogCategory = {
  legacyId: 1,
  bcatName: 'Health Tips',
  bcatImage: '1700000000gimage.jpg',
  bcatSlug: 'health-tips-ab12c',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('BlogCategoryRepository (FIXTURE — fake Db)', () => {
  it('insertBlogCategory writes all fields, including an empty bcatImage (no-upload case)', async () => {
    const { db, store } = createFakeDb();
    const repo = new BlogCategoryRepository(db);

    await repo.insertBlogCategory({ ...baseCategory, bcatImage: '' });

    expect(store).toHaveLength(1);
    expect(store[0]?.bcatName).toBe('Health Tips');
    expect(store[0]?.bcatImage).toBe('');
    expect(store[0]?.bcatSlug).toBe('health-tips-ab12c');
  });

  it('findAllDescending sorts by legacyId DESC, mirroring orderBy(id,desc)', async () => {
    const { db } = createFakeDb([
      { ...baseCategory, legacyId: 1 },
      { ...baseCategory, legacyId: 3 },
      { ...baseCategory, legacyId: 2 },
    ]);
    const repo = new BlogCategoryRepository(db);

    const results = await repo.findAllDescending();
    expect(results.map((r) => r.legacyId)).toEqual([3, 2, 1]);
  });

  it('findByLegacyId reads by legacyId (== source id)', async () => {
    const { db } = createFakeDb([baseCategory]);
    const repo = new BlogCategoryRepository(db);

    const found = await repo.findByLegacyId(1);
    expect(found?.bcatName).toBe('Health Tips');

    await expect(repo.findByLegacyId(999)).resolves.toBeNull();
  });

  it('updateBlogCategory updates only bcatName/bcatImage, leaves legacyId/bcatSlug/createdAt/updatedAt untouched', async () => {
    const { db, store } = createFakeDb([baseCategory]);
    const repo = new BlogCategoryRepository(db);

    await repo.updateBlogCategory(1, {
      bcatName: 'Updated Name',
      bcatImage: '1700000100gnew.jpg',
    });

    expect(store[0]?.bcatName).toBe('Updated Name');
    expect(store[0]?.bcatImage).toBe('1700000100gnew.jpg');
    expect(store[0]?.legacyId).toBe(1); // untouched
    expect(store[0]?.bcatSlug).toBe('health-tips-ab12c'); // untouched — source's UpdateBlogCategory never re-slugs
    expect(store[0]?.createdAt).toEqual(baseCategory.createdAt); // untouched
    expect(store[0]?.updatedAt).toEqual(baseCategory.updatedAt); // untouched — FIX-004: no ON UPDATE clause on this table
  });

  it('updateBlogCategory against a non-existent legacyId is a silent no-op', async () => {
    const { db, store } = createFakeDb([baseCategory]);
    const repo = new BlogCategoryRepository(db);

    await expect(
      repo.updateBlogCategory(999, { bcatName: 'Should not apply' })
    ).resolves.toBeUndefined();
    expect(store[0]?.bcatName).toBe('Health Tips'); // unchanged
  });

  it('deleteBlogCategory removes the matching document by legacyId', async () => {
    const { db, store } = createFakeDb([
      { ...baseCategory, legacyId: 1 },
      { ...baseCategory, legacyId: 2 },
    ]);
    const repo = new BlogCategoryRepository(db);

    await repo.deleteBlogCategory(1);

    expect(store).toHaveLength(1);
    expect(store[0]?.legacyId).toBe(2);
  });

  it('deleteBlogCategory against a non-existent legacyId is a silent no-op', async () => {
    const { db, store } = createFakeDb([baseCategory]);
    const repo = new BlogCategoryRepository(db);

    await expect(repo.deleteBlogCategory(999)).resolves.toBeUndefined();
    expect(store).toHaveLength(1);
  });

  it('nextLegacyIdGeneric (inherited) returns MAX(legacyId)+1', async () => {
    const { db } = createFakeDb([
      { ...baseCategory, legacyId: 5 },
      { ...baseCategory, legacyId: 12 },
    ]);
    const repo = new BlogCategoryRepository(db);

    await expect(repo.nextLegacyIdGeneric()).resolves.toBe(13);
  });
});
