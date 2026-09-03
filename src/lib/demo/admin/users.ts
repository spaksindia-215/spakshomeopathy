/**
 * Admin Users demo-data accessors — backs `/admin/users-list`
 * (`AdminController@UsersList`).
 *
 * NAMING INVERSION, VERIFIED THIS SESSION — read before using this file:
 * the real Laravel controller filters `utype=2` (sellers), NOT buyers.
 * `schemas/user.ts`'s own header already documents `utype=2` as
 * "VESTIGIAL — can never log in." The sidebar's own "Manage Users" link
 * goes to a DIFFERENT route (`manage-buyers`, `utype=3`), deferred to
 * Phase 2. This file mirrors the REAL `users-list` controller exactly,
 * not the sidebar's more intuitive label.
 *
 * VERIFIED FINDING: `utype=2` has ZERO real rows in production (checked
 * by extracting the full real dump: 1 admin, 818 buyers, 0 sellers) — so
 * `DEMO_ADMIN_USERS` is genuinely empty. `/admin/users-list` renders
 * honestly empty, matching this real data, not padded with invented
 * seller accounts. Confirmed with the owner (2026-08-21) to keep this
 * behavior as-is rather than switching the module to `manage-buyers`.
 */

import { DEMO_ADMIN_USERS } from './users.generated';
import type { User } from '../../mongodb/schemas';

export function getAllAdminUsers(): User[] {
  return DEMO_ADMIN_USERS;
}

/** The single demo "logged-in admin" record, used by `/admin/user-profile`
 * and `/admin/change-password`. Falls back to a minimal literal object if
 * no real utype=1 admin row is curated (there is exactly one real admin
 * row in production, per the dump — this accessor prefers it if present). */
export function getDemoAdminUser(): User {
  const realAdmin = DEMO_ADMIN_USERS.find((u) => u.utype === 1);
  if (realAdmin) return realAdmin;
  // No real admin row is included in this curated slice (utype=2 filter
  // excludes it) — a small, clearly-labeled fallback so Profile/Change
  // Password pages have something to render. Not real production data.
  return {
    legacyId: 0,
    name: 'Demo Admin',
    email: 'demo-admin@example.invalid',
    mobile: null,
    emailVerifiedAt: null,
    password: '',
    image: null,
    utype: 1,
    status: 1,
    rememberToken: null,
    createdAt: new Date('2020-01-01T00:00:00Z'),
    updatedAt: new Date('2020-01-01T00:00:00Z'),
  };
}
