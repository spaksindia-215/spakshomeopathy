/**
 * `POST /admin/update-admin-user-role` — CR-006 Phase 9. GENUINELY NEW,
 * see `save-admin-user/route.ts`'s header. Uses `PERMISSIONS.ROLES_MANAGE`
 * (not `USERS_MANAGE`) — assigning a role is the specific action this
 * route performs, matching the permission the edit screen itself is
 * gated by.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS, ROLES, type Role } from '@/lib/auth/permissions';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { setFlash } from '@/lib/auth/flash';
import { UserRepository } from '@/lib/mongodb/repositories/userRepository';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();

  const id = String(formData.get('id') ?? '');

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return redirectTo(`/admin/edit-admin-user/${id}`, 303);
  }

  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.ROLES_MANAGE);

  const legacyId = Number(id);
  const roleInput = String(formData.get('role') ?? '');
  const role: Role = (Object.values(ROLES) as string[]).includes(roleInput)
    ? (roleInput as Role)
    : ROLES.ADMIN;

  if (!Number.isFinite(legacyId)) {
    await setFlash('message', 'Invalid admin user.');
    return redirectTo('/admin/admin-users-list', 303);
  }

  const repo = new UserRepository(db);
  await repo.updateRoleByLegacyId(legacyId, role);

  await setFlash('message', 'Role updated successfully.');
  return redirectTo('/admin/admin-users-list', 303);
}
