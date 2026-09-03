/**
 * Asset integrity verification.
 *
 * Re-hashes every file listed in asset-manifest.json and compares against the
 * recorded SHA-256. Run this at every milestone gate to prove that no asset
 * has been modified, corrupted, or lost.
 *
 * CONTRACT BASIS
 * --------------
 * NN-10: no uploaded file may be deleted at any point.
 * F-30: original CSS ships unchanged — this detects accidental reformatting.
 * S-6: uploaded files served correctly at unchanged URLs, checksum-verified.
 * G-9: milestone gates require evidence; this produces it.
 *
 * A failure here means an asset drifted from the Laravel original, which is a
 * contract violation regardless of how harmless the change appears.
 *
 * USAGE
 *   npm run assets:verify
 */

import { createHash } from 'crypto';
import { createReadStream } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';

const DEST_PUBLIC = process.env.DEST_PUBLIC ?? 'public';
const MANIFEST = process.env.ASSET_MANIFEST ?? 'asset-manifest.json';

interface FileEntry {
  path: string;
  bytes: number;
  sha256: string;
}

function hashFile(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(path);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function main(): Promise<void> {
  const manifest = JSON.parse(await readFile(MANIFEST, 'utf8')) as {
    generatedAt: string;
    files: FileEntry[];
  };

  console.log(`Asset integrity verification`);
  console.log(`  manifest : ${MANIFEST} (generated ${manifest.generatedAt})`);
  console.log(`  files    : ${manifest.files.length}\n`);

  const mismatches: string[] = [];
  const missing: string[] = [];
  let verified = 0;

  for (const entry of manifest.files) {
    const path = join(DEST_PUBLIC, entry.path);
    try {
      const sha = await hashFile(path);
      if (sha === entry.sha256) verified++;
      else mismatches.push(entry.path);
    } catch {
      missing.push(entry.path);
    }
  }

  const passed = mismatches.length === 0 && missing.length === 0;

  console.log(`Verified   : ${verified} / ${manifest.files.length}`);
  console.log(`Mismatches : ${mismatches.length}`);
  console.log(`Missing    : ${missing.length}`);

  for (const p of mismatches.slice(0, 20)) console.log(`  MODIFIED: ${p}`);
  for (const p of missing.slice(0, 20)) console.log(`  MISSING : ${p}`);

  console.log(`\nINTEGRITY: ${passed ? 'PASSED' : 'FAILED'}`);
  if (!passed) {
    console.error(
      `\nA modified or missing asset is a CONTRACT VIOLATION (F-30 / NN-10).\n` +
        `Restore from the Laravel source and re-run \`npm run assets:copy\`.`
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
