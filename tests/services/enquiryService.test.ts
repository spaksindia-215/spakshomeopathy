/**
 * `enquiryService.submitEnquiry` tests — added M4-PREP
 * (docs/M4-PREPARATION.md). First test file in a new `tests/services/`
 * directory, mirroring `HomeController@saveEnq`.
 *
 * LABEL: UNIT + FIXTURE. Required-field checks are pure logic (UNIT); the
 * insert round-trip goes through a minimal in-memory fake `Db` (FIXTURE),
 * matching the same fake-Db pattern used throughout tests/mongodb/. NOT a
 * real MongoDB connection — never describe this file's assertions as
 * "MongoDB integration."
 *
 * THE SINGLE HIGHEST-VALUE ASSERTION HERE: `mobile` is always persisted as
 * `null`, regardless of what the caller passes (there is no `mobile`/
 * `phone` field on `SubmitEnquiryInput` at all — P-01, HomeController.php's
 * `saveEnq` never reads `$req->phone` either). This is a regression test
 * protecting a named Preserved Defect, not an incidental check.
 */

import { describe, it, expect } from 'vitest';
import { submitEnquiry } from '@/lib/services/enquiryService';
import type { Db, Collection, Document, OptionalUnlessRequiredId } from 'mongodb';

function createFakeDb() {
  const store: Document[] = [];
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
      }) as unknown as Collection<Document>,
  } as unknown as Db;
  return { db, store };
}

describe('submitEnquiry (UNIT + FIXTURE — fake Db, no real MongoDB connection)', () => {
  it('persists mobile as null unconditionally (P-01 — source never reads phone from the request)', async () => {
    const { db, store } = createFakeDb();

    await submitEnquiry(db, {
      legacyId: 1,
      name: 'Test User',
      email: 'test@example.invalid',
      subject: 'Test subject',
      message: 'Test message',
    });

    expect(store).toHaveLength(1);
    expect(store[0]?.mobile).toBeNull();
  });

  it('matches HomeController@saveEnq: name/email/subject are required', async () => {
    const { db } = createFakeDb();

    await expect(
      submitEnquiry(db, { legacyId: 1, name: '', email: 'a@b.invalid', subject: 'x' })
    ).rejects.toThrow(/name.*required/i);

    await expect(
      submitEnquiry(db, { legacyId: 1, name: 'A', email: '', subject: 'x' })
    ).rejects.toThrow(/email.*required/i);

    await expect(
      submitEnquiry(db, { legacyId: 1, name: 'A', email: 'a@b.invalid', subject: '' })
    ).rejects.toThrow(/subject.*required/i);
  });

  it('matches HomeController@saveEnq: message carries no required rule — an absent message is accepted', async () => {
    const { db, store } = createFakeDb();

    await submitEnquiry(db, {
      legacyId: 1,
      name: 'Test User',
      email: 'test@example.invalid',
      subject: 'Test subject',
      // message intentionally omitted
    });

    expect(store[0]?.message).toBeNull();
  });

  it('sets legacyId from the caller-supplied value verbatim (open dependency — see file header)', async () => {
    const { db, store } = createFakeDb();

    await submitEnquiry(db, {
      legacyId: 42,
      name: 'Test User',
      email: 'test@example.invalid',
      subject: 'Test subject',
    });

    expect(store[0]?.legacyId).toBe(42);
  });
});
