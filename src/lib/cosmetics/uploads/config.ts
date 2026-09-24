/**
 * Cosmetics admin-add image-upload configuration and validation rules —
 * mirrors `@/lib/motherTincture/uploads/config.ts` exactly, including the
 * same subdirectory choice: Cosmetics products are real `Product`-shaped
 * rows rendered by the EXISTING `HomeopathyProductCard` → `ProductImage`
 * component, which hardcodes its image path as
 * `/uploaded_files/products/${filename}`. Reusing that real subdirectory
 * (instead of a new `cosmetics/` one) means zero changes to `ProductImage`
 * and admin-added photos render exactly like real product photos.
 */

export const COSMETICS_UPLOAD_SUBDIR = 'products';

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
