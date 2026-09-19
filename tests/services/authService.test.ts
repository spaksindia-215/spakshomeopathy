/**
 * `authService.login`/`registerBuyer` tests — added M4 (authentication).
 *
 * LABEL: UNIT + FIXTURE. Against a minimal in-memory fake `Db`/`Collection`
 * supporting `findOne`, `insertOne`, and `find().sort().limit().toArray()`
 * (the operations `UserRepository` actually calls), NOT a real MongoDB
 * connection.
 *
 * THE HIGHEST-VALUE ASSERTIONS HERE test the exact utype/backuser branch
 * matrix from `Auth\LoginController@UserLogin` (LoginController.php:44-67)
 * — this is real, easy-to-get-wrong business logic, not incidental
 * plumbing, and is exactly the kind of behavior contract F-12 forbids
 * "improving."
 */

import { describe, it, expect } from 'vitest';
import { login, registerBuyer } from '@/lib/services/authService';
import { hashPassword } from '@/lib/auth/password';
import type { User } from '@/lib/mongodb/schemas';
import type { Db, Collection, Document, Filter, OptionalUnlessRequiredId } from 'mongodb';

function createFakeDb(seedUsers: User[] = []) {
  const store: Document[] = [...seedUsers] as unknown as Document[];
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
        countDocuments: async (filter: Filter<Document>) => {
          return store.filter((d) => Object.entries(filter).every(([k, v]) => d[k] === v)).length;
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

async function seedUser(overrides: Partial<User> = {}): Promise<User> {
  const password = await hashPassword('correct-password');
  return {
    legacyId: 1,
    name: 'Test User',
    email: 'user@example.invalid',
    mobile: '9999999999',
    emailVerifiedAt: null,
    password,
    image: null,
    utype: 3,
    status: 1,
    rememberToken: null,
    createdAt: new Date('2020-01-01T00:00:00Z'),
    updatedAt: new Date('2020-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('login (UNIT + FIXTURE)', () => {
  it('buyer (utype=3) + backuser=seller_buyer + empty cart → myaccount', async () => {
    const user = await seedUser({ utype: 3 });
    const { db } = createFakeDb([user]);

    const result = await login(db, {
      email: user.email,
      password: 'correct-password',
      backuser: 'seller_buyer',
      cartTotal: 0,
    });

    expect('user' in result).toBe(true);
    if ('user' in result) {
      expect(result.redirect).toEqual({ kind: 'myaccount' });
    }
  });

  it('buyer (utype=3) + backuser=seller_buyer + non-empty cart → cart-list', async () => {
    const user = await seedUser({ utype: 3 });
    const { db } = createFakeDb([user]);

    const result = await login(db, {
      email: user.email,
      password: 'correct-password',
      backuser: 'seller_buyer',
      cartTotal: 2,
    });

    expect('user' in result && result.redirect).toEqual({ kind: 'cart-list' });
  });

  it('admin (utype=1) + backuser=admin → admin-home', async () => {
    const user = await seedUser({ utype: 1, legacyId: 2, email: 'admin@example.invalid' });
    const { db } = createFakeDb([user]);

    const result = await login(db, {
      email: user.email,
      password: 'correct-password',
      backuser: 'admin',
      cartTotal: 0,
    });

    expect('user' in result && result.redirect).toEqual({ kind: 'admin-home' });
  });

  it('admin (utype=1) + backuser=seller_buyer (public form) → wrong-credentials, even with correct password (source branch mismatch, not a bug)', async () => {
    const user = await seedUser({ utype: 1, legacyId: 2, email: 'admin@example.invalid' });
    const { db } = createFakeDb([user]);

    const result = await login(db, {
      email: user.email,
      password: 'correct-password',
      backuser: 'seller_buyer', // the ONLY value the public /login form can ever send
      cartTotal: 0,
    });

    expect(result.redirect).toBe('wrong-credentials');
  });

  it('seller (utype=2) + backuser=seller_buyer → seller-myaccount', async () => {
    const user = await seedUser({ utype: 2, legacyId: 3, email: 'seller@example.invalid' });
    const { db } = createFakeDb([user]);

    const result = await login(db, {
      email: user.email,
      password: 'correct-password',
      backuser: 'seller_buyer',
      cartTotal: 0,
    });

    expect('user' in result && result.redirect).toEqual({ kind: 'seller-myaccount' });
  });

  it('wrong password → wrong-credentials', async () => {
    const user = await seedUser();
    const { db } = createFakeDb([user]);

    const result = await login(db, {
      email: user.email,
      password: 'totally-wrong',
      backuser: 'seller_buyer',
      cartTotal: 0,
    });

    expect(result.redirect).toBe('wrong-credentials');
  });

  it('inactive user (status != 1) → wrong-credentials, NOT a distinct "account disabled" message (matches Auth::attempt() folding status into the credential match)', async () => {
    const user = await seedUser({ status: 0 });
    const { db } = createFakeDb([user]);

    const result = await login(db, {
      email: user.email,
      password: 'correct-password',
      backuser: 'seller_buyer',
      cartTotal: 0,
    });

    expect(result.redirect).toBe('wrong-credentials');
  });

  it('unknown email → wrong-credentials', async () => {
    const { db } = createFakeDb([]);
    const result = await login(db, {
      email: 'nobody@example.invalid',
      password: 'anything',
      backuser: 'seller_buyer',
      cartTotal: 0,
    });
    expect(result.redirect).toBe('wrong-credentials');
  });
});

describe('registerBuyer (UNIT + FIXTURE)', () => {
  it('registers a new buyer with status=1 (matches the LIVE routed RegisterController, not the dead top-level duplicate)', async () => {
    const { db, store } = createFakeDb([]);

    const result = await registerBuyer(db, {
      name: 'New Buyer',
      email: 'newbuyer@example.invalid',
      mobile: '8888888888',
      password: 'a-real-password',
    });

    expect(result.ok).toBe(true);
    expect(store).toHaveLength(1);
    const inserted = store[0] as unknown as User;
    expect(inserted.utype).toBe(3);
    expect(inserted.status).toBe(1);
    expect(inserted.buyerProfile).toBeDefined();
    expect(inserted.password).not.toBe('a-real-password'); // must be hashed, never stored plaintext
  });

  it('assigns legacyId = current max + 1 (new-document legacyId strategy, M4 decision)', async () => {
    const existing = await seedUser({ legacyId: 819 });
    const { db, store } = createFakeDb([existing]);

    await registerBuyer(db, {
      name: 'Next Buyer',
      email: 'next@example.invalid',
      mobile: '7777777777',
      password: 'password',
    });

    const inserted = store.find((d) => d.email === 'next@example.invalid') as unknown as User;
    expect(inserted.legacyId).toBe(820);
  });

  it('rejects a duplicate email (mirrors unique:users)', async () => {
    const existing = await seedUser({ email: 'taken@example.invalid' });
    const { db } = createFakeDb([existing]);

    const result = await registerBuyer(db, {
      name: 'Someone',
      email: 'taken@example.invalid',
      mobile: '1234567890',
      password: 'password',
    });

    expect(result).toEqual({ ok: false, reason: 'email-taken' });
  });

  it('rejects missing required fields (name/email/mobile/password all required, matching Validator rules)', async () => {
    const { db } = createFakeDb([]);
    const result = await registerBuyer(db, {
      name: '',
      email: 'missing-name@example.invalid',
      mobile: '',
      password: 'password',
    });

    expect(result.ok).toBe(false);
    if (!result.ok && result.reason === 'validation') {
      expect(result.fields).toEqual(expect.arrayContaining(['name', 'mobile']));
    }
  });
});
