import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { getAppConfig } from '@/lib/env';
import {
  COSMETICS_UPLOAD_SUBDIR,
  extensionForType,
  validateUploadFile,
  type AllowedImageType,
} from './config';

export interface SavedUpload {
  filename: string;
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

function resolveCosmeticsUploadDir(): string {
  const { uploadDir } = getAppConfig();
  return path.resolve(process.cwd(), uploadDir, COSMETICS_UPLOAD_SUBDIR);
}

/**
 * Saves an uploaded product image to disk under `<UPLOAD_DIR>/products/`
 * (the real curated catalogue's own upload subdirectory — see
 * `./config.ts`'s header), using the same `<unixTimestamp>g<name>`
 * filename convention already visible in `public/uploaded_files/products/*`.
 * Mirrors `@/lib/motherTincture/uploads/storage.ts` exactly.
 */
export async function saveCosmeticsImageUpload(
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
    targetDir = resolveCosmeticsUploadDir();
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
      publicPath: `/uploaded_files/${COSMETICS_UPLOAD_SUBDIR}/${filename}`,
    },
  };
}
