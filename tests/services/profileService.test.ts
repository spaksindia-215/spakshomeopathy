/**
 * `profileService.updateProfile`/`updatePassword` tests — added M4 (buyer
 * profile/password-change slice).
 *
 * LABEL: UNIT + FIXTURE. Same fake-`Db`/`Collection` pattern as
 * `tests/services/authService.test.ts`, extended with `updateOne` (the one
 * additional operation `userRepository.ts`'s new methods call).
 *
 * THE HIGHEST-VALUE ASSERTIONS HERE test `updatePassword`'s exact branch
 * ORDER from `BuyerController@UpdatePassword` (BuyerController.php:117-150)
 * — validation, then confirmation-match, then old-password-match, then
 * reject-same-as-old, only then persist — this is real, easy-to-get-wrong
 * business logic (F-12), not incidental plumbing.
 */

import { describe, it, expect } from 'vitest';
import { updateProfile, updatePassword } from '@/lib/services/profileService';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import type { User } from '@/lib/mongodb/schemas';
import type { Db, Collection, Document, Filter } from 'mongodb';

function createFakeDb(seedUsers: User[] = []) {
  const store: Document[] = [...seedUsers] as unknown as Document[];
  const db = {
    collection: () =>
      ({
        findOne: async (filter: Filter<Document>) => {
          return store.find((d) => Object.entries(filter).every(([k, v]) => d[k] === v)) ?? null;
        },
        updateOne: async (filter: Filter<Document>, update: { $set: Record<string, unknown> }) => {
          const doc = store.find((d) => Object.entries(filter).every(([k, v]) => d[k] === v)) as
            | Document
            | undefined;
          if (!doc) return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
          for (const [key, value] of Object.entries(update.$set)) {
            if (key.startsWith('buyerProfile.')) {
              const subKey = key.split('.')[1]!;
              const bp = (doc.buyerProfile as Record<string, unknown> | undefined) ?? {};
              bp[subKey] = value;
              doc.buyerProfile = bp;
            } else {
              doc[key] = value as never;
            }
          }
          return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
        },
      }) as unknown as Collection<Document>,
  } as unknown as Db;
  return { db, store };
}

async function seedUser(overrides: Partial<User> = {}): Promise<User> {
  const password = await hashPassword('correct-password');
  return {
    legacyId: 1,
    name: 'Test Buyer',
    email: 'buyer@example.invalid',
    mobile: '9999999999',
    emailVerifiedAt: null,
    password,
    image: null,
    utype: 3,
    status: 1,
    rememberToken: null,
    createdAt: new Date('2020-01-01T00:00:00Z'),
    updatedAt: new Date('2020-01-01T00:00:00Z'),
    buyerProfile: {
      legacyId: 1,
      pinCode: '110001',
      fullAddress: 'Old Address',
      houseNo: 'Old House',
      landmark: 'Old Landmark',
      state: null,
      country: null,
      deliveryType: null,
    },
    ...overrides,
  };
}

describe('updateProfile (UNIT + FIXTURE)', () => {
  it('writes name/mobile at the top level and profile fields under buyerProfile', async () => {
    const user = await seedUser();
    const { db, store } = createFakeDb([user]);

    await updateProfile(db, 1, {
      name: 'New Name',
      mobile: '8888888888',
      pinCode: '400001',
      fullAddress: 'New Address',
      houseNo: 'New House',
      landmark: 'New Landmark',
    });

    const updated = store[0] as unknown as User;
    expect(updated.name).toBe('New Name');
    expect(updated.mobile).toBe('8888888888');
    expect(updated.buyerProfile?.pinCode).toBe('400001');
    expect(updated.buyerProfile?.fullAddress).toBe('New Address');
    expect(updated.buyerProfile?.houseNo).toBe('New House');
    expect(updated.buyerProfile?.landmark).toBe('New Landmark');
  });

  it('performs no validation — an empty field is written as null, matching source having no $request->validate() call', async () => {
    const user = await seedUser();
    const { db, store } = createFakeDb([user]);

    await updateProfile(db, 1, {
      name: 'Kept Name',
      mobile: '',
      pinCode: '',
      fullAddress: '',
      houseNo: '',
      landmark: '',
    });

    const updated = store[0] as unknown as User;
    expect(updated.mobile).toBeNull();
    expect(updated.buyerProfile?.pinCode).toBeNull();
  });

  it('does not touch password/email/utype/status', async () => {
    const user = await seedUser();
    const { db, store } = createFakeDb([user]);

    await updateProfile(db, 1, {
      name: 'Changed',
      mobile: '7777777777',
      pinCode: '1',
      fullAddress: '1',
      houseNo: '1',
      landmark: '1',
    });

    const updated = store[0] as unknown as User;
    expect(updated.password).toBe(user.password);
    expect(updated.email).toBe(user.email);
    expect(updated.utype).toBe(3);
    expect(updated.status).toBe(1);
  });
});

describe('updatePassword (UNIT + FIXTURE)', () => {
  it('succeeds when old password matches and new password differs, and persists a new bcrypt hash', async () => {
    const user = await seedUser();
    const originalHash = user.password; // captured BEFORE the fake store mutates `user` in place
    const { db, store } = createFakeDb([user]);

    const result = await updatePassword(db, 1, {
      oldPassword: 'correct-password',
      newPassword: 'brand-new-password',
      passwordConfirmation: 'brand-new-password',
    });

    expect(result).toEqual({ ok: true });
    const updated = store[0] as unknown as User;
    expect(updated.password).not.toBe(originalHash);
    expect(await verifyPassword('brand-new-password', updated.password)).toBe(true);
    expect(await verifyPassword('correct-password', updated.password)).toBe(false);
  });

  it('rejects when required fields are missing (mirrors $request->validate)', async () => {
    const user = await seedUser();
    const { db } = createFakeDb([user]);

    const result = await updatePassword(db, 1, {
      oldPassword: '',
      newPassword: 'x',
      passwordConfirmation: 'x',
    });

    expect(result).toEqual({ ok: false, reason: 'validation', fields: ['oldpassword'] });
  });

  it('rejects when new password and confirmation do not match (checked BEFORE old-password check)', async () => {
    const user = await seedUser();
    const { db } = createFakeDb([user]);

    const result = await updatePassword(db, 1, {
      oldPassword: 'totally-wrong-old-password', // would also fail old-password check
      newPassword: 'new-one',
      passwordConfirmation: 'different-one',
    });

    // Source checks `newpassword == password_confirmation` in the OUTER
    // if, before ever calling Hash::check on oldpassword — so the
    // confirmation-mismatch branch fires even though the old password is
    // ALSO wrong, verifying the exact source branch order.
    expect(result).toEqual({ ok: false, reason: 'confirmation-mismatch' });
  });

  it('rejects when the old password is incorrect', async () => {
    const user = await seedUser();
    const { db } = createFakeDb([user]);

    const result = await updatePassword(db, 1, {
      oldPassword: 'wrong-old-password',
      newPassword: 'new-one',
      passwordConfirmation: 'new-one',
    });

    expect(result).toEqual({ ok: false, reason: 'old-password-incorrect' });
  });

  it('rejects when the new password is the same as the old password', async () => {
    const user = await seedUser();
    const { db } = createFakeDb([user]);

    const result = await updatePassword(db, 1, {
      oldPassword: 'correct-password',
      newPassword: 'correct-password',
      passwordConfirmation: 'correct-password',
    });

    expect(result).toEqual({ ok: false, reason: 'new-password-same-as-old' });
  });

  it('does not persist a password change when any failure branch is hit', async () => {
    const user = await seedUser();
    const originalHash = user.password;
    const { db, store } = createFakeDb([user]);

    await updatePassword(db, 1, {
      oldPassword: 'wrong-old-password',
      newPassword: 'new-one',
      passwordConfirmation: 'new-one',
    });

    const unchanged = store[0] as unknown as User;
    expect(unchanged.password).toBe(originalHash);
  });
});
