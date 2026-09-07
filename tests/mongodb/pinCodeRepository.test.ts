/**
 * `PinCodeRepository` tests — M5-E (admin CRUD write paths, first
 * sub-slice: pin codes). Covers DR-03's resolution (Fix Register FIX-001):
 * insert/update/delete against the collection's REAL column shape
 * (`pincode`/`location`/`country`/`uid`/`status`), never the broken
 * `pin_code`/`pin_address`/`pin_status` names Laravel's controller
 * actually wrote (and SQL-errored on).
 *
 * LABEL: FIXTURE. Against `createFakeCrudDb` (`tests/mongodb/fakeDb.ts`),
 * a minimal in-memory fake `Db`/`Collection` shared with
 * `sliderRepository.test.ts` and every future M5-E sub-slice's own
 * repository test (extracted this session from what was originally an
 * inline copy in this file, to avoid a second/third verbatim duplicate —
 * see that file's own header) — NOT a real MongoDB connection.
 */

import { describe, it, expect } from 'vitest';
import { PinCodeRepository } from '@/lib/mongodb/repositories/pinCodeRepository';
import type { PinCode } from '@/lib/mongodb/schemas';
import { createFakeCrudDb } from './fakeDb';

const createFakeDb = createFakeCrudDb<PinCode>;

const basePinCode: PinCode = {
  legacyId: 1,
  uid: null,
  country: null,
  pincode: '110025',
  location: 'Test Address',
  status: '1',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('PinCodeRepository (FIXTURE — fake Db, DR-03 Option 2 / Fix Register FIX-001)', () => {
  it('insertPinCode writes the REAL column shape (pincode/location/status), not the broken pin_code/pin_address/pin_status names', async () => {
    const { db, store } = createFakeDb();
    const repo = new PinCodeRepository(db);

    await repo.insertPinCode(basePinCode);

    expect(store).toHaveLength(1);
    expect(store[0]?.pincode).toBe('110025');
    expect(store[0]?.location).toBe('Test Address');
    expect(store[0]?.status).toBe('1');
    // The columns Laravel's broken SavePinCode actually referenced never
    // appear on the stored document at all.
    expect(store[0]?.pin_code).toBeUndefined();
    expect(store[0]?.pin_address).toBeUndefined();
    expect(store[0]?.pin_status).toBeUndefined();
  });

  it('findAllDescending sorts by legacyId DESC, mirroring orderBy(id,desc)', async () => {
    const { db } = createFakeDb([
      { ...basePinCode, legacyId: 1 },
      { ...basePinCode, legacyId: 3 },
      { ...basePinCode, legacyId: 2 },
    ]);
    const repo = new PinCodeRepository(db);

    const results = await repo.findAllDescending();
    expect(results.map((r) => r.legacyId)).toEqual([3, 2, 1]);
  });

  it('findByLegacyId reads by legacyId (== source id), no B-09 column-mismatch on read', async () => {
    const { db } = createFakeDb([basePinCode]);
    const repo = new PinCodeRepository(db);

    const found = await repo.findByLegacyId(1);
    expect(found?.pincode).toBe('110025');

    await expect(repo.findByLegacyId(999)).resolves.toBeNull();
  });

  it('updatePinCode updates only the real columns, leaves legacyId/createdAt untouched', async () => {
    const { db, store } = createFakeDb([basePinCode]);
    const repo = new PinCodeRepository(db);

    await repo.updatePinCode(1, {
      pincode: '110001',
      location: 'New Address',
      status: '0',
      updatedAt: new Date('2026-02-01T00:00:00Z'),
    });

    expect(store[0]?.pincode).toBe('110001');
    expect(store[0]?.location).toBe('New Address');
    expect(store[0]?.status).toBe('0');
    expect(store[0]?.legacyId).toBe(1); // untouched
    expect(store[0]?.createdAt).toEqual(basePinCode.createdAt); // untouched
  });

  it('updatePinCode against a non-existent legacyId is a silent no-op (matches WHERE id=$id UPDATE on zero rows)', async () => {
    const { db, store } = createFakeDb([basePinCode]);
    const repo = new PinCodeRepository(db);

    await expect(repo.updatePinCode(999, { status: '0' })).resolves.toBeUndefined();
    expect(store[0]?.status).toBe('1'); // unchanged
  });

  it('deletePinCode removes the matching document by legacyId', async () => {
    const { db, store } = createFakeDb([
      { ...basePinCode, legacyId: 1 },
      { ...basePinCode, legacyId: 2 },
    ]);
    const repo = new PinCodeRepository(db);

    await repo.deletePinCode(1);

    expect(store).toHaveLength(1);
    expect(store[0]?.legacyId).toBe(2);
  });

  it('deletePinCode against a non-existent legacyId is a silent no-op (matches WHERE id=$id DELETE on zero rows)', async () => {
    const { db, store } = createFakeDb([basePinCode]);
    const repo = new PinCodeRepository(db);

    await expect(repo.deletePinCode(999)).resolves.toBeUndefined();
    expect(store).toHaveLength(1);
  });

  it('nextLegacyIdGeneric (inherited) returns MAX(legacyId)+1, matching every other new-document strategy in this project', async () => {
    const { db } = createFakeDb([
      { ...basePinCode, legacyId: 5 },
      { ...basePinCode, legacyId: 12 },
    ]);
    const repo = new PinCodeRepository(db);

    await expect(repo.nextLegacyIdGeneric()).resolves.toBe(13);
  });

  it('nextLegacyIdGeneric returns 1 against an empty collection', async () => {
    const { db } = createFakeDb([]);
    const repo = new PinCodeRepository(db);

    await expect(repo.nextLegacyIdGeneric()).resolves.toBe(1);
  });
});
