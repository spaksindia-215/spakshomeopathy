/**
 * `BlogRepository` tests — M5-E (admin CRUD write paths, fifth
 * sub-slice: blogs). Covers plain CRUD correctness plus the
 * `updateBlog` field-omission contract (no `updatedAt`, no `blogSlug` —
 * source never re-slugs on update).
 *
 * LABEL: FIXTURE. Against `createFakeCrudDb` (`tests/mongodb/fakeDb.ts`)
 * — NOT a real MongoDB connection.
 */

import { describe, it, expect } from 'vitest';
import { BlogRepository } from '@/lib/mongodb/repositories/blogRepository';
import type { Blog } from '@/lib/mongodb/schemas';
import { createFakeCrudDb } from './fakeDb';

const createFakeDb = createFakeCrudDb<Blog>;

const baseBlog: Blog = {
  legacyId: 1,
  categoryId: 1,
  blogTitle: 'Herbal Remedies',
  blogImage: '1700000000gimage.jpg',
  blogDesc: 'A blog about herbal remedies.',
  blogAuthor: 'Admin',
  blogSlug: 'herbal-remedies-ab12c',
  blogStatus: 1,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('BlogRepository (FIXTURE — fake Db)', () => {
  it('insertBlog writes all fields', async () => {
    const { db, store } = createFakeDb();
    const repo = new BlogRepository(db);

    await repo.insertBlog(baseBlog);

    expect(store).toHaveLength(1);
    expect(store[0]?.blogTitle).toBe('Herbal Remedies');
    expect(store[0]?.blogSlug).toBe('herbal-remedies-ab12c');
    expect(store[0]?.categoryId).toBe(1);
  });

  it('findAllDescending sorts by legacyId DESC, mirroring orderBy(id,desc)', async () => {
    const { db } = createFakeDb([
      { ...baseBlog, legacyId: 1 },
      { ...baseBlog, legacyId: 3 },
      { ...baseBlog, legacyId: 2 },
    ]);
    const repo = new BlogRepository(db);

    const results = await repo.findAllDescending();
    expect(results.map((r) => r.legacyId)).toEqual([3, 2, 1]);
  });

  it('findByLegacyId reads by legacyId (== source id)', async () => {
    const { db } = createFakeDb([baseBlog]);
    const repo = new BlogRepository(db);

    const found = await repo.findByLegacyId(1);
    expect(found?.blogTitle).toBe('Herbal Remedies');

    await expect(repo.findByLegacyId(999)).resolves.toBeNull();
  });

  it('updateBlog updates content fields, leaves legacyId/blogSlug/createdAt/updatedAt untouched', async () => {
    const { db, store } = createFakeDb([baseBlog]);
    const repo = new BlogRepository(db);

    await repo.updateBlog(1, {
      categoryId: 2,
      blogTitle: 'Updated Title',
      blogImage: '1700000100gnew.jpg',
      blogDesc: 'Updated description.',
      blogAuthor: 'New Author',
      blogStatus: 0,
    });

    expect(store[0]?.categoryId).toBe(2);
    expect(store[0]?.blogTitle).toBe('Updated Title');
    expect(store[0]?.blogImage).toBe('1700000100gnew.jpg');
    expect(store[0]?.blogAuthor).toBe('New Author');
    expect(store[0]?.blogStatus).toBe(0);
    expect(store[0]?.legacyId).toBe(1); // untouched
    expect(store[0]?.blogSlug).toBe('herbal-remedies-ab12c'); // untouched — UpdateBlog never re-slugs
    expect(store[0]?.createdAt).toEqual(baseBlog.createdAt); // untouched
    expect(store[0]?.updatedAt).toEqual(baseBlog.updatedAt); // untouched — FIX-004: no ON UPDATE clause on this table
  });

  it('updateBlog against a non-existent legacyId is a silent no-op', async () => {
    const { db, store } = createFakeDb([baseBlog]);
    const repo = new BlogRepository(db);

    await expect(repo.updateBlog(999, { blogTitle: 'Should not apply' })).resolves.toBeUndefined();
    expect(store[0]?.blogTitle).toBe('Herbal Remedies'); // unchanged
  });

  it('deleteBlog removes the matching document by legacyId', async () => {
    const { db, store } = createFakeDb([
      { ...baseBlog, legacyId: 1 },
      { ...baseBlog, legacyId: 2 },
    ]);
    const repo = new BlogRepository(db);

    await repo.deleteBlog(1);

    expect(store).toHaveLength(1);
    expect(store[0]?.legacyId).toBe(2);
  });

  it('deleteBlog against a non-existent legacyId is a silent no-op', async () => {
    const { db, store } = createFakeDb([baseBlog]);
    const repo = new BlogRepository(db);

    await expect(repo.deleteBlog(999)).resolves.toBeUndefined();
    expect(store).toHaveLength(1);
  });

  it('nextLegacyIdGeneric (inherited) returns MAX(legacyId)+1', async () => {
    const { db } = createFakeDb([
      { ...baseBlog, legacyId: 5 },
      { ...baseBlog, legacyId: 12 },
    ]);
    const repo = new BlogRepository(db);

    await expect(repo.nextLegacyIdGeneric()).resolves.toBe(13);
  });
});
