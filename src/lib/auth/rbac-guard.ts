/**
 * RBAC route/action guard — CR-006 Phase 2, role resolution completed
 * Phase 9.
 *
 * Composes with, and never replaces, the existing `requireAdminSession()`
 * (`guard.ts`) — that function remains the sole authentication check
 * (mirroring Laravel's `UserAuth` middleware 1:1) and is unchanged by this
 * file. This module adds a second, independent layer: given an already
 * -authenticated admin session, does this admin's role carry a specific
 * permission?
 *
 * ROLE RESOLUTION — REAL AS OF PHASE 9
 * ---------------------------------------------------
 * Phase 2 shipped `resolveRole()` returning `SUPER_ADMIN` unconditionally
 * for every admin session, because no `role` field or admin-user-creation
 * flow existed yet — a deliberate placeholder, named as such in that
 * phase's own header, with an explicit promise: "When Phase 9 introduces
 * a real roles collection, this is the single function that changes." It
 * now looks up the actual `role` field on the admin's `users` document
 * (`schemas/user.ts` §2.2 of `docs/CR-006-PHASE-9-PLAN.md`), falling back
 * to `SUPER_ADMIN` only when that field is absent — which is true for
 * every admin account that existed before this phase (the one real
 * migrated admin), so that account's access is unchanged.
 *
 * SIGNATURE CHANGE, MECHANICALLY APPLIED ACROSS EVERY EXISTING CALL SITE:
 * `requirePermission`/`can` now take the `User` document (not just the
 * session) — a role lookup genuinely needs it. Every one of Phases 3-8's
 * `requirePermission()` call sites was updated to fetch the user
 * (`UserRepository.findByLegacyId(session.userId)`) and pass it in — a
 * mechanical addition, no business logic in any of those files changed.
 */

import { redirect } from 'next/navigation';
import type { Db } from 'mongodb';
import type { SessionPayload } from './session';
import { hasPermission, ROLES, type Permission, type Role } from './permissions';
import type { User } from '../mongodb/schemas';
import { UserRepository } from '../mongodb/repositories/userRepository';

const ADMIN_UTYPE = 1;

/**
 * Resolves an authenticated session's RBAC role by looking up its
 * stored `role` field on the `users` document. `user` may be `null`
 * (e.g. a lookup failure) — treated the same as a pre-Phase-9 admin
 * account with no `role` field: falls back to `SUPER_ADMIN` rather than
 * a silent lockout, matching this codebase's own established
 * "fail toward the permissive default that already describes today's
 * one real admin" posture (same reasoning `schemas/user.ts`'s `role`
 * field comment uses). `null` only when the session itself isn't an
 * admin session at all (defensive; callers are expected to have already
 * passed the session through `requireAdminSession()`).
 */
export function resolveRole(session: SessionPayload, user: User | null): Role | null {
  if (session.utype !== ADMIN_UTYPE) return null;
  if (user?.role) return user.role as Role;
  return ROLES.SUPER_ADMIN;
}

/**
 * Server-side permission check. Call AFTER `requireAdminSession()` has
 * already confirmed the request is an authenticated admin — this function
 * does not itself verify the session, only its role's permission grant.
 *
 * Redirects (never returns) to `/admin/login` if the session's role
 * cannot be resolved (defensive fallback — should not occur for a session
 * that already passed `requireAdminSession()`) or does not carry
 * `permission`. Enforcement is server-side only, per contract §36 and the
 * original request's own instruction not to rely on hiding UI elements
 * alone.
 */
export function requirePermission(
  session: SessionPayload,
  user: User | null,
  permission: Permission
): void {
  const role = resolveRole(session, user);
  if (!role || !hasPermission(role, permission)) {
    redirect('/admin/login');
  }
}

/** Non-redirecting variant, for conditionally rendering UI (not a substitute for the server-side check above on the action itself). */
export function can(session: SessionPayload, user: User | null, permission: Permission): boolean {
  const role = resolveRole(session, user);
  return role !== null && hasPermission(role, permission);
}

/**
 * Convenience wrapper, added Phase 9 alongside the `requirePermission()`
 * signature change: fetches the session's own `users` document and
 * checks `permission` in one call, so every existing call site's
 * mechanical update is a single line
 * (`await requirePermissionForSession(db, session, PERMISSIONS.X)`)
 * instead of three (fetch `UserRepository`, `findByLegacyId`, then call
 * `requirePermission`). Equivalent to calling those steps individually —
 * not a new authorization pathway.
 */
export async function requirePermissionForSession(
  db: Db,
  session: SessionPayload,
  permission: Permission
): Promise<void> {
  const userRepo = new UserRepository(db);
  const user = await userRepo.findByLegacyId(session.userId);
  requirePermission(session, user, permission);
}
