/**
 * `AppointmentRepository` tests — added M4-PREP (docs/M4-PREPARATION.md).
 * Extended M5-A with `nextLegacyId()` coverage.
 *
 * LABEL: FIXTURE. Against a minimal in-memory fake `Db`/`Collection`, NOT
 * a real MongoDB connection — same pattern and scope-limiting rationale as
 * enquiryRepository.test.ts / readBack.test.ts.
 */

import { describe, it, expect } from 'vitest';
import { AppointmentRepository } from '@/lib/mongodb/repositories/appointmentRepository';
import type { Appointment } from '@/lib/mongodb/schemas';
import type { Db, Collection, Document, Filter, OptionalUnlessRequiredId } from 'mongodb';

function createFakeDb(seedAppointments: Appointment[] = []) {
  const store: Document[] = [...seedAppointments] as unknown as Document[];
  // CR-006 Phase 9: `auditLog` writes route to their own isolated
  // bucket, not `store` — same fix as `tests/mongodb/fakeDb.ts`.
  const auditLogStore: Document[] = [];
  const db = {
    collection: (name: string) =>
      ({
        insertOne: async (doc: OptionalUnlessRequiredId<Document>) => {
          (name === 'auditLog' ? auditLogStore : store).push(doc as unknown as Document);
          return { acknowledged: true, insertedId: null };
        },
        findOne: async (filter: Filter<Document>) => {
          return store.find((d) => Object.entries(filter).every(([k, v]) => d[k] === v)) ?? null;
        },
        find: () => ({
          sort: () => ({
            limit: () => ({
              toArray: async () => {
                const sorted = [...store].sort(
                  (a, b) => (b.legacyId as number) - (a.legacyId as number)
                );
                return sorted.slice(0, 1);
              },
            }),
          }),
        }),
      }) as unknown as Collection<Document>,
  } as unknown as Db;
  return { db, store };
}

const sampleAppointment: Appointment = {
  legacyId: 1,
  name: 'Test Patient',
  age: 30,
  gender: 'M',
  phone: '9000000000',
  appointmentDate: '2026-02-01',
  consultantHour: '10 AM',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('AppointmentRepository (FIXTURE — fake Db, no real MongoDB connection)', () => {
  it('insertOne validates and stores a well-formed Appointment, findOne reads it back', async () => {
    const { db } = createFakeDb();
    const repo = new AppointmentRepository(db);

    const inserted = await repo.insertOne(sampleAppointment);
    expect(inserted.legacyId).toBe(1);

    const found = await repo.findOne({ legacyId: 1 });
    expect(found?.name).toBe('Test Patient');
    expect(found?.age).toBe(30);
  });

  it('findOne throws when a stored document fails schema validation (e.g. age as a string)', async () => {
    const { db, store } = createFakeDb();
    const repo = new AppointmentRepository(db);
    store.push({ ...sampleAppointment, age: 'thirty' });

    await expect(repo.findOne({ legacyId: 1 })).rejects.toThrow();
  });

  it('nextLegacyId returns 1 against an empty collection', async () => {
    const { db } = createFakeDb([]);
    const repo = new AppointmentRepository(db);

    await expect(repo.nextLegacyId()).resolves.toBe(1);
  });

  it('nextLegacyId returns MAX(legacyId) + 1, same strategy as UserRepository', async () => {
    const { db } = createFakeDb([
      { ...sampleAppointment, legacyId: 8 },
      { ...sampleAppointment, legacyId: 33 },
      { ...sampleAppointment, legacyId: 2 },
    ]);
    const repo = new AppointmentRepository(db);

    await expect(repo.nextLegacyId()).resolves.toBe(34);
  });
});
