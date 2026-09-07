'use server';

/**
 * Server Action for the Mother Tincture admin "Add" form
 * (`/admin/add-mother-tincture`).
 *
 * Not placed under `src/actions/` — that directory is reserved
 * specifically for Server Actions replacing one of the Laravel
 * migration's 36 cataloged forms (see its own `.gitkeep`, IR-5). This
 * form has no Laravel equivalent, so keeping it inside
 * `src/lib/motherTincture/` keeps that reserved directory's meaning
 * unambiguous — same posture as `@/lib/herbs/db/actions.ts`.
 *
 * Auth: relies on the caller already being inside the `admin/(shell)`
 * route group, whose `layout.tsx` calls `requireAdminSession()` before
 * rendering any page that could reach this action — same reuse-not-
 * duplicate posture as `@/lib/herbs/db/actions.ts`.
 *
 * SYNTHETIC legacyId SCHEME: the real curated catalogue
 * (`@/lib/demo/products.generated.ts`, 287 rows) has real `legacyId`
 * values up to 737 (verified directly against the generated fixture this
 * session). Admin-added Mother Tincture products mint a synthetic
 * `legacyId` starting at 100000 (`SYNTHETIC_LEGACY_ID_BASE`) plus a
 * per-save counter derived from `Date.now()` modulo a large range — well
 * clear of any conceivable growth of the real curated catalogue (which is
 * a fixed historical export, not a live-growing table) — rather than a
 * negative range, so the value stays a "normal-looking" product id
 * everywhere it's displayed (URLs, cart line items, admin lists) instead
 * of surfacing an implementation detail as a visibly negative number.
 */

import { revalidatePath } from 'next/cache';
import { motherTinctureProductDocSchema } from './schema';
import { saveMotherTinctureProduct } from './service';
import { saveMotherTinctureImageUpload } from '../uploads';
import type { Product, VariantSlot } from '@/lib/mongodb/schemas';

export interface MotherTinctureFormActionResult {
  ok: boolean;
  persisted: boolean;
  message: string;
}

/** Base for every synthetic `legacyId` minted by this form — see this
 * file's header for why 100000 (well above the real catalogue's observed
 * max of 737) was chosen over a negative range. */
const SYNTHETIC_LEGACY_ID_BASE = 100_000;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** One synthetic `legacyId` per call, derived from the current timestamp
 * so concurrent submissions don't collide in practice (this form has no
 * shared counter/sequence to consult, mirroring the rest of this app's
 * admin forms, none of which coordinate id allocation across requests
 * either). */
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
 * Reads the admin add form's `FormData` into a full `Product`-shaped
 * document. Only the fields the form actually collects are populated from
 * user input; every other real `Product` field (the 9 unused variant
 * slots, `images`/`reviews`/`specifications`, the legacy `p_ocat`/`ptype`/
 * etc. flags) gets the same sane, empty/null defaults a real but
 * unused-variant product row would have — mirrors
 * `@/lib/herbs/db/actions.ts#parseHerbForm`'s "fields the form doesn't
 * collect get sane defaults" posture.
 *
 * Image handling: if a real file was selected (`image` field, non-empty),
 * it's saved via `saveMotherTinctureImageUpload` (into the REAL
 * `/uploaded_files/products/` directory — see `../uploads/config.ts`'s
 * header for why) and the resulting filename becomes `pBestimg`.
 * Otherwise, a plain text `imagePath` field value is used verbatim as a
 * fallback filename (an acceptable "basic" input for an admin who already
 * has a filename/path in mind, e.g. one uploaded via another route) — if
 * neither is provided, `pBestimg` is left `null` and `ProductImage`'s
 * built-in placeholder art renders instead, same as any real product
 * missing a photo.
 */
async function parseMotherTinctureForm(
  formData: FormData
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
  const now = new Date();

  let pBestimg: string | null = String(formData.get('imagePath') ?? '').trim() || null;
  let imageError: string | undefined;
  const uploadedFile = formData.get('image');
  if (uploadedFile instanceof File && uploadedFile.size > 0) {
    const uploadResult = await saveMotherTinctureImageUpload(uploadedFile);
    if (uploadResult.ok) {
      pBestimg = uploadResult.upload.filename;
    } else {
      imageError = uploadResult.reason;
    }
  }

  const legacyId = nextSyntheticLegacyId();

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
    pHeading: heading || name || 'Mother Tincture',
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
    pSlug: slugify(name || `mother-tincture-${legacyId}`),
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

    pStatus: 1,
    createdAt: now,
    updatedAt: now,

    images: [],
    reviews: [],
    specifications: [],
  };

  return { doc: motherTinctureProductDocSchema.parse(doc), imageError };
}

export async function createMotherTinctureProductAction(
  formData: FormData
): Promise<MotherTinctureFormActionResult> {
  const { doc: parsed, imageError } = await parseMotherTinctureForm(formData);
  const result = await saveMotherTinctureProduct(parsed);
  if (result.persisted) {
    revalidatePath('/mother-tincture');
    revalidatePath('/homeopathy/products');
    revalidatePath('/nutrition');
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
    message: result.reason ?? 'Not saved — no database configured for Mother Tincture admin-add.',
  };
}
