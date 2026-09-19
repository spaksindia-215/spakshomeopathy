/**
 * `UserRepository.findByPasswordResetTokenHash`/`.resetPasswordByLegacyId`
 * tests — admin "forgot password" flow.
 *
 * LABEL: FIXTURE. Against `createFakeCrudDb` (`tests/mongodb/fakeDb.ts`),
 * NOT a real MongoDB connection.
 */

import { describe, it, expect } from 'vitest';
import { UserRepository } from '@/lib/mongodb/repositories/userRepository';
import { validUser } from './fixtures';
import { createFakeCrudDb } from './fakeDb';
import type { User } from '@/lib/mongodb/schemas';

const createFakeDb = createFakeCrudDb<User>;

const adminWithPendingReset: User = {
  ...validUser,
  legacyId: 1,
  utype: 1,
  passwordResetTokenHash: 'abc123hash',
  passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
};

describe('UserRepository.findByPasswordResetTokenHash (FIXTURE — fake Db)', () => {
  it('finds the user holding a matching token hash', async () => {
    const { db } = createFakeDb([adminWithPendingReset]);
    const repo = new UserRepository(db);

    const found = await repo.findByPasswordResetTokenHash('abc123hash');

    expect(found?.legacyId).toBe(1);
  });

  it('returns null when no user holds that hash', async () => {
    const { db } = createFakeDb([adminWithPendingReset]);
    const repo = new UserRepository(db);

    await expect(repo.findByPasswordResetTokenHash('no-such-hash')).resolves.toBeNull();
  });
});

describe('UserRepository.resetPasswordByLegacyId (FIXTURE — fake Db)', () => {
  it('sets the new password and clears the reset token in one write', async () => {
    const { db, store } = createFakeDb([adminWithPendingReset]);
    const repo = new UserRepository(db);

    await repo.resetPasswordByLegacyId(1, 'new-bcrypt-hash');

    const updated = store[0] as unknown as User;
    expect(updated.password).toBe('new-bcrypt-hash');
    expect(updated.passwordResetTokenHash).toBeNull();
    expect(updated.passwordResetExpiresAt).toBeNull();
  });

  it('the cleared token can no longer be found (single-use)', async () => {
    const { db } = createFakeDb([adminWithPendingReset]);
    const repo = new UserRepository(db);

    await repo.resetPasswordByLegacyId(1, 'new-bcrypt-hash');

    await expect(repo.findByPasswordResetTokenHash('abc123hash')).resolves.toBeNull();
  });
});
