/**
 * `GET /admin/update-user-status/{id}` — mirrors
 * `AdminController@UpdateUserStatus` (AdminController.php:970-982): reads
 * the current `status`, flips 0↔1, writes it back.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { setFlash } from '@/lib/auth/flash';
import { UserRepository } from '@/lib/mongodb/repositories/userRepository';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  await requireAdminSession();

  const { id } = await params;
  const legacyId = Number(id);

  if (Number.isFinite(legacyId)) {
    const db = await getDb();
    const repo = new UserRepository(db);
    await repo.toggleStatusByLegacyId(legacyId);
  }

  await setFlash('message', 'User status changed successfully.');
  return redirectTo(`/admin/view-buyer/${id}`, 303);
}
