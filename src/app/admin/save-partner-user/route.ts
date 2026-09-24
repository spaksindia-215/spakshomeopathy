/**
 * `POST /admin/save-partner-user` — Partner Panel feature. GENUINELY NEW,
 * no Laravel route to mirror. Same shape as `save-admin-user/route.ts`
 * (CSRF check, `requireAdminSession`/`requirePermissionForSession`,
 * `nextLegacyId()`, `hashPassword`, `setFlash`, redirect), creating a
 * `utype=5` (partner) account instead of `utype=1` (admin). No `role`
 * field is set — `role` is meaningful only for admin (`utype=1`) accounts,
 * per `userSchema.ts`'s own contract; partners are gated purely by `utype`
 * via `requirePartnerSession()`.
 *
 * Partner accounts are admin-provisioned, not self-registered — consistent
 * with the requirement that a partner must not be able to arbitrarily
 * create accounts or escalate privileges.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { setFlash } from '@/lib/auth/flash';
import { UserRepository } from '@/lib/mongodb/repositories/userRepository';
import { hashPassword } from '@/lib/auth/password';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return redirectTo('/admin/add-partner-user', 303);
  }

  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.PARTNERS_MANAGE);

  const name = String(formData.get('name') ?? '');
  const email = String(formData.get('email') ?? '');
  const mobile = String(formData.get('mobile') ?? '').trim() || null;
  const password = String(formData.get('password') ?? '');

  if (!name.trim() || !email.trim() || !password.trim()) {
    await setFlash('message', 'Name, email, and password are required.');
    return redirectTo('/admin/add-partner-user', 303);
  }

  const repo = new UserRepository(db);

  if (await repo.emailExists(email)) {
    await setFlash('message', 'An account with that email already exists.');
    return redirectTo('/admin/add-partner-user', 303);
  }

  const legacyId = await repo.nextLegacyId();
  const hashedPassword = await hashPassword(password);
  const now = new Date();

  await repo.insertOne({
    legacyId,
    name,
    email,
    mobile,
    emailVerifiedAt: null,
    password: hashedPassword,
    image: null,
    utype: 5,
    status: 1,
    rememberToken: null,
    createdAt: now,
    updatedAt: now,
  });

  await setFlash('message', 'Partner account created successfully.');
  return redirectTo('/admin/partner-list', 303);
}
