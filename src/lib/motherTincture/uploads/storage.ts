import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { getAppConfig } from '@/lib/env';
import {
  MOTHER_TINCTURE_UPLOAD_SUBDIR,
  extensionForType,
  validateUploadFile,
  type AllowedImageType,
} from './config';

export interface SavedUpload {
  /** Bare filename as stored on disk — this is what gets saved into the
   * admin-added product's `pBestimg` field, matching the real curated
   * catalogue's own convention (a bare filename resolved against
   * `/uploaded_files/products/` by `ProductImage`). */
  filename: string;
  /** Full public URL path, ready to use directly in an <img src>. */
  publicPath: string;
}

function sanitizeBaseName(originalName: string): string {
  const base = path.basename(originalName, path.extname(originalName));
  return (
    base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'image'
  );
}

/** Resolves `UPLOAD_DIR` against `process.cwd()` — mirrors
 * `@/lib/herbs/uploads/storage.ts`'s `resolveHerbsUploadDir`, see that
 * function's comment for why `path.resolve` (not `path.join`) is used. */
function resolveMotherTinctureUploadDir(): string {
  const { uploadDir } = getAppConfig();
  return path.resolve(process.cwd(), uploadDir, MOTHER_TINCTURE_UPLOAD_SUBDIR);
}

/**
 * Saves an uploaded product image to disk under `<UPLOAD_DIR>/products/`
 * (the REAL curated catalogue's own upload subdirectory — see
 * `./config.ts`'s header for why this feature deliberately reuses it
 * instead of a new `mother-tincture/` subdir), using the same
 * `<unixTimestamp>g<name>` filename convention already visible in
 * `public/uploaded_files/products/*`.
 *
 * Returns validation errors as a typed result rather than throwing — same
 * graceful, explicit-reason convention as
 * `@/lib/motherTincture/db/service.ts` / `@/lib/herbs/uploads/storage.ts`.
 */
export async function saveMotherTinctureImageUpload(
  file: File
): Promise<{ ok: true; upload: SavedUpload } | { ok: false; reason: string }> {
  const validationError = validateUploadFile(file);
  if (validationError) {
    return { ok: false, reason: validationError.message };
  }

  const extension = extensionForType(file.type as AllowedImageType);
  const safeName = sanitizeBaseName(file.name);
  const filename = `${Date.now()}g${safeName}.${extension}`;

  let targetDir: string;
  let targetPath: string;
  try {
    targetDir = resolveMotherTinctureUploadDir();
    targetPath = path.join(targetDir, filename);
    await mkdir(targetDir, { recursive: true });
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(targetPath, bytes);
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? `Failed to save file: ${err.message}` : 'Failed to save file.',
    };
  }

  return {
    ok: true,
    upload: {
      filename,
      publicPath: `/uploaded_files/${MOTHER_TINCTURE_UPLOAD_SUBDIR}/${filename}`,
    },
  };
}
