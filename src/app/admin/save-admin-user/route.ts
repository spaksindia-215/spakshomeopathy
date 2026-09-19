/**
 * `POST /admin/save-admin-user` — CR-006 Phase 9. GENUINELY NEW: no
 * Laravel route/controller method to mirror — there is no "create an
 * admin" flow anywhere in source (the one real admin account predates
 * this application entirely). Follows this codebase's own established
 * convention for new admin-form POST handlers (CSRF check,
 * `requireAdminSession`/`requirePermissionForSession`, `setFlash`,
 * redirect) — same pattern `save-homeopathy/route.ts` uses.
 *
 * Reuses `UserRepository.nextLegacyId()` (the exact same
 * next-auto-increment-value strategy `registerBuyer` already uses for
 * new buyer accounts — no new id strategy invented) and the existing
 * `hashPassword` utility — no new hashing logic.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS, ROLES } from '@/lib/auth/permissions';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { setFlash } from '@/lib/auth/flash';
import { UserRepository } from '@/lib/mongodb/repositories/userRepository';
import { hashPassword } from '@/lib/auth/password';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return redirectTo('/admin/add-admin-user', 303);
  }

  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.USERS_MANAGE);

  const name = String(formData.get('name') ?? '');
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const roleInput = String(formData.get('role') ?? '');
  const role = (Object.values(ROLES) as string[]).includes(roleInput) ? roleInput : ROLES.ADMIN;

  const repo = new UserRepository(db);

  if (await repo.emailExists(email)) {
    await setFlash('message', 'An account with that email already exists.');
    return redirectTo('/admin/add-admin-user', 303);
  }

  const legacyId = await repo.nextLegacyId();
  const hashedPassword = await hashPassword(password);
  const now = new Date();

  await repo.insertOne({
    legacyId,
    name,
    email,
    mobile: null,
    emailVerifiedAt: null,
    password: hashedPassword,
    image: null,
    utype: 1,
    status: 1,
    rememberToken: null,
    createdAt: now,
    updatedAt: now,
    role: role as (typeof ROLES)[keyof typeof ROLES],
  });

  await setFlash('message', 'Admin user created successfully.');
  return redirectTo('/admin/admin-users-list', 303);
}
