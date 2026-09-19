/**
 * `adminAppointmentService` tests — CR-006 Phase 3. Same fixture pattern
 * as the other new Phase 3 service test files.
 */

import { describe, it, expect } from 'vitest';
import { getAdminAppointmentsView } from '@/lib/services/adminAppointmentService';
import type { Db, Collection, Document, Filter } from 'mongodb';

function createSeededFakeDb(seed: Record<string, Document[]>): Db {
  const stores: Record<string, Document[]> = { ...seed };
  return {
    collection: (name: string) => {
      const data = (stores[name] ??= []);
      return {
        find: (filter: Filter<Document> = {}) => ({
          toArray: async () => data.filter((d) => matchesFilter(d, filter)),
        }),
      } as unknown as Collection<Document>;
    },
  } as unknown as Db;
}

function matchesFilter(doc: Document, filter: Filter<Document>): boolean {
  return Object.entries(filter).every(([key, value]) => doc[key] === value);
}

const baseAppointment = {
  name: 'Test Patient',
  age: 30,
  gender: 'M',
  phone: '9000000000',
  appointmentDate: '2026-02-01',
  consultantHour: '10 AM',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('getAdminAppointmentsView (UNIT + FIXTURE)', () => {
  it('mirrors ManageAppointment: returns ALL appointments, unfiltered', async () => {
    const db = createSeededFakeDb({
      appointments: [
        { ...baseAppointment, legacyId: 1 },
        { ...baseAppointment, legacyId: 2 },
      ],
    });

    const rows = await getAdminAppointmentsView(db);

    expect(rows).toHaveLength(2);
  });

  it('sorts DESC by legacyId, matching orderBy(id, DESC)', async () => {
    const db = createSeededFakeDb({
      appointments: [
        { ...baseAppointment, legacyId: 1 },
        { ...baseAppointment, legacyId: 5 },
        { ...baseAppointment, legacyId: 3 },
      ],
    });

    const rows = await getAdminAppointmentsView(db);

    expect(rows.map((r) => r.legacyId)).toEqual([5, 3, 1]);
  });
});
