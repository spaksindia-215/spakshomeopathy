/**
 * `SliderRepository` tests — M5-E (admin CRUD write paths, second
 * sub-slice: sliders). Unlike pincode (B-09/DR-03), this entity had no
 * pre-existing column-mismatch defect — `slider`'s real columns already
 * match what `AdminController::SaveSlider`/`UpdateSlider` write, so this
 * suite covers plain CRUD correctness plus the ordering/no-op-on-missing-id
 * semantics established by the pincode sub-slice.
 *
 * LABEL: FIXTURE. Against `createFakeCrudDb` (`tests/mongodb/fakeDb.ts`),
 * shared with `pinCodeRepository.test.ts` — NOT a real MongoDB connection.
 */

import { describe, it, expect } from 'vitest';
import { SliderRepository } from '@/lib/mongodb/repositories/sliderRepository';
import type { Slider } from '@/lib/mongodb/schemas';
import { createFakeCrudDb } from './fakeDb';

const createFakeDb = createFakeCrudDb<Slider>;

const baseSlider: Slider = {
  legacyId: 1,
  sliderTitle: 'Test Slider',
  sliderSubtitle: 'Test Subtitle',
  sliderImage: '1700000000gtest.jpg',
  sliderStatus: 1,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('SliderRepository (FIXTURE — fake Db)', () => {
  it('insertSlider writes all required NOT-NULL fields', async () => {
    const { db, store } = createFakeDb();
    const repo = new SliderRepository(db);

    await repo.insertSlider(baseSlider);

    expect(store).toHaveLength(1);
    expect(store[0]?.sliderTitle).toBe('Test Slider');
    expect(store[0]?.sliderImage).toBe('1700000000gtest.jpg');
    expect(store[0]?.sliderStatus).toBe(1);
  });

  it('findAllDescending sorts by legacyId DESC, mirroring orderBy(id,desc)', async () => {
    const { db } = createFakeDb([
      { ...baseSlider, legacyId: 1 },
      { ...baseSlider, legacyId: 3 },
      { ...baseSlider, legacyId: 2 },
    ]);
    const repo = new SliderRepository(db);

    const results = await repo.findAllDescending();
    expect(results.map((r) => r.legacyId)).toEqual([3, 2, 1]);
  });

  it("findAllDescending returns an empty array against zero rows (matches P-18's real production count)", async () => {
    const { db } = createFakeDb([]);
    const repo = new SliderRepository(db);

    await expect(repo.findAllDescending()).resolves.toEqual([]);
  });

  it('findByLegacyId reads by legacyId (== source id)', async () => {
    const { db } = createFakeDb([baseSlider]);
    const repo = new SliderRepository(db);

    const found = await repo.findByLegacyId(1);
    expect(found?.sliderTitle).toBe('Test Slider');

    await expect(repo.findByLegacyId(999)).resolves.toBeNull();
  });

  it('updateSlider updates only the targeted fields, leaves legacyId/createdAt untouched', async () => {
    const { db, store } = createFakeDb([baseSlider]);
    const repo = new SliderRepository(db);

    await repo.updateSlider(1, {
      sliderTitle: 'Updated Title',
      sliderImage: '1700000100gnew.jpg',
      sliderStatus: 0,
      updatedAt: new Date('2026-02-01T00:00:00Z'),
    });

    expect(store[0]?.sliderTitle).toBe('Updated Title');
    expect(store[0]?.sliderImage).toBe('1700000100gnew.jpg');
    expect(store[0]?.sliderStatus).toBe(0);
    expect(store[0]?.legacyId).toBe(1); // untouched
    expect(store[0]?.createdAt).toEqual(baseSlider.createdAt); // untouched
  });

  it('updateSlider against a non-existent legacyId is a silent no-op (matches WHERE id=$id UPDATE on zero rows)', async () => {
    const { db, store } = createFakeDb([baseSlider]);
    const repo = new SliderRepository(db);

    await expect(repo.updateSlider(999, { sliderStatus: 0 })).resolves.toBeUndefined();
    expect(store[0]?.sliderStatus).toBe(1); // unchanged
  });

  it('deleteSlider removes the matching document by legacyId', async () => {
    const { db, store } = createFakeDb([
      { ...baseSlider, legacyId: 1 },
      { ...baseSlider, legacyId: 2 },
    ]);
    const repo = new SliderRepository(db);

    await repo.deleteSlider(1);

    expect(store).toHaveLength(1);
    expect(store[0]?.legacyId).toBe(2);
  });

  it('deleteSlider against a non-existent legacyId is a silent no-op (matches WHERE id=$id DELETE on zero rows)', async () => {
    const { db, store } = createFakeDb([baseSlider]);
    const repo = new SliderRepository(db);

    await expect(repo.deleteSlider(999)).resolves.toBeUndefined();
    expect(store).toHaveLength(1);
  });

  it('nextLegacyIdGeneric (inherited) returns MAX(legacyId)+1', async () => {
    const { db } = createFakeDb([
      { ...baseSlider, legacyId: 5 },
      { ...baseSlider, legacyId: 12 },
    ]);
    const repo = new SliderRepository(db);

    await expect(repo.nextLegacyIdGeneric()).resolves.toBe(13);
  });

  it('nextLegacyIdGeneric returns 1 against an empty collection', async () => {
    const { db } = createFakeDb([]);
    const repo = new SliderRepository(db);

    await expect(repo.nextLegacyIdGeneric()).resolves.toBe(1);
  });
});
