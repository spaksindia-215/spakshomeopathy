/**
 * `HomeopathyMasterRepository` tests — CR-006 Phase 4. See that
 * repository's own header for why this is GENUINELY NEW admin surface,
 * not a migration (no Laravel controller method to mirror).
 *
 * LABEL: FIXTURE. Against `createFakeCrudDb` (`tests/mongodb/fakeDb.ts`),
 * same shared fixture `blogCategoryRepository.test.ts`/
 * `pinCodeRepository.test.ts`/`sliderRepository.test.ts` already use —
 * NOT a real MongoDB connection.
 */

import { describe, it, expect } from 'vitest';
import { HomeopathyMasterRepository } from '@/lib/mongodb/repositories/homeopathyMasterRepository';
import type { HomeopathyMaster } from '@/lib/mongodb/schemas';
import { createFakeCrudDb } from './fakeDb';

const createFakeDb = createFakeCrudDb<HomeopathyMaster>;

const baseEntry: HomeopathyMaster = {
  legacyId: 1,
  name: 'Acidity Gastritis',
  image: '1700000000gimage.jpg',
  slug: 'acidity-gastritis-ab12c',
  status: 1,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

describe('HomeopathyMasterRepository (FIXTURE — fake Db)', () => {
  it('insertHomeopathy writes all fields, including a null image (no-upload case)', async () => {
    const { db, store } = createFakeDb();
    const repo = new HomeopathyMasterRepository(db);

    await repo.insertHomeopathy({ ...baseEntry, image: null });

    expect(store).toHaveLength(1);
    expect(store[0]?.name).toBe('Acidity Gastritis');
    expect(store[0]?.image).toBeNull();
    expect(store[0]?.slug).toBe('acidity-gastritis-ab12c');
  });

  it('findAllDescending sorts by legacyId DESC', async () => {
    const { db } = createFakeDb([
      { ...baseEntry, legacyId: 1 },
      { ...baseEntry, legacyId: 3 },
      { ...baseEntry, legacyId: 2 },
    ]);
    const repo = new HomeopathyMasterRepository(db);

    const results = await repo.findAllDescending();
    expect(results.map((r) => r.legacyId)).toEqual([3, 2, 1]);
  });

  it('findByLegacyId reads by legacyId', async () => {
    const { db } = createFakeDb([baseEntry]);
    const repo = new HomeopathyMasterRepository(db);

    const found = await repo.findByLegacyId(1);
    expect(found?.name).toBe('Acidity Gastritis');

    await expect(repo.findByLegacyId(999)).resolves.toBeNull();
  });

  it('updateHomeopathy updates only name/image/status, leaves legacyId/slug/createdAt untouched', async () => {
    const { db, store } = createFakeDb([baseEntry]);
    const repo = new HomeopathyMasterRepository(db);

    await repo.updateHomeopathy(1, {
      name: 'Updated Name',
      image: '1700000100gnew.jpg',
      status: 0,
    });

    expect(store[0]?.name).toBe('Updated Name');
    expect(store[0]?.image).toBe('1700000100gnew.jpg');
    expect(store[0]?.status).toBe(0);
    expect(store[0]?.legacyId).toBe(1); // untouched
    expect(store[0]?.slug).toBe('acidity-gastritis-ab12c'); // untouched
    expect(store[0]?.createdAt).toEqual(baseEntry.createdAt); // untouched — no updatedAt column exists to bump either
  });

  it('updateHomeopathy against a non-existent legacyId is a silent no-op', async () => {
    const { db, store } = createFakeDb([baseEntry]);
    const repo = new HomeopathyMasterRepository(db);

    await expect(repo.updateHomeopathy(999, { name: 'Should not apply' })).resolves.toBeUndefined();
    expect(store[0]?.name).toBe('Acidity Gastritis'); // unchanged
  });

  it('nextLegacyIdGeneric (inherited) returns MAX(legacyId)+1', async () => {
    const { db } = createFakeDb([
      { ...baseEntry, legacyId: 5 },
      { ...baseEntry, legacyId: 12 },
    ]);
    const repo = new HomeopathyMasterRepository(db);

    await expect(repo.nextLegacyIdGeneric()).resolves.toBe(13);
  });
});
