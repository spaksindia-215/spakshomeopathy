/**
 * `POST /admin/save-product` — GENUINELY NEW. Source's `AdminController@
 * SaveProduct` was never ported: `add-product/page.tsx` has always posted
 * to this exact path, but no route handler existed here until now (the
 * page's own header documents this as still `@/lib/demo`-backed / not yet
 * live-wired). This is that missing handler, built for the Partner Panel
 * feature's product-creation flow and shared by the admin `add-product`
 * page too, since both need the identical write path against the real
 * `products` collection.
 *
 * Field names match `add-product/page.tsx` EXACTLY (`p_heading`, `p_image`,
 * `p_name`, `p_mrp`, `p_price`, `p_desc1`, then per-slot `p_imageN`/
 * `p_nameN`/`p_mrpN`/`p_priceN`/`p_descN` for N=2..10, plus `p_cat`,
 * `p_desc`, `p_quantity`, `p_rating`, `p_status`) — no new field names
 * invented.
 *
 * Shape follows this codebase's established new-admin-form-POST-handler
 * convention (CSRF check, upload via `saveAdminUpload`, `nextLegacyIdGeneric()`
 * for the id) — same pattern `save-homeopathy/route.ts` uses. Auth accepts
 * EITHER an admin session (`products.create` permission) or a partner
 * session, resolved by `requireProductActor()` — see that file for why a
 * partner cannot escalate by posting here directly: `pStatus` and
 * `createdByUserId` are derived from the verified session, never trusted
 * from submitted form fields for a partner caller.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { requireProductActor } from '@/lib/auth/productActorGuard';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { setFlash } from '@/lib/auth/flash';
import { ProductRepository } from '@/lib/mongodb/repositories/productRepository';
import { saveAdminUpload, UploadRejectedError } from '@/lib/uploads/adminUpload';
import type { Product, VariantSlot } from '@/lib/mongodb/schemas';

const EMPTY_SLOT: VariantSlot = {
  pImage: null,
  pName: null,
  pMrp: null,
  pPrice: null,
  pDesc: null,
};

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

async function readSlot(
  formData: FormData,
  n: number,
  uploadFolder: string,
  redirectPath: string
): Promise<VariantSlot | { errorResponse: NextResponse }> {
  let pImage: string | null = null;
  const file = formData.get(`p_image${n}`);
  if (file instanceof File && file.size > 0) {
    try {
      pImage = await saveAdminUpload(file, uploadFolder);
    } catch (error) {
      if (error instanceof UploadRejectedError) {
        await setFlash('message', error.message);
        return { errorResponse: redirectTo(redirectPath, 303) };
      }
      console.error('[admin/save-product] upload failed:', error);
      throw error;
    }
  }

  return {
    pImage,
    pName: str(formData, `p_name${n}`),
    pMrp: num(formData, `p_mrp${n}`),
    pPrice: num(formData, `p_price${n}`),
    pDesc: str(formData, `p_desc${n}`),
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();

  const actor = await requireProductActor(await getDb());
  const redirectPath = actor.kind === 'partner' ? '/partner/add-product' : '/admin/add-product';

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return redirectTo(redirectPath, 303);
  }

  const pHeading = str(formData, 'p_heading');
  if (!pHeading) {
    await setFlash('message', 'Product Heading is required.');
    return redirectTo(redirectPath, 303);
  }

  const db = await getDb();
  const repo = new ProductRepository(db);

  let pBestimg: string | null = null;
  const imageFile = formData.get('p_image');
  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      pBestimg = await saveAdminUpload(imageFile, 'products');
    } catch (error) {
      if (error instanceof UploadRejectedError) {
        await setFlash('message', error.message);
        return redirectTo(redirectPath, 303);
      }
      console.error('[admin/save-product] upload failed:', error);
      throw error;
    }
  }

  const slots: VariantSlot[] = [];
  for (const n of [2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    const result = await readSlot(formData, n, 'products', redirectPath);
    if ('errorResponse' in result) return result.errorResponse;
    slots.push(result);
  }

  const legacyId = await repo.nextLegacyIdGeneric();
  const now = new Date();

  // Partner submissions are server-forced inactive (pStatus=0) regardless
  // of any submitted p_status — admin activates them via the existing
  // toggle-status mechanism. Admin submissions honor the submitted status.
  const pStatus = actor.kind === 'partner' ? 0 : (num(formData, 'p_status') ?? 0);
  const createdByUserId = actor.kind === 'partner' ? actor.session.userId : null;

  const doc: Product = {
    legacyId,
    pCat: num(formData, 'p_cat'),
    pSubcat: null,
    pOcat: null,
    ptype: null,
    pTop: null,
    pTrending: null,
    pFeatured: null,
    uid: null,
    pName: str(formData, 'p_name'),
    pHeading,
    pBestimg,
    pMrp: num(formData, 'p_mrp'),
    pPrice: num(formData, 'p_price'),
    pQuantity: num(formData, 'p_quantity'),
    pRating: num(formData, 'p_rating'),
    pShortDesc: null,
    pDesc: str(formData, 'p_desc'),
    pColor: null,
    pSize: null,
    videoLink: str(formData, 'video_link'),
    reffNo: null,
    hsnCode: null,
    shippingTime: null,
    searchTerms: null,
    pSlug: null,
    pDesc1: str(formData, 'p_desc1'),
    slot2: slots[0] ?? EMPTY_SLOT,
    slot3: slots[1] ?? EMPTY_SLOT,
    slot4: slots[2] ?? EMPTY_SLOT,
    slot5: slots[3] ?? EMPTY_SLOT,
    slot6: slots[4] ?? EMPTY_SLOT,
    slot7: slots[5] ?? EMPTY_SLOT,
    slot8: slots[6] ?? EMPTY_SLOT,
    slot9: slots[7] ?? EMPTY_SLOT,
    slot10: slots[8] ?? EMPTY_SLOT,
    pStatus,
    createdAt: now,
    updatedAt: now,
    images: [],
    reviews: [],
    specifications: [],
    createdByUserId,
  };

  await repo.insertProduct(doc);

  await setFlash(
    'message',
    actor.kind === 'partner'
      ? 'Product submitted successfully. It will appear publicly once an admin activates it.'
      : 'Product saved successfully.'
  );
  return redirectTo(actor.kind === 'partner' ? '/partner/dashboard' : '/admin/product-list', 303);
}
