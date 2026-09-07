/**
 * `@/lib/uploads/adminUpload` tests — M5-E, D-04 resolution (Fix Register
 * FIX-003). Runs against a REAL temporary directory (not a mocked `fs`),
 * same rationale as `tests/herbs/uploadStorage.test.ts`: filesystem path
 * handling (traversal, sanitization, naming) is exactly where subtle bugs
 * hide, so exercising the real `fs/promises` calls is worth it here.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import {
  saveAdminUpload,
  deleteAdminUpload,
  UploadRejectedError,
  ALLOWED_UPLOAD_EXTENSIONS,
} from '@/lib/uploads/adminUpload';

let tempRoot: string;
let savedEnv: string | undefined;

beforeEach(async () => {
  savedEnv = process.env.ADMIN_UPLOAD_ROOT;
  tempRoot = await mkdtemp(path.join(tmpdir(), 'admin-upload-test-'));
  process.env.ADMIN_UPLOAD_ROOT = tempRoot;
});

afterEach(async () => {
  if (savedEnv === undefined) delete process.env.ADMIN_UPLOAD_ROOT;
  else process.env.ADMIN_UPLOAD_ROOT = savedEnv;
  await rm(tempRoot, { recursive: true, force: true });
});

function makeFile(name: string, content = 'fake-image-bytes'): File {
  return new File([content], name);
}

describe('saveAdminUpload', () => {
  it('accepts an allowed extension, preserving the {unix-seconds}g{name} naming pattern', async () => {
    await mkdir(path.join(tempRoot, 'slider'), { recursive: true });
    const fixedTime = new Date('2026-09-04T00:00:00Z');
    vi.setSystemTime(fixedTime);
    const expectedEpoch = Math.floor(fixedTime.getTime() / 1000);

    const filename = await saveAdminUpload(makeFile('logo.png'), 'slider');

    expect(filename).toBe(`${expectedEpoch}glogo.png`);
    const written = await readFile(path.join(tempRoot, 'slider', filename), 'utf-8');
    expect(written).toBe('fake-image-bytes');

    vi.useRealTimers();
  });

  it('rejects a disallowed extension and writes nothing (Fix Register FIX-003 — the one behavioral difference from source)', async () => {
    await mkdir(path.join(tempRoot, 'slider'), { recursive: true });

    await expect(saveAdminUpload(makeFile('malicious.php'), 'slider')).rejects.toThrow(
      UploadRejectedError
    );

    // Confirm nothing was written — a rejected upload must not partially
    // succeed.
    await expect(readFile(path.join(tempRoot, 'slider', 'malicious.php'))).rejects.toThrow();
  });

  it('rejects a file with no extension', async () => {
    await mkdir(path.join(tempRoot, 'slider'), { recursive: true });
    await expect(saveAdminUpload(makeFile('noextension'), 'slider')).rejects.toThrow(
      UploadRejectedError
    );
  });

  it('sanitizes a path-traversal-shaped original filename, never escaping the target subdirectory', async () => {
    await mkdir(path.join(tempRoot, 'slider'), { recursive: true });
    vi.setSystemTime(new Date('2026-09-04T00:00:00Z'));

    const filename = await saveAdminUpload(makeFile('../../etc/passwd.png'), 'slider');

    // The path separators are stripped by sanitizeOriginalName's
    // basename-only extraction before the {unix-seconds}g prefix is
    // applied — the malicious path components never reach the filesystem
    // write at all.
    expect(filename).not.toContain('/');
    expect(filename).not.toContain('..');
    const written = await readFile(path.join(tempRoot, 'slider', filename), 'utf-8');
    expect(written).toBe('fake-image-bytes');

    vi.useRealTimers();
  });

  it('sanitizes shell/special-character-laden original filenames to underscores', async () => {
    await mkdir(path.join(tempRoot, 'slider'), { recursive: true });
    vi.setSystemTime(new Date('2026-09-04T00:00:00Z'));

    const filename = await saveAdminUpload(makeFile('evil; rm -rf$(whoami).png'), 'slider');

    // Every character outside [A-Za-z0-9._-] collapses to '_' individually
    // (not run-length-collapsed) — 'evil; rm -rf$(whoami).png' becomes
    // 'evil__rm_-rf__whoami_.png' (';' + ' ' -> '__', ' ' -> '_' before
    // '-rf', '$' + '(' -> '__' before 'whoami', ')' -> '_' after).
    expect(filename).toMatch(/^\d+gevil__rm_-rf__whoami_\.png$/);
    expect(filename).not.toMatch(/[;$()]/);

    vi.useRealTimers();
  });

  it.each(ALLOWED_UPLOAD_EXTENSIONS)('accepts the whitelisted extension .%s', async (ext) => {
    await mkdir(path.join(tempRoot, 'slider'), { recursive: true });
    await expect(saveAdminUpload(makeFile(`file.${ext}`), 'slider')).resolves.toMatch(
      new RegExp(`\\.${ext}$`)
    );
  });
});

describe('deleteAdminUpload', () => {
  it('deletes an existing file', async () => {
    await mkdir(path.join(tempRoot, 'slider'), { recursive: true });
    const target = path.join(tempRoot, 'slider', 'existing.jpg');
    await writeFile(target, 'content');

    await deleteAdminUpload('existing.jpg', 'slider');

    await expect(readFile(target)).rejects.toThrow();
  });

  it('is a silent no-op for a non-existent file (mirrors file_exists() guard before unlink())', async () => {
    await mkdir(path.join(tempRoot, 'slider'), { recursive: true });
    await expect(deleteAdminUpload('never-existed.jpg', 'slider')).resolves.toBeUndefined();
  });

  it('is a silent no-op for an empty filename (mirrors source\'s `$old_image!=""` guard)', async () => {
    await expect(deleteAdminUpload('', 'slider')).resolves.toBeUndefined();
  });
});
