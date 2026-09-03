/**
 * Asset migration baseline — copy, checksum, verify, manifest.
 *
 * Copies every static asset from the Laravel application into the Next.js
 * public/ directory, generating SHA-256 checksums for both source and
 * destination and verifying that every byte matches.
 *
 * CONTRACT BASIS
 * --------------
 * NN-10: no uploaded file may be deleted at any point.
 * F-30 / §18.2: the original CSS ships UNCHANGED — no reformatting,
 *   no tree-shaking, no optimization.
 * S-6: all uploaded files served at unchanged URLs, checksum-verified.
 * R-13 / P-13: filenames must be preserved EXACTLY. They are stored as bare
 *   strings in the database with no path column, and product-detail JS parses
 *   a fixed URL path-segment index.
 *
 * SAFETY: copies only. Never deletes or modifies anything in the Laravel
 * source tree, which remains the reference implementation (NN-1).
 */

import { createHash } from 'crypto';
import { createReadStream } from 'fs';
import { mkdir, readdir, stat, copyFile, writeFile } from 'fs/promises';
import { join, relative, dirname } from 'path';

const LARAVEL_PUBLIC = process.env.LARAVEL_PUBLIC ?? '../spakshomeopathy.com/public';
const DEST_PUBLIC = process.env.DEST_PUBLIC ?? 'public';

/**
 * Asset trees to copy.
 *
 * DELIBERATELY EXCLUDED (blueprint §3.1, contract §3.1):
 *   cc/   — CCAvenue kit with hardcoded live payment credentials (R-2, D-02)
 *   old/  — previous site version incl. a downloadable DB dump (R-2, D-02, D-08)
 * Both are confirmed not-ported. Copying them would carry the exposure
 * forward into the new deployment.
 *
 * patientrecord/ is excluded per D-01 (APPROVED: keep on the PHP host).
 */
const ASSET_TREES = [
  { src: 'assets', dest: 'assets', desc: 'Public theme (css/js/fonts/images/plugins)' },
  { src: 'admin-assets', dest: 'admin-assets', desc: 'AdminLTE 2 admin theme' },
  { src: 'uploaded_files', dest: 'uploaded_files', desc: 'All user/admin uploads' },
  { src: 'Dandruff', dest: 'Dandruff', desc: 'SEO microsite (blueprint §3.4)' },
  { src: 'hair-dandruff', dest: 'hair-dandruff', desc: 'SEO microsite (blueprint §3.4)' },
  { src: 'enlarged-prostate', dest: 'enlarged-prostate', desc: 'SEO microsite (blueprint §3.4)' },
  { src: 'record', dest: 'record', desc: 'Static patient-record mockups (blueprint §3.4)' },
] as const;

/** Individual files at the public root. */
const ASSET_FILES = [
  'robots.txt',
  'catalogue-list.pdf',
  'Mother-Tincture-Price-list.pdf',
  'Potencies-rate-list.pdf',
] as const;

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

async function walk(dir: string, base: string, out: string[] = []): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, base, out);
    } else if (entry.isFile()) {
      out.push(relative(base, full));
    }
  }
  return out;
}

async function main(): Promise<void> {
  console.log(`Asset migration baseline`);
  console.log(`  source : ${LARAVEL_PUBLIC}`);
  console.log(`  dest   : ${DEST_PUBLIC}\n`);

  const manifest: {
    generatedAt: string;
    source: string;
    destination: string;
    trees: Array<{ name: string; desc: string; files: number; bytes: number }>;
    files: FileEntry[];
    verification: {
      filesCopied: number;
      filesVerified: number;
      mismatches: Array<{ path: string; sourceSha: string; destSha: string }>;
      missing: string[];
      totalBytes: number;
      integrityPassed: boolean;
    };
    excluded: Array<{ path: string; reason: string }>;
  } = {
    generatedAt: new Date().toISOString(),
    source: LARAVEL_PUBLIC,
    destination: DEST_PUBLIC,
    trees: [],
    files: [],
    verification: {
      filesCopied: 0,
      filesVerified: 0,
      mismatches: [],
      missing: [],
      totalBytes: 0,
      integrityPassed: false,
    },
    excluded: [
      { path: 'cc/', reason: 'R-2/D-02: hardcoded live CCAvenue credentials — not ported' },
      {
        path: 'old/',
        reason: 'R-2/D-02/D-08: previous site incl. downloadable DB dump — not ported',
      },
      { path: 'patientrecord/', reason: 'D-01 (APPROVED): CodeIgniter app stays on the PHP host' },
      { path: 'index.php', reason: 'Laravel front controller — replaced by Next.js' },
      { path: 'web.config', reason: 'IIS config, unused' },
      { path: 'error_log', reason: 'Server artifact' },
      { path: 'pramod.php', reason: 'Stray artifact' },
      { path: 'storage', reason: 'Symlink to storage/app/public' },
      { path: 'patientrecord.zip', reason: 'Archive of the excluded CodeIgniter app' },
    ],
  };

  // ---- directory trees ----
  for (const tree of ASSET_TREES) {
    const srcDir = join(LARAVEL_PUBLIC, tree.src);
    const destDir = join(DEST_PUBLIC, tree.dest);

    let exists = true;
    try {
      await stat(srcDir);
    } catch {
      exists = false;
    }
    if (!exists) {
      console.log(`  ⚠ ${tree.src} — not present in source, skipped`);
      continue;
    }

    const relFiles = await walk(srcDir, srcDir);
    let treeBytes = 0;

    for (const rel of relFiles) {
      const srcPath = join(srcDir, rel);
      const destPath = join(destDir, rel);
      await mkdir(dirname(destPath), { recursive: true });
      await copyFile(srcPath, destPath);

      const info = await stat(srcPath);
      const sha = await hashFile(srcPath);
      treeBytes += info.size;

      manifest.files.push({
        path: `${tree.dest}/${rel}`.replace(/\\/g, '/'),
        bytes: info.size,
        sha256: sha,
      });
      manifest.verification.filesCopied++;
    }

    manifest.trees.push({
      name: tree.dest,
      desc: tree.desc,
      files: relFiles.length,
      bytes: treeBytes,
    });
    manifest.verification.totalBytes += treeBytes;
    console.log(
      `  ✓ ${tree.dest.padEnd(20)} ${String(relFiles.length).padStart(5)} files  ${(treeBytes / 1048576).toFixed(1)} MB`
    );
  }

  // ---- individual root files ----
  for (const file of ASSET_FILES) {
    const srcPath = join(LARAVEL_PUBLIC, file);
    try {
      await stat(srcPath);
    } catch {
      console.log(`  ⚠ ${file} — not present, skipped`);
      continue;
    }
    const destPath = join(DEST_PUBLIC, file);
    await copyFile(srcPath, destPath);
    const info = await stat(srcPath);
    const sha = await hashFile(srcPath);
    manifest.files.push({ path: file, bytes: info.size, sha256: sha });
    manifest.verification.filesCopied++;
    manifest.verification.totalBytes += info.size;
    console.log(`  ✓ ${file.padEnd(20)} ${(info.size / 1024).toFixed(0)} KB`);
  }

  // ---- verify: re-hash every destination file and compare ----
  console.log(`\nVerifying integrity of ${manifest.files.length} files...`);
  for (const entry of manifest.files) {
    const destPath = join(DEST_PUBLIC, entry.path);
    try {
      const destSha = await hashFile(destPath);
      if (destSha !== entry.sha256) {
        manifest.verification.mismatches.push({
          path: entry.path,
          sourceSha: entry.sha256,
          destSha,
        });
      } else {
        manifest.verification.filesVerified++;
      }
    } catch {
      manifest.verification.missing.push(entry.path);
    }
  }

  manifest.verification.integrityPassed =
    manifest.verification.mismatches.length === 0 &&
    manifest.verification.missing.length === 0 &&
    manifest.verification.filesVerified === manifest.verification.filesCopied;

  manifest.files.sort((a, b) => a.path.localeCompare(b.path));

  await writeFile('asset-manifest.json', JSON.stringify(manifest, null, 2), 'utf8');

  // Plain checksum file, verifiable with `sha256sum -c` from public/.
  const checksums = manifest.files.map((f) => `${f.sha256}  ${f.path}`).join('\n') + '\n';
  await writeFile('asset-checksums.sha256', checksums, 'utf8');

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Files copied    : ${manifest.verification.filesCopied}`);
  console.log(`Files verified  : ${manifest.verification.filesVerified}`);
  console.log(`Mismatches      : ${manifest.verification.mismatches.length}`);
  console.log(`Missing         : ${manifest.verification.missing.length}`);
  console.log(`Total size      : ${(manifest.verification.totalBytes / 1048576).toFixed(1)} MB`);
  console.log(`INTEGRITY       : ${manifest.verification.integrityPassed ? 'PASSED' : 'FAILED'}`);
  console.log(`\nManifest  : asset-manifest.json`);
  console.log(`Checksums : asset-checksums.sha256`);

  if (!manifest.verification.integrityPassed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
