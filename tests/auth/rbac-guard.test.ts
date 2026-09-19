/**
 * `@/lib/auth/rbac-guard` tests — CR-006 Phase 2, role resolution
 * extended Phase 9. Mirrors `tests/auth/guard.test.ts`'s mocking pattern
 * for `next/navigation`'s `redirect()` (thrown-signal spy), since
 * `requirePermission()` calls it the same way `requireAdminSession()`
 * does.
 *
 * `resolveRole`/`requirePermission`/`can` now take a `User | null`
 * second argument (Phase 9) — these tests cover both the pre-Phase-9
 * shape (no `role` field, falls back to `SUPER_ADMIN`) and the new
 * explicit-role lookup.
 */

import { describe, it, expect, vi } from 'vitest';
import { resolveRole, requirePermission, can } from '@/lib/auth/rbac-guard';
import { PERMISSIONS, ROLES } from '@/lib/auth/permissions';
import type { SessionPayload } from '@/lib/auth/session';
import { validUser } from '../mongodb/fixtures';

class RedirectSignal extends Error {
  constructor(public readonly destination: string) {
    super(`REDIRECT:${destination}`);
  }
}

vi.mock('next/navigation', () => ({
  redirect: (destination: string) => {
    throw new RedirectSignal(destination);
  },
}));

const adminSession: SessionPayload = {
  userId: 1,
  utype: 1,
  email: 'admin@example.invalid',
  issuedAt: Date.now(),
};

const buyerSession: SessionPayload = {
  userId: 2,
  utype: 3,
  email: 'buyer@example.invalid',
  issuedAt: Date.now(),
};

describe('resolveRole', () => {
  it('resolves an admin (utype=1) session with no role field (pre-Phase-9 account) to SUPER_ADMIN', () => {
    expect(resolveRole(adminSession, null)).toBe(ROLES.SUPER_ADMIN);
    expect(resolveRole(adminSession, { ...validUser, role: undefined })).toBe(ROLES.SUPER_ADMIN);
  });

  it('resolves an admin session with an explicit role (Phase 9 admin-user creation) to that role', () => {
    expect(resolveRole(adminSession, { ...validUser, role: 'CATALOG_MANAGER' })).toBe(
      ROLES.CATALOG_MANAGER
    );
    expect(resolveRole(adminSession, { ...validUser, role: 'CONTENT_MANAGER' })).toBe(
      ROLES.CONTENT_MANAGER
    );
  });

  it('resolves a non-admin session to null regardless of user (defensive — should not occur post requireAdminSession)', () => {
    expect(resolveRole(buyerSession, null)).toBeNull();
    expect(resolveRole(buyerSession, { ...validUser, role: 'SUPER_ADMIN' })).toBeNull();
  });
});

describe('can', () => {
  it('returns true for any permission on an admin session with no role field (implicit Super Admin)', () => {
    expect(can(adminSession, null, PERMISSIONS.PRODUCTS_EDIT)).toBe(true);
    expect(can(adminSession, null, PERMISSIONS.SETTINGS_UPDATE)).toBe(true);
    expect(can(adminSession, null, PERMISSIONS.AUDIT_LOG_VIEW)).toBe(true);
  });

  it('returns false for a non-admin session', () => {
    expect(can(buyerSession, null, PERMISSIONS.PRODUCTS_EDIT)).toBe(false);
  });

  it('respects a narrower explicit role — CATALOG_MANAGER cannot view the audit log', () => {
    const catalogManager = { ...validUser, role: 'CATALOG_MANAGER' as const };
    expect(can(adminSession, catalogManager, PERMISSIONS.PRODUCTS_EDIT)).toBe(true);
    expect(can(adminSession, catalogManager, PERMISSIONS.AUDIT_LOG_VIEW)).toBe(false);
  });
});

describe('requirePermission (mocked next/navigation)', () => {
  it('does not redirect for an admin session with no role field requesting any permission', () => {
    expect(() =>
      requirePermission(adminSession, null, PERMISSIONS.ORDERS_UPDATE)
    ).not.toThrow();
  });

  it('redirects to /admin/login for a non-admin session', () => {
    expect(() => requirePermission(buyerSession, null, PERMISSIONS.PRODUCTS_VIEW)).toThrowError(
      expect.objectContaining({ destination: '/admin/login' })
    );
  });

  it('redirects to /admin/login when an explicit role lacks the requested permission', () => {
    const orderManager = { ...validUser, role: 'ORDER_MANAGER' as const };
    expect(() =>
      requirePermission(adminSession, orderManager, PERMISSIONS.AUDIT_LOG_VIEW)
    ).toThrowError(expect.objectContaining({ destination: '/admin/login' }));
  });

  it('does not redirect when an explicit role carries the requested permission', () => {
    const orderManager = { ...validUser, role: 'ORDER_MANAGER' as const };
    expect(() =>
      requirePermission(adminSession, orderManager, PERMISSIONS.ORDERS_UPDATE)
    ).not.toThrow();
  });
});
