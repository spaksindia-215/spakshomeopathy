/**
 * Admin file-upload handling — general-purpose, migration-scoped module
 * (distinct from `src/lib/herbs/uploads/`, which belongs to the separate
 * CR-003 Herbs Store project and is NOT reused here).
 *
 * D-04 — RESOLVED (M5-E, 2026-09-04, Fix Register FIX-003, see
 * `docs/M3-OWNER-DECISION-RECORDS.md` D-04 addendum and
 * `MIGRATION-CONTRACT.md` §9.3): the owner selected D-04's own recommended
 * behavior — enforce an extension whitelist and sanitize filenames, while
 * PRESERVING the existing `time().'g'.originalName` naming pattern for all
 * legitimate uploads.
 *
 * SOURCE NAMING PATTERN (verified directly, e.g.
 * `AdminController::SaveSlider`, `AdminController.php:1149-1165`):
 *
 *   $filename = time().'g'.$slider_image->getClientOriginalName();
 *   $slider_image->move(public_path('uploaded_files/slider'), $filename);
 *
 * PRESERVED EXACTLY: the `{unix-seconds}g{originalName}` naming scheme —
 * this is business-observable (the filename is stored in the DB and
 * appears in URLs/img src attributes), so changing its FORMAT would be a
 * fidelity violation independent of D-04. What D-04 authorizes changing is
 * WHICH uploads are accepted and whether the original name component is
 * sanitized first — not the format string itself.
 *
 * WHAT SANITIZATION MEANS HERE (Fix Register FIX-003's exact scope):
 *   1. Extension whitelist: jpg, jpeg, png, gif, webp (D-04's own
 *      recommended list includes pdf too, but every admin upload field
 *      this project has built so far — slider images — is image-only by
 *      its own `<input type="file">`'s intent; `pdf` is included in the
 *      whitelist constant below for reuse by a future non-image upload
 *      sub-slice, but is not currently reachable through any wired field).
 *   2. Filename sanitization: strip path separators and any character
 *      outside `[A-Za-z0-9._-]` from the ORIGINAL name component (the part
 *      after `{unix-seconds}g`), collapsing anything else to `_`. This is
 *      what actually closes the RCE-shaped risk D-04 describes (a
 *      malicious original filename like `../../etc/passwd` or one
 *      containing shell/path metacharacters) — the `{unix-seconds}g`
 *      prefix itself needs no sanitization, since it is server-generated.
 *   3. A rejected extension is a hard error — no upload occurs, no
 *      filename is generated, no DB write follows. Laravel's own
 *      unvalidated behavior would have written a document unconditionally;
 *      REJECTION on a bad extension is therefore the one place this
 *      module's OBSERVABLE behavior differs from source for a malicious
 *      input — exactly the class of difference D-04/FIX-003 authorizes.
 *
 * FILESYSTEM SAFETY: `saveAdminUpload` confirms the final resolved path
 * still lives under the target subdirectory of `public/uploaded_files/`
 * before any write — a defense-in-depth check against path traversal via a
 * malformed subdirectory argument (not currently reachable by any caller,
 * since callers pass a hardcoded subdirectory string, but cheap to assert
 * explicitly rather than trust that constraint silently).
 */

import { writeFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join, resolve, extname } from 'path';

/** D-04's own recommended whitelist. `pdf` is included for reuse by a
 * future non-image upload sub-slice — not currently reachable by any
 * wired field in this codebase. */
export const ALLOWED_UPLOAD_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'] as const;

/**
 * Resolves the real `public/uploaded_files/` root fresh on every call
 * (not module-load-time) so tests can override it via `ADMIN_UPLOAD_ROOT`
 * — same rationale as `src/lib/herbs/uploads/config.ts`'s `UPLOAD_DIR`
 * override, kept as a SEPARATE env var and a separate module (not a
 * shared config import), since Herbs' upload config belongs to the
 * out-of-scope CR-003 project. Production/dev code never sets
 * `ADMIN_UPLOAD_ROOT` — it only exists so `tests/lib/adminUpload.test.ts`
 * can point writes at a temp directory instead of the real
 * `public/uploaded_files/`.
 *
 * EXPORTED as of CR-006 Phase 8 (`docs/CR-006-PHASE-8-PLAN.md` §2.1) so
 * the new `/admin/media-library` screen resolves the exact same root
 * `saveAdminUpload`/`deleteAdminUpload` already use, instead of a second,
 * independently-computed path that could drift from this one.
 */
export function uploadedFilesRoot(): string {
  const override = process.env.ADMIN_UPLOAD_ROOT;
  return override ? resolve(override) : resolve(process.cwd(), 'public', 'uploaded_files');
}

export class UploadRejectedError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'UploadRejectedError';
  }
}

/** Strips path separators and anything outside [A-Za-z0-9._-] from an
 * original filename's non-extension component, collapsing rejected
 * characters to `_`. Never touches the {unix-seconds}g prefix (generated
 * separately, never derived from user input). */
function sanitizeOriginalName(originalName: string): string {
  const withoutPath = originalName.replace(/^.*[/\\]/, '');
  return withoutPath.replace(/[^A-Za-z0-9._-]/g, '_');
}

function extensionOf(filename: string): string {
  return extname(filename).replace(/^\./, '').toLowerCase();
}

/**
 * Validates + sanitizes + persists an uploaded `File` to
 * `public/uploaded_files/{subdirectory}/`, using the preserved
 * `{unix-seconds}g{sanitizedOriginalName}` naming scheme.
 *
 * @throws UploadRejectedError if the extension is not in
 *   ALLOWED_UPLOAD_EXTENSIONS — Fix Register FIX-003's one behavioral
 *   difference from source's unconditional acceptance.
 */
export async function saveAdminUpload(file: File, subdirectory: string): Promise<string> {
  const extension = extensionOf(file.name);
  if (
    !ALLOWED_UPLOAD_EXTENSIONS.includes(extension as (typeof ALLOWED_UPLOAD_EXTENSIONS)[number])
  ) {
    throw new UploadRejectedError(
      `File type ".${extension || '(none)'}" is not allowed. Accepted types: ${ALLOWED_UPLOAD_EXTENSIONS.join(', ')}.`
    );
  }

  const sanitizedName = sanitizeOriginalName(file.name);
  const filename = `${Math.floor(Date.now() / 1000)}g${sanitizedName}`;

  const targetDir = resolve(uploadedFilesRoot(), subdirectory);
  const targetPath = resolve(targetDir, filename);

  // Defense-in-depth: confirm the resolved path still lives under the
  // intended subdirectory (guards against a future caller accidentally
  // passing a subdirectory value containing '..').
  if (!targetPath.startsWith(targetDir + '/') && targetPath !== targetDir) {
    throw new UploadRejectedError('Resolved upload path escapes the target directory.');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(targetPath, buffer);

  return filename;
}

/**
 * Deletes a previously-uploaded file by filename, mirroring source's
 * `unlink('uploaded_files/{subdirectory}/'.$old_image)` calls in
 * `UpdateSlider`/`DestroySlider` — silently no-ops if the file does not
 * exist (matching source's own `file_exists(...)` guard before `unlink()`,
 * which never throws on a missing file either).
 */
export async function deleteAdminUpload(filename: string, subdirectory: string): Promise<void> {
  if (!filename) return; // source: `if ($old_image!='' && file_exists(...))`
  const targetPath = join(uploadedFilesRoot(), subdirectory, filename);
  if (existsSync(targetPath)) {
    await unlink(targetPath);
  }
}
