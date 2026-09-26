/**
 * `GET /admin/destroy-product/{id}` — mirrors `AdminController@DestroyProduct`
 * (AdminController.php:675-693). See `ProductRepository.deleteByLegacyId`'s
 * own header for the disclosed filesystem-cleanup boundary.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { setFlash } from '@/lib/auth/flash';
import { ProductRepository } from '@/lib/mongodb/repositories/productRepository';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  await requireAdminSession();

  const { id } = await params;
  const legacyId = Number(id);

  if (Number.isFinite(legacyId)) {
    const db = await getDb();
    const repo = new ProductRepository(db);
    try {
      await repo.deleteByLegacyId(legacyId);
    } catch (error) {
      console.error('[admin/destroy-product] delete failed:', error);
      throw error;
    }
  }

  await setFlash('message', 'Product deleted successfully.');
  return redirectTo('/admin/product-list', 303);
}
