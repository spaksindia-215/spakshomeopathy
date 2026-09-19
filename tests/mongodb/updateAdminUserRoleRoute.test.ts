/**
 * `src/app/admin/update-admin-user-role/route.ts` tests — CR-006 Phase 10
 * (`docs/CR-006-PHASE-10-PLAN.md` §2.1.3). Covers the newest, least
 * previously-exercised admin write path in the whole CR (Phase 9).
 *
 * Mocks `verifyCsrfToken`, `requireAdminSession`,
 * `requirePermissionForSession`, `setFlash`, `getDb`, and
 * `UserRepository` — this route's dependencies — so no real database or
 * Next.js request context is used or needed.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const verifyCsrfTokenMock = vi.fn();
const requireAdminSessionMock = vi.fn();
const requirePermissionForSessionMock = vi.fn();
const setFlashMock = vi.fn();
const updateRoleByLegacyIdMock = vi.fn();

vi.mock('@/lib/auth/csrf', () => ({
  verifyCsrfToken: (token: string | null) => verifyCsrfTokenMock(token),
}));

vi.mock('@/lib/auth/guard', () => ({
  requireAdminSession: () => requireAdminSessionMock(),
}));

vi.mock('@/lib/auth/rbac-guard', () => ({
  requirePermissionForSession: (...args: unknown[]) => requirePermissionForSessionMock(...args),
}));

vi.mock('@/lib/auth/flash', () => ({
  setFlash: (kind: string, value: string) => setFlashMock(kind, value),
}));

vi.mock('@/lib/mongodb/client', () => ({
  getDb: vi.fn(async () => ({})),
}));

vi.mock('@/lib/mongodb/repositories/userRepository', () => ({
  UserRepository: vi.fn().mockImplementation(() => ({
    updateRoleByLegacyId: updateRoleByLegacyIdMock,
  })),
}));

function formRequest(fields: Record<string, string>): NextRequest {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  const request = new NextRequest('http://localhost:3000/admin/update-admin-user-role', {
    method: 'POST',
  });
  vi.spyOn(request, 'formData').mockResolvedValue(formData);
  return request;
}

describe('POST /admin/update-admin-user-role', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a bad CSRF token before checking auth, redirecting back to the edit page', async () => {
    verifyCsrfTokenMock.mockReturnValue(false);
    const { POST } = await import('@/app/admin/update-admin-user-role/route');

    const request = formRequest({ id: '2', role: 'ADMIN', _token: 'bad' });
    const response = await POST(request);

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('http://localhost:3000/admin/edit-admin-user/2');
    expect(setFlashMock).toHaveBeenCalledWith('message', 'CSRF token mismatch.');
    expect(requireAdminSessionMock).not.toHaveBeenCalled();
    expect(updateRoleByLegacyIdMock).not.toHaveBeenCalled();
  });

  it('updates the role and redirects to admin-users-list on valid input', async () => {
    verifyCsrfTokenMock.mockReturnValue(true);
    requireAdminSessionMock.mockResolvedValue({ userId: 1, utype: 1, email: 'a@b.invalid' });
    const { POST } = await import('@/app/admin/update-admin-user-role/route');

    const request = formRequest({ id: '2', role: 'CATALOG_MANAGER', _token: 'good' });
    const response = await POST(request);

    expect(updateRoleByLegacyIdMock).toHaveBeenCalledWith(2, 'CATALOG_MANAGER');
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('http://localhost:3000/admin/admin-users-list');
    expect(setFlashMock).toHaveBeenCalledWith('message', 'Role updated successfully.');
  });

  it('checks ROLES_MANAGE permission after authenticating', async () => {
    verifyCsrfTokenMock.mockReturnValue(true);
    requireAdminSessionMock.mockResolvedValue({ userId: 1, utype: 1, email: 'a@b.invalid' });
    const { POST } = await import('@/app/admin/update-admin-user-role/route');

    await POST(formRequest({ id: '2', role: 'ADMIN', _token: 'good' }));

    expect(requirePermissionForSessionMock).toHaveBeenCalled();
    const [, , permission] = requirePermissionForSessionMock.mock.calls[0]!;
    expect(permission).toBe('roles.manage');
  });

  it('falls back to ADMIN for an unrecognized role value (never trusts arbitrary client input)', async () => {
    verifyCsrfTokenMock.mockReturnValue(true);
    requireAdminSessionMock.mockResolvedValue({ userId: 1, utype: 1, email: 'a@b.invalid' });
    const { POST } = await import('@/app/admin/update-admin-user-role/route');

    await POST(formRequest({ id: '2', role: 'NOT_A_REAL_ROLE', _token: 'good' }));

    expect(updateRoleByLegacyIdMock).toHaveBeenCalledWith(2, 'ADMIN');
  });

  it('does not call updateRoleByLegacyId and redirects to admin-users-list for a non-numeric id', async () => {
    verifyCsrfTokenMock.mockReturnValue(true);
    requireAdminSessionMock.mockResolvedValue({ userId: 1, utype: 1, email: 'a@b.invalid' });
    const { POST } = await import('@/app/admin/update-admin-user-role/route');

    const response = await POST(formRequest({ id: 'not-a-number', role: 'ADMIN', _token: 'good' }));

    expect(updateRoleByLegacyIdMock).not.toHaveBeenCalled();
    expect(response.headers.get('location')).toBe('http://localhost:3000/admin/admin-users-list');
    expect(setFlashMock).toHaveBeenCalledWith('message', 'Invalid admin user.');
  });
});
