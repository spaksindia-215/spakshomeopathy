/**
 * `appointmentService.bookAppointment` tests — added M4-PREP
 * (docs/M4-PREPARATION.md). Mirrors `HomeController@SaveAppointment`.
 *
 * LABEL: UNIT + FIXTURE. Against a minimal in-memory fake `Db`, NOT a real
 * MongoDB connection — never describe this file's assertions as "MongoDB
 * integration."
 *
 * THE IMPORTANT TEST HERE IS AN INVERSION OF NORMAL INSTINCT: it proves
 * the ABSENCE of validation, because the real Laravel controller
 * (HomeController.php:829-838) has none — no `$req->validate(...)` call
 * exists in `SaveAppointment` at all. If a future contributor "helpfully"
 * adds a required-field check to `bookAppointment`, THIS test is the one
 * that should fail and catch it — that would be an unauthorized
 * validation-tightening (contract F-12), not a bug fix.
 */

import { describe, it, expect } from 'vitest';
import { bookAppointment } from '@/lib/services/appointmentService';
import type { Db, Collection, Document, OptionalUnlessRequiredId } from 'mongodb';

function createFakeDb() {
  const store: Document[] = [];
  const db = {
    collection: () =>
      ({
        insertOne: async (doc: OptionalUnlessRequiredId<Document>) => {
          store.push(doc as unknown as Document);
          return { acknowledged: true, insertedId: null };
        },
      }) as unknown as Collection<Document>,
  } as unknown as Db;
  return { db, store };
}

describe('bookAppointment (UNIT + FIXTURE — fake Db, no real MongoDB connection)', () => {
  it('accepts an input with every optional field entirely absent — matches SaveAppointment having no validate() call', async () => {
    const { db, store } = createFakeDb();

    // Intentionally minimal — Laravel's SaveAppointment would insert this
    // exact shape (every field null) without complaint. Do NOT expect this
    // to throw; if a future change makes it throw, that is a fidelity
    // regression, not a fix.
    await expect(bookAppointment(db, { legacyId: 1 })).resolves.not.toThrow();

    expect(store).toHaveLength(1);
    expect(store[0]?.name).toBeNull();
    expect(store[0]?.phone).toBeNull();
  });

  it('accepts an empty-string name — Laravel would insert it as-is, no rejection', async () => {
    const { db, store } = createFakeDb();

    await bookAppointment(db, { legacyId: 1, name: '' });

    expect(store[0]?.name).toBe('');
  });

  it('persists every provided field verbatim, with no transformation', async () => {
    const { db, store } = createFakeDb();

    await bookAppointment(db, {
      legacyId: 1,
      name: 'Test Patient',
      age: 30,
      gender: 'M',
      phone: '9000000000',
      appointmentDate: '2026-02-01',
      consultantHour: '10 AM',
    });

    expect(store[0]).toMatchObject({
      name: 'Test Patient',
      age: 30,
      gender: 'M',
      phone: '9000000000',
      appointmentDate: '2026-02-01',
      consultantHour: '10 AM',
    });
  });
});
