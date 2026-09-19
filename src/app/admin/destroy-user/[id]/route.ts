/**
 * `GET /admin/destroy-user/{id}` — mirrors `AdminController@DestroyUser`
 * (AdminController.php:1232-1270) for the `utype===3` (buyer) branch —
 * see `UserRepository.deleteByLegacyId`'s own header for why the
 * `utype===2` (seller) file-cleanup branch is not reproduced.
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
    await repo.deleteByLegacyId(legacyId);
  }

  await setFlash('message', 'Record deleted successfully.');
  return redirectTo('/admin/manage-buyers', 303);
}
