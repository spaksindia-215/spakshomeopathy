'use server';

/**
 * Server Actions for the Herbs Store admin forms
 * (`/admin/add-herb`, `/admin/edit-herb/[id]`).
 *
 * Not placed under `src/actions/` — that directory is reserved
 * specifically for Server Actions replacing one of the Laravel
 * migration's 36 cataloged forms (see its own `.gitkeep`, IR-5). These
 * forms have no Laravel equivalent, so keeping them inside
 * `src/lib/herbs/` keeps that reserved directory's meaning unambiguous.
 *
 * Auth: relies on the caller already being inside the `admin/(shell)`
 * route group, whose `layout.tsx` calls `requireAdminSession()` before
 * rendering any page that could reach this action — same reuse-not-
 * duplicate posture as the rest of the Herbs admin integration. This
 * action does not re-check auth itself (mirrors how the rest of this
 * app's Server Actions rely on route-level protection rather than
 * per-action checks — there is no established per-action auth-check
 * convention here to follow instead).
 */

import { revalidatePath } from 'next/cache';
import { herbProductDocSchema } from './schema';
import { wellnessCategoryDocSchema } from './wellnessCategorySchema';
import {
  saveHerbProduct,
  deleteHerbProduct,
  saveWellnessCategory,
  hideWellnessCategory,
} from './service';
import { saveHerbImageUpload } from '../uploads';
import type { HerbForm } from '../types';

export interface HerbFormActionResult {
  ok: boolean;
  persisted: boolean;
  message: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Reads the admin add/edit form's `FormData` into a `HerbProductDoc`.
 * Fields the current form UI doesn't collect (gallery, ingredients list,
 * tags, SEO fields, etc.) get sane defaults — the form can be extended to
 * cover them without changing this parsing shape.
 *
 * Image handling: if a real file was selected (`image` field, non-empty),
 * it's saved via `saveHerbImageUpload` and the resulting `/uploaded_files/
 * herbs/…` path becomes `image`/`gallery[0]`. Otherwise, `existingImage`
 * (the product's current image, passed by the edit form) is kept — so
 * saving an edit without touching the image field doesn't revert a real
 * photo back to placeholder art. A genuinely new product with no upload
 * falls back to the 'default' placeholder-art key, same as before this
 * feature existed.
 */
async function parseHerbForm(
  formData: FormData,
  existingId?: string,
  existingImage?: string
): Promise<{ doc: ReturnType<typeof herbProductDocSchema.parse>; imageError?: string }> {
  const name = String(formData.get('name') ?? '').trim();
  const price = Number(formData.get('price') ?? 0);
  const compareAtPriceRaw = formData.get('compareAtPrice');
  const compareAtPrice = compareAtPriceRaw ? Number(compareAtPriceRaw) : undefined;
  const stock = Number(formData.get('stock') ?? 0);
  const now = new Date().toISOString();

  let image = existingImage ?? 'default';
  let imageError: string | undefined;
  const uploadedFile = formData.get('image');
  if (uploadedFile instanceof File && uploadedFile.size > 0) {
    const uploadResult = await saveHerbImageUpload(uploadedFile);
    if (uploadResult.ok) {
      image = uploadResult.upload.publicPath;
    } else {
      imageError = uploadResult.reason;
    }
  }

  const doc = {
    id: existingId ?? `hp-${Date.now().toString(36)}`,
    name,
    slug: slugify(name),
    sku: String(formData.get('sku') ?? ''),
    shortDescription: String(formData.get('shortDescription') ?? ''),
    description: String(formData.get('description') ?? ''),
    benefits: [] as string[],
    ingredients: [] as string[],
    botanicalName: String(formData.get('botanicalName') ?? '') || undefined,
    howToUse: '',
    precautions: '',
    image,
    gallery: [image],
    form: String(formData.get('form') ?? 'whole-herbs') as HerbForm,
    categoryLabel: String(formData.get('form') ?? 'Whole Herbs'),
    wellnessCategories:
      formData.getAll('wellness').length > 0
        ? formData.getAll('wellness').map((v) => String(v))
        : ['general-wellness'],
    variants: [
      {
        label: 'Default',
        sortWeight: 0,
        price,
        ...(compareAtPrice ? { compareAtPrice } : {}),
        sku: String(formData.get('sku') ?? ''),
        stock,
      },
    ],
    rating: 0,
    reviewCount: 0,
    stock,
    status: (stock > 0 ? 'active' : 'out-of-stock') as 'active' | 'out-of-stock' | 'draft',
    featured: formData.get('featured') === 'on',
    bestseller: formData.get('bestseller') === 'on',
    newArrival: formData.get('newArrival') === 'on',
    tags: [] as string[],
    // CR-006 Phase 8: admin-supplied SEO fields, falling back to the
    // pre-Phase-8 auto-derivation when left blank — so a herb saved
    // through the old form (or with these fields left empty) keeps
    // exactly its previous behavior; nothing regresses silently.
    metaTitle: String(formData.get('metaTitle') ?? '').trim() || `${name} | Spaks Herbs`,
    metaDescription:
      String(formData.get('metaDescription') ?? '').trim() ||
      String(formData.get('shortDescription') ?? ''),
    createdAt: now,
    updatedAt: now,
  };

  return { doc: herbProductDocSchema.parse(doc), imageError };
}

export async function createHerbProductAction(formData: FormData): Promise<HerbFormActionResult> {
  const { doc: parsed, imageError } = await parseHerbForm(formData);
  const result = await saveHerbProduct(parsed);
  if (result.persisted) {
    revalidatePath('/admin/herbs-list');
    revalidatePath('/herbs');
    revalidatePath('/herbs/products');
    return {
      ok: true,
      persisted: true,
      message: imageError
        ? `Saved "${parsed.name}" — but the image was not uploaded: ${imageError}`
        : `Saved "${parsed.name}".`,
    };
  }
  return {
    ok: false,
    persisted: false,
    message: result.reason ?? 'Not saved — no database configured for the Herbs Store.',
  };
}

export async function updateHerbProductAction(
  id: string,
  existingImage: string,
  formData: FormData
): Promise<HerbFormActionResult> {
  const { doc: parsed, imageError } = await parseHerbForm(formData, id, existingImage);
  const result = await saveHerbProduct(parsed);
  if (result.persisted) {
    revalidatePath('/admin/herbs-list');
    revalidatePath(`/admin/edit-herb/${id}`);
    revalidatePath('/herbs');
    revalidatePath(`/herbs/product/${parsed.slug}`);
    return {
      ok: true,
      persisted: true,
      message: imageError
        ? `Updated "${parsed.name}" — but the new image was not uploaded: ${imageError}`
        : `Updated "${parsed.name}".`,
    };
  }
  return {
    ok: false,
    persisted: false,
    message: result.reason ?? 'Not saved — no database configured for the Herbs Store.',
  };
}

export async function deleteHerbProductAction(id: string): Promise<HerbFormActionResult> {
  const result = await deleteHerbProduct(id);
  if (result.persisted) {
    revalidatePath('/admin/herbs-list');
    revalidatePath('/herbs');
    return { ok: true, persisted: true, message: 'Deleted.' };
  }
  return {
    ok: false,
    persisted: false,
    message: result.reason ?? 'Not deleted — no database configured for the Herbs Store.',
  };
}

/**
 * Server Actions for the Wellness Category admin forms
 * (`/admin/wellness-categories`, `/admin/add-wellness-category`,
 * `/admin/edit-wellness-category/[key]`) — CR-006 Phase 6.
 * Same auth posture as the herb-product actions above: relies on
 * `admin/(shell)/layout.tsx`'s route-level `requireAdminSession()`.
 */

function parseWellnessCategoryForm(
  formData: FormData,
  existingKey?: string
): ReturnType<typeof wellnessCategoryDocSchema.parse> {
  const label = String(formData.get('label') ?? '').trim();
  const now = new Date().toISOString();
  const sortOrderRaw = formData.get('sortOrder');

  const doc = {
    key: existingKey ?? slugify(label),
    label,
    description: String(formData.get('description') ?? ''),
    icon: String(formData.get('icon') ?? ''),
    sortOrder: sortOrderRaw ? Number(sortOrderRaw) : 0,
    status: (formData.get('status') === 'hidden' ? 'hidden' : 'active') as 'active' | 'hidden',
    createdAt: now,
    updatedAt: now,
  };

  return wellnessCategoryDocSchema.parse(doc);
}

export async function createWellnessCategoryAction(
  formData: FormData
): Promise<HerbFormActionResult> {
  const parsed = parseWellnessCategoryForm(formData);
  const result = await saveWellnessCategory(parsed);
  if (result.persisted) {
    revalidatePath('/admin/wellness-categories');
    revalidatePath('/herbs/wellness');
    return { ok: true, persisted: true, message: `Saved "${parsed.label}".` };
  }
  return {
    ok: false,
    persisted: false,
    message: result.reason ?? 'Not saved — no database configured for the Herbs Store.',
  };
}

export async function updateWellnessCategoryAction(
  key: string,
  createdAt: string,
  formData: FormData
): Promise<HerbFormActionResult> {
  const parsed = parseWellnessCategoryForm(formData, key);
  const result = await saveWellnessCategory({ ...parsed, createdAt });
  if (result.persisted) {
    revalidatePath('/admin/wellness-categories');
    revalidatePath(`/admin/edit-wellness-category/${key}`);
    revalidatePath('/herbs/wellness');
    revalidatePath(`/herbs/wellness/${key}`);
    return { ok: true, persisted: true, message: `Updated "${parsed.label}".` };
  }
  return {
    ok: false,
    persisted: false,
    message: result.reason ?? 'Not saved — no database configured for the Herbs Store.',
  };
}

/** Soft delete only — see `WellnessCategoryRepository.hide`'s header. */
export async function hideWellnessCategoryAction(key: string): Promise<HerbFormActionResult> {
  const result = await hideWellnessCategory(key);
  if (result.persisted) {
    revalidatePath('/admin/wellness-categories');
    revalidatePath('/herbs/wellness');
    return { ok: true, persisted: true, message: 'Hidden.' };
  }
  return {
    ok: false,
    persisted: false,
    message: result.reason ?? 'Not hidden — no database configured for the Herbs Store.',
  };
}
