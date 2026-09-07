/**
 * `PostRepository` tests — M5-E (admin CRUD write paths, sixth
 * sub-slice: posts). Covers plain CRUD correctness plus
 * `findAllByTitleAscending`'s title-sort (NOT id-sort, unlike every
 * other list this project has built).
 *
 * LABEL: FIXTURE. Against `createFakeCrudDb` (`tests/mongodb/fakeDb.ts`)
 * — NOT a real MongoDB connection.
 */

import { describe, it, expect } from 'vitest';
import { PostRepository } from '@/lib/mongodb/repositories/postRepository';
import type { Post } from '@/lib/mongodb/schemas';
import { createFakeCrudDb } from './fakeDb';

const createFakeDb = createFakeCrudDb<Post>;

const basePost: Post = {
  legacyId: 1,
  pId: 'arnica-montana-abc12',
  homeopathyId: 5,
  diseaseId: 5,
  postTitle: 'Middle Post',
  postImage: '1700000000gimage.jpg',
  postDesc: 'A post description.',
  postStatus: 1,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('PostRepository (FIXTURE — fake Db)', () => {
  it('insertPost writes all fields', async () => {
    const { db, store } = createFakeDb();
    const repo = new PostRepository(db);

    await repo.insertPost(basePost);

    expect(store).toHaveLength(1);
    expect(store[0]?.postTitle).toBe('Middle Post');
    expect(store[0]?.homeopathyId).toBe(5);
    expect(store[0]?.diseaseId).toBe(5);
  });

  it('findAllByTitleAscending sorts by postTitle ASC, NOT legacyId (unlike every other list built so far)', async () => {
    const { db } = createFakeDb([
      { ...basePost, legacyId: 1, postTitle: 'Zebra Post' },
      { ...basePost, legacyId: 2, postTitle: 'Apple Post' },
      { ...basePost, legacyId: 3, postTitle: 'Middle Post' },
    ]);
    const repo = new PostRepository(db);

    const results = await repo.findAllByTitleAscending();
    expect(results.map((r) => r.postTitle)).toEqual(['Apple Post', 'Middle Post', 'Zebra Post']);
  });

  it('findByLegacyId reads by legacyId (== source id)', async () => {
    const { db } = createFakeDb([basePost]);
    const repo = new PostRepository(db);

    const found = await repo.findByLegacyId(1);
    expect(found?.postTitle).toBe('Middle Post');

    await expect(repo.findByLegacyId(999)).resolves.toBeNull();
  });

  it('updatePost updates content fields, leaves legacyId/pId/createdAt/updatedAt untouched', async () => {
    const { db, store } = createFakeDb([basePost]);
    const repo = new PostRepository(db);

    await repo.updatePost(1, {
      homeopathyId: 8,
      diseaseId: 8,
      postTitle: 'Updated Title',
      postImage: '1700000100gnew.jpg',
      postDesc: 'Updated description.',
      postStatus: 0,
    });

    expect(store[0]?.homeopathyId).toBe(8);
    expect(store[0]?.diseaseId).toBe(8);
    expect(store[0]?.postTitle).toBe('Updated Title');
    expect(store[0]?.postStatus).toBe(0);
    expect(store[0]?.legacyId).toBe(1); // untouched
    expect(store[0]?.pId).toBe('arnica-montana-abc12'); // untouched — updatePost doesn't touch pId unless explicitly passed
    expect(store[0]?.createdAt).toEqual(basePost.createdAt); // untouched
    expect(store[0]?.updatedAt).toEqual(basePost.updatedAt); // untouched — FIX-004 precedent
  });

  it('updatePost against a non-existent legacyId is a silent no-op', async () => {
    const { db, store } = createFakeDb([basePost]);
    const repo = new PostRepository(db);

    await expect(repo.updatePost(999, { postTitle: 'Should not apply' })).resolves.toBeUndefined();
    expect(store[0]?.postTitle).toBe('Middle Post'); // unchanged
  });

  it('deletePost removes the matching document by legacyId', async () => {
    const { db, store } = createFakeDb([
      { ...basePost, legacyId: 1 },
      { ...basePost, legacyId: 2 },
    ]);
    const repo = new PostRepository(db);

    await repo.deletePost(1);

    expect(store).toHaveLength(1);
    expect(store[0]?.legacyId).toBe(2);
  });

  it('deletePost against a non-existent legacyId is a silent no-op', async () => {
    const { db, store } = createFakeDb([basePost]);
    const repo = new PostRepository(db);

    await expect(repo.deletePost(999)).resolves.toBeUndefined();
    expect(store).toHaveLength(1);
  });

  it('nextLegacyIdGeneric (inherited) returns MAX(legacyId)+1', async () => {
    const { db } = createFakeDb([
      { ...basePost, legacyId: 5 },
      { ...basePost, legacyId: 12 },
    ]);
    const repo = new PostRepository(db);

    await expect(repo.nextLegacyIdGeneric()).resolves.toBe(13);
  });
});
