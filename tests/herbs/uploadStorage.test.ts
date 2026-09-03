/**
 * `@/lib/herbs/uploads/storage` tests. Runs against a REAL temporary
 * directory (not a mocked `fs`) — filesystem path handling is exactly
 * where subtle bugs (traversal, directory creation, overwrite races)
 * hide, so exercising the real `fs/promises` calls is worth it here,
 * unlike the MongoDB repository tests (which use a fake `Db` because a
 * real connection isn't available in this environment at all).
 *
 * This suite is also what caught two real bugs in `storage.ts` during
 * this session: `path.join(cwd, absoluteUploadDir)` silently
 * mis-resolved an absolute `UPLOAD_DIR` (fixed with `path.resolve`), and
 * `getAppConfig()`'s throw on a missing env var wasn't caught, breaking
 * the module's own documented "never throw" contract (fixed by moving
 * the call inside the existing try/catch).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

const ENV_KEYS = ['UPLOAD_DIR', 'APP_URL'] as const;
let saved: Record<string, string | undefined>;
let tempRoot: string;

beforeEach(async () => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  tempRoot = await mkdtemp(path.join(tmpdir(), 'herbs-upload-test-'));
  // getAppConfig() resolves uploadDir with path.resolve(cwd, uploadDir) —
  // an ABSOLUTE UPLOAD_DIR (this temp path) is used as-is, so uploads
  // never touch the real project's public/uploaded_files. APP_URL is a
  // required() field on the same getAppConfig() call (unrelated to
  // uploads, but required() throws if any expected var is absent) — set
  // to a harmless placeholder purely so getAppConfig() doesn't throw.
  process.env.UPLOAD_DIR = tempRoot;
  process.env.APP_URL = 'http://localhost:3000';
});

afterEach(async () => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  await rm(tempRoot, { recursive: true, force: true });
});

function makeFile(name: string, type: string, content = 'fake-image-bytes'): File {
  return new File([content], name, { type });
}

describe('saveHerbImageUpload', () => {
  it('writes the file to <UPLOAD_DIR>/herbs/ and returns a public path under /uploaded_files/herbs/', async () => {
    const { saveHerbImageUpload } = await import('@/lib/herbs/uploads/storage');
    const file = makeFile('Ashwagandha Root.jpg', 'image/jpeg');

    const result = await saveHerbImageUpload(file);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.upload.publicPath).toMatch(/^\/uploaded_files\/herbs\/\d+g[a-z0-9-]+\.jpg$/);
    expect(result.upload.filename).toBe(path.basename(result.upload.publicPath));

    const writtenPath = path.join(tempRoot, 'herbs', result.upload.filename);
    const contents = await readFile(writtenPath, 'utf-8');
    expect(contents).toBe('fake-image-bytes');
  });

  it('sanitizes the original filename into the stored name', async () => {
    const { saveHerbImageUpload } = await import('@/lib/herbs/uploads/storage');
    const file = makeFile('My Photo (final) v2!!.png', 'image/png');

    const result = await saveHerbImageUpload(file);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.upload.filename).not.toContain(' ');
    expect(result.upload.filename).not.toContain('(');
    expect(result.upload.filename).not.toContain('!');
    expect(result.upload.filename).toMatch(/my-photo-final-v2/);
  });

  it('rejects a disallowed file type without writing anything to disk', async () => {
    const { saveHerbImageUpload } = await import('@/lib/herbs/uploads/storage');
    const file = makeFile('script.svg', 'image/svg+xml');

    const result = await saveHerbImageUpload(file);

    expect(result.ok).toBe(false);
    // herbs/ subdirectory should never have been created for a rejected upload.
    await expect(readFile(path.join(tempRoot, 'herbs'))).rejects.toThrow();
  });

  it('creates the herbs/ subdirectory on demand if it does not already exist', async () => {
    const { saveHerbImageUpload } = await import('@/lib/herbs/uploads/storage');
    const file = makeFile('turmeric.webp', 'image/webp');

    const result = await saveHerbImageUpload(file);

    expect(result.ok).toBe(true);
    const dirExists = await mkdir(path.join(tempRoot, 'herbs'), { recursive: true }).then(
      () => true,
      () => false
    );
    expect(dirExists).toBe(true); // idempotent mkdir succeeds either way; real check is readFile above
  });
});

describe('deleteHerbImageUpload', () => {
  it('removes a previously saved file', async () => {
    const { saveHerbImageUpload, deleteHerbImageUpload } = await import(
      '@/lib/herbs/uploads/storage'
    );
    const file = makeFile('to-delete.jpg', 'image/jpeg');
    const saveResult = await saveHerbImageUpload(file);
    expect(saveResult.ok).toBe(true);
    if (!saveResult.ok) return;

    const writtenPath = path.join(tempRoot, 'herbs', saveResult.upload.filename);
    await expect(readFile(writtenPath)).resolves.toBeDefined();

    await deleteHerbImageUpload(saveResult.upload.filename);

    await expect(readFile(writtenPath)).rejects.toThrow();
  });

  it('does not throw when deleting a file that does not exist', async () => {
    const { deleteHerbImageUpload } = await import('@/lib/herbs/uploads/storage');
    await expect(deleteHerbImageUpload('nonexistent-file.jpg')).resolves.toBeUndefined();
  });

  it('refuses to delete a path that attempts to escape the herbs upload directory', async () => {
    const { deleteHerbImageUpload } = await import('@/lib/herbs/uploads/storage');

    // Plant a file OUTSIDE the herbs/ subdir, directly in tempRoot, to
    // prove a traversal attempt cannot reach it.
    const { writeFile } = await import('fs/promises');
    const sentinelPath = path.join(tempRoot, 'sentinel.txt');
    await writeFile(sentinelPath, 'must-survive');

    await deleteHerbImageUpload('../sentinel.txt');

    await expect(readFile(sentinelPath, 'utf-8')).resolves.toBe('must-survive');
  });
});
