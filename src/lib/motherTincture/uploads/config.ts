/**
 * Mother Tincture admin-add image-upload configuration and validation
 * rules — mirrors `@/lib/herbs/uploads/config.ts` exactly (same allowed
 * types, same 5MB cap, same "new infrastructure, conservative defaults"
 * rationale, see that file's header for the full explanation).
 *
 * SUBDIRECTORY CHOICE (deviation from the Herbs Store's own-subdir
 * pattern, deliberate): Herbs uploads live under `/uploaded_files/herbs/`
 * because the Herbs Store's `ProductImage`-equivalent resolves against
 * that subdir. Mother Tincture products are real `Product`-shaped rows
 * rendered by the EXISTING `HomeopathyProductCard` → `ProductImage`
 * component (`@/components/homeopathy/HomeopathyMedia.tsx`), which
 * hardcodes its image path as `/uploaded_files/products/${filename}` —
 * the same real convention every curated homeopathy product's `pBestimg`
 * already resolves against. Saving admin-added Mother Tincture images
 * into a NEW `mother-tincture/` subdir would make them invisible to that
 * component without also changing it (which would risk the real curated
 * catalogue's images). Reusing the real `products/` subdir instead means
 * zero changes to `ProductImage` and admin-added photos render exactly
 * like real product photos, with no adapter.
 */

export const MOTHER_TINCTURE_UPLOAD_SUBDIR = 'products';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB

const EXTENSION_BY_TYPE: Record<AllowedImageType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function isAllowedImageType(mimeType: string): mimeType is AllowedImageType {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(mimeType);
}

export function extensionForType(mimeType: AllowedImageType): string {
  return EXTENSION_BY_TYPE[mimeType];
}

export interface UploadValidationError {
  code: 'no-file' | 'bad-type' | 'too-large';
  message: string;
}

/** Pure validation — no filesystem access, so it's usable from both the
 * Server Action and (if ever needed) a client-side pre-check. */
export function validateUploadFile(file: File | null): UploadValidationError | null {
  if (!file || file.size === 0) {
    return { code: 'no-file', message: 'No file was selected.' };
  }
  if (!isAllowedImageType(file.type)) {
    return {
      code: 'bad-type',
      message: `Unsupported file type "${file.type}". Use JPEG, PNG, or WebP.`,
    };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      code: 'too-large',
      message: `File is too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum is ${MAX_UPLOAD_BYTES / 1024 / 1024}MB.`,
    };
  }
  return null;
}
