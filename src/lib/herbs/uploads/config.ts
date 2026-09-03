/**
 * Herbs Store image-upload configuration and validation rules.
 *
 * NEW infrastructure — no code path anywhere in this app currently
 * writes an uploaded file to disk. The legacy admin forms' `<input
 * type="file">` fields are decorative (verified: `add-product`,
 * `add-hurbcat`, etc. all lack any backing upload handler — this
 * migration's "no real API" boundary for those forms). There is
 * therefore no existing validation convention to match; the rules below
 * are new, deliberately conservative defaults for genuinely new surface
 * area, not a port of anything.
 *
 * Storage path follows the existing `UPLOAD_DIR` convention
 * (`@/lib/env`'s `getAppConfig()`, Laravel's `public_path("uploaded_files")`
 * equivalent) so served URLs live under the same `/uploaded_files/`
 * prefix the rest of the app already uses — but in a new `herbs/`
 * subdirectory, keeping Herbs Store uploads structurally separate from
 * the legacy `products/`/`categories/`/etc. subdirectories, same
 * parallel-model posture as `@/lib/herbs/db`.
 */

export const HERBS_UPLOAD_SUBDIR = 'herbs';

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
