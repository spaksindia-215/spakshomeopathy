'use server';

/**
 * Server Actions for the Cosmetics admin add/edit/delete forms
 * (`/admin/add-cosmetics`, `/admin/edit-cosmetics/[id]`,
 * `/admin/cosmetics-list`). Mirrors `@/lib/motherTincture/db/actions.ts`
 * exactly for the add path; edit/delete are new (Mother Tincture itself
 * only has an add form today — see that module's own file listing) but
 * follow the identical shape.
 *
 * Not placed under `src/actions/` — same reasoning as
 * `@/lib/motherTincture/db/actions.ts`'s header: that directory is
 * reserved for Server Actions replacing one of the Laravel migration's
 * cataloged forms, and this feature has no Laravel equivalent.
 *
 * Auth: relies on the caller already being inside the `admin/(shell)`
 * route group, whose `layout.tsx` calls `requireAdminSession()` before
 * rendering any page that could reach these actions.
 *
 * SYNTHETIC legacyId SCHEME: same as Mother Tincture's own — starts at
 * 200000 (`SYNTHETIC_LEGACY_ID_BASE`), a distinct base from Mother
 * Tincture's 100000 so the two synthetic ranges never collide if a future
 * change ever needed to compare them, even though each lives in its own
 * isolated database today and a collision could not actually occur.
 */

import { revalidatePath } from 'next/cache';
import { cosmeticsProductDocSchema } from './schema';
import { saveCosmeticsProduct, deleteCosmeticsProduct } from './service';
import { saveCosmeticsImageUpload } from '../uploads';
import type { Product, VariantSlot } from '@/lib/mongodb/schemas';

export interface CosmeticsFormActionResult {
  ok: boolean;
  persisted: boolean;
  message: string;
}

const SYNTHETIC_LEGACY_ID_BASE = 200_000;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function nextSyntheticLegacyId(): number {
  return SYNTHETIC_LEGACY_ID_BASE + (Date.now() % 10_000_000);
}

const EMPTY_VARIANT_SLOT: VariantSlot = {
  pImage: null,
  pName: null,
  pMrp: null,
  pPrice: null,
  pDesc: null,
};

/**
 * Reads the admin add/edit form's `FormData` into a full `Product`-shaped
 * document. Only the fields the form actually collects are populated from
 * user input; every other real `Product` field gets the same sane,
 * empty/null defaults `parseMotherTinctureForm` uses.
 *
 * @param existingLegacyId When editing, the row's existing `legacyId` and
 *   image filename — preserved unless a new image is uploaded, same
 *   "keep existing unless replaced" convention every other edit form in
 *   this codebase uses.
 */
async function parseCosmeticsForm(
  formData: FormData,
  existing?: { legacyId: number; pBestimg: string | null }
): Promise<{ doc: Product; imageError?: string }> {
  const name = String(formData.get('name') ?? '').trim();
  const heading = String(formData.get('heading') ?? '').trim() || name;
  const categoryId = formData.get('categoryId') ? Number(formData.get('categoryId')) : null;
  const price = formData.get('price') ? Number(formData.get('price')) : null;
  const mrp = formData.get('mrp') ? Number(formData.get('mrp')) : null;
  const quantity = formData.get('quantity') ? Number(formData.get('quantity')) : null;
  const rating = formData.get('rating') ? Number(formData.get('rating')) : null;
  const shortDescription = String(formData.get('shortDescription') ?? '').trim() || null;
  const description = String(formData.get('description') ?? '').trim() || null;
  const statusRaw = String(formData.get('status') ?? '1');
  const now = new Date();

  let pBestimg: string | null =
    String(formData.get('imagePath') ?? '').trim() || existing?.pBestimg || null;
  let imageError: string | undefined;
  const uploadedFile = formData.get('image');
  if (uploadedFile instanceof File && uploadedFile.size > 0) {
    const uploadResult = await saveCosmeticsImageUpload(uploadedFile);
    if (uploadResult.ok) {
      pBestimg = uploadResult.upload.filename;
    } else {
      imageError = uploadResult.reason;
    }
  }

  const legacyId = existing?.legacyId ?? nextSyntheticLegacyId();

  const doc: Product = {
    legacyId,
    pCat: categoryId,
    pSubcat: null,
    pOcat: null,
    ptype: null,
    pTop: null,
    pTrending: null,
    pFeatured: null,
    uid: null,

    pName: name || null,
    pHeading: heading || name || 'Cosmetics Product',
    pBestimg,
    pMrp: mrp,
    pPrice: price,
    pQuantity: quantity,
    pRating: rating,
    pShortDesc: shortDescription,
    pDesc: description,
    pColor: null,
    pSize: null,
    videoLink: null,
    reffNo: null,
    hsnCode: null,
    shippingTime: null,
    searchTerms: name || null,
    pSlug: slugify(name || `cosmetics-${legacyId}`),
    pDesc1: null,

    slot2: EMPTY_VARIANT_SLOT,
    slot3: EMPTY_VARIANT_SLOT,
    slot4: EMPTY_VARIANT_SLOT,
    slot5: EMPTY_VARIANT_SLOT,
    slot6: EMPTY_VARIANT_SLOT,
    slot7: EMPTY_VARIANT_SLOT,
    slot8: EMPTY_VARIANT_SLOT,
    slot9: EMPTY_VARIANT_SLOT,
    slot10: EMPTY_VARIANT_SLOT,

    pStatus: Number(statusRaw) || 0,
    createdAt: now,
    updatedAt: now,

    images: [],
    reviews: [],
    specifications: [],
  };

  return { doc: cosmeticsProductDocSchema.parse(doc), imageError };
}

function revalidateCosmeticsPaths(): void {
  revalidatePath('/homeopathy/cosmetics');
}

export async function createCosmeticsProductAction(
  formData: FormData
): Promise<CosmeticsFormActionResult> {
  const { doc: parsed, imageError } = await parseCosmeticsForm(formData);
  const result = await saveCosmeticsProduct(parsed);
  if (result.persisted) {
    revalidateCosmeticsPaths();
    return {
      ok: true,
      persisted: true,
      message: imageError
        ? `Saved "${parsed.pName ?? parsed.pHeading}" — but the image was not uploaded: ${imageError}`
        : `Saved "${parsed.pName ?? parsed.pHeading}".`,
    };
  }
  return {
    ok: false,
    persisted: false,
    message: result.reason ?? 'Not saved — no database configured for Cosmetics admin-add.',
  };
}

export async function updateCosmeticsProductAction(
  legacyId: number,
  existingImage: string | null,
  formData: FormData
): Promise<CosmeticsFormActionResult> {
  const { doc: parsed, imageError } = await parseCosmeticsForm(formData, {
    legacyId,
    pBestimg: existingImage,
  });
  const result = await saveCosmeticsProduct(parsed);
  if (result.persisted) {
    revalidateCosmeticsPaths();
    return {
      ok: true,
      persisted: true,
      message: imageError
        ? `Updated "${parsed.pName ?? parsed.pHeading}" — but the new image was not uploaded: ${imageError}`
        : `Updated "${parsed.pName ?? parsed.pHeading}".`,
    };
  }
  return {
    ok: false,
    persisted: false,
    message: result.reason ?? 'Not saved — no database configured for Cosmetics admin-add.',
  };
}

export async function deleteCosmeticsProductAction(legacyId: number): Promise<CosmeticsFormActionResult> {
  const result = await deleteCosmeticsProduct(legacyId);
  if (result.persisted) {
    revalidateCosmeticsPaths();
    return { ok: true, persisted: true, message: 'Deleted.' };
  }
  return {
    ok: false,
    persisted: false,
    message: result.reason ?? 'Not deleted — no database configured for Cosmetics admin-add.',
  };
}
