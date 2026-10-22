/**
 * `POST /admin/update-product` — Updates an existing product in the `products`
 * MongoDB collection.
 *
 * Reads form data matching `admin/(shell)/edit-product/[id]/page.tsx`:
 * `p_id`, `p_heading`, `p_image`, `old_image`, `p_name`, `p_mrp`, `p_price`,
 * `p_desc1`, per-slot `p_imageN`/`old_imageN`/`p_nameN`/`p_mrpN`/`p_priceN`/`p_descN`
 * for N=2..10, `p_cat`, `p_desc`, `video_link`, `p_quantity`, `p_rating`, `p_status`.
 *
 * Gated by `requireAdminSession()` and `PERMISSIONS.PRODUCTS_EDIT`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { setFlash } from '@/lib/auth/flash';
import { ProductRepository } from '@/lib/mongodb/repositories/productRepository';
import { saveAdminUpload, UploadRejectedError } from '@/lib/uploads/adminUpload';
import type { VariantSlot } from '@/lib/mongodb/schemas';

function str(formData: FormData, field: string): string | null {
  const value = formData.get(field);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function num(formData: FormData, field: string): number | null {
  const value = str(formData, field);
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function readUpdatedSlot(
  formData: FormData,
  n: number,
  existingSlot?: VariantSlot | null
): Promise<VariantSlot | { errorResponse: NextResponse }> {
  let pImage: string | null = str(formData, `old_image${n}`) ?? existingSlot?.pImage ?? null;
  const file = formData.get(`p_image${n}`);
  if (file instanceof File && file.size > 0) {
    try {
      pImage = await saveAdminUpload(file, 'products');
    } catch (error) {
      if (error instanceof UploadRejectedError) {
        await setFlash('message', error.message);
        const pId = str(formData, 'p_id') ?? '';
        return { errorResponse: redirectTo(`/admin/edit-product/${pId}`, 303) };
      }
      console.error(`[admin/update-product] upload slot${n} failed:`, error);
      throw error;
    }
  }

  return {
    pImage,
    pName: str(formData, `p_name${n}`) ?? existingSlot?.pName ?? null,
    pMrp: num(formData, `p_mrp${n}`) ?? existingSlot?.pMrp ?? null,
    pPrice: num(formData, `p_price${n}`) ?? existingSlot?.pPrice ?? null,
    pDesc: str(formData, `p_desc${n}`) ?? existingSlot?.pDesc ?? null,
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let legacyId: number | null = null;
  let redirectEditPath = '/admin/product-list';

  try {
    const formData = await request.formData();

    legacyId = num(formData, 'p_id');

    if (!Number.isFinite(legacyId) || !legacyId) {
      await setFlash('message', 'Invalid product ID.');
      return redirectTo('/admin/product-list', 303);
    }

    redirectEditPath = `/admin/edit-product/${legacyId}`;

    const token = formData.get('_token') as string | null;
    if (!verifyCsrfToken(token)) {
      console.warn('[admin/update-product] CSRF verification failed for product', legacyId);
      await setFlash('message', 'Session or security token expired. Please refresh the page and try again.');
      return redirectTo(redirectEditPath, 303);
    }

    const session = await requireAdminSession();
    const db = await getDb();
    await requirePermissionForSession(db, session, PERMISSIONS.PRODUCTS_EDIT);

    const repo = new ProductRepository(db);
    const existing = await repo.findByLegacyId(legacyId);
    if (!existing) {
      await setFlash('message', 'Product not found.');
      return redirectTo('/admin/product-list', 303);
    }

    const pHeading = str(formData, 'p_heading') ?? existing.pHeading;
    if (!pHeading) {
      await setFlash('message', 'Product Heading is required.');
      return redirectTo(redirectEditPath, 303);
    }

    let pBestimg: string | null = str(formData, 'old_image') ?? existing.pBestimg;
    const imageFile = formData.get('p_image');
    if (imageFile instanceof File && imageFile.size > 0) {
      try {
        pBestimg = await saveAdminUpload(imageFile, 'products');
      } catch (error) {
        if (error instanceof UploadRejectedError) {
          await setFlash('message', error.message);
          return redirectTo(redirectEditPath, 303);
        }
        console.error('[admin/update-product] main image upload failed:', error);
        throw error;
      }
    }

    const updatedSlots: VariantSlot[] = [];
    const slotKeys = [
      'slot2',
      'slot3',
      'slot4',
      'slot5',
      'slot6',
      'slot7',
      'slot8',
      'slot9',
      'slot10',
    ] as const;

    let n = 2;
    for (const key of slotKeys) {
      const existingSlot = existing[key];
      const result = await readUpdatedSlot(formData, n, existingSlot);
      if ('errorResponse' in result) {
        return result.errorResponse;
      }
      updatedSlots.push(result);
      n++;
    }

    const pStatus = num(formData, 'p_status') ?? existing.pStatus ?? 1;

    const images = pBestimg
      ? [{ legacyId, pImage: pBestimg }]
      : existing.images ?? [];

    await repo.updateProduct(legacyId, {
      pHeading,
      pName: str(formData, 'p_name') ?? existing.pName,
      pBestimg,
      pMrp: num(formData, 'p_mrp') ?? existing.pMrp,
      pPrice: num(formData, 'p_price') ?? existing.pPrice,
      pQuantity: num(formData, 'p_quantity') ?? existing.pQuantity,
      pRating: num(formData, 'p_rating') ?? existing.pRating,
      pCat: num(formData, 'p_cat') ?? existing.pCat,
      pDesc: str(formData, 'p_desc') ?? existing.pDesc,
      pDesc1: str(formData, 'p_desc1') ?? existing.pDesc1,
      videoLink: str(formData, 'video_link') ?? existing.videoLink,
      pStatus,
      slot2: updatedSlots[0],
      slot3: updatedSlots[1],
      slot4: updatedSlots[2],
      slot5: updatedSlots[3],
      slot6: updatedSlots[4],
      slot7: updatedSlots[5],
      slot8: updatedSlots[6],
      slot9: updatedSlots[7],
      slot10: updatedSlots[8],
      images,
      updatedAt: new Date(),
    });

    try {
      revalidatePath('/admin/product-list');
      revalidatePath(redirectEditPath);
      if (existing.pSlug) {
        revalidatePath(`/product-details/${existing.pSlug}`);
        revalidatePath(`/homeopathy/product/${existing.pSlug}`);
      }
    } catch (revalidateError) {
      console.warn('[admin/update-product] revalidatePath warning:', revalidateError);
    }

    await setFlash('message', 'Product updated successfully.');
    return redirectTo('/admin/product-list', 303);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'digest' in error &&
      typeof (error as { digest: unknown }).digest === 'string' &&
      ((error as { digest: string }).digest.startsWith('NEXT_REDIRECT') ||
        (error as { digest: string }).digest.startsWith('NEXT_NOT_FOUND'))
    ) {
      throw error;
    }
    const errMessage = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[admin/update-product] unhandled error in POST:', error);
    await setFlash('message', `Failed to update product: ${errMessage}`);
    return redirectTo(redirectEditPath, 303);
  }
}
