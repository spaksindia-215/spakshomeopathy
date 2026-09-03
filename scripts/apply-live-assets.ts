/**
 * OI-12 OPTION 1 — apply audited production assets into public/.
 *
 * Copies ONLY the files the audit proved differ from (or are missing in) the
 * shipped copy, taking the bytes from .audit-cache/ — i.e. exactly what
 * production served at audit time. Re-verifies each write by SHA-256.
 *
 * CONTRACT BASIS
 * --------------
 * Owner decision 2026-08-10: OI-12 resolved as OPTION 1 (re-source from live,
 *   full audit). This script performs the approved re-sourcing; the audit
 *   (audit-live-assets.ts) is its evidence, and docs/evidence/asset-audit-live.json
 *   is the permanent record of every byte changed.
 * Part 3 rank 6: observed production governs where the stale backup conflicts.
 * F-30: assets are still shipped UNCHANGED — unchanged relative to PRODUCTION,
 *   which is the reference this decision selects. Nothing is edited, minified,
 *   reformatted or optimized; bytes are copied verbatim.
 * NN-10 / G-2: nothing is ever deleted. This script only writes.
 *
 * SAFETY
 *   - Dry-run by default. Pass --apply to write.
 *   - Every replaced file is backed up to .asset-backup/<timestamp>/ first,
 *     so the pre-change state is always recoverable.
 *   - Never touches the Laravel source tree.
 *
 * USAGE
 *   npx tsx scripts/apply-live-assets.ts            # dry run
 *   npx tsx scripts/apply-live-assets.ts --apply    # write
 */

import { createHash } from 'crypto';
import { readFile, writeFile, mkdir, copyFile, access } from 'fs/promises';
import { join, dirname } from 'path';

const DEST_PUBLIC = process.env.DEST_PUBLIC ?? 'public';
const CACHE_DIR = process.env.AUDIT_CACHE ?? '.audit-cache';
const AUDIT_REPORT = process.env.AUDIT_REPORT ?? 'docs/evidence/asset-audit-live.json';
const BACKUP_ROOT = process.env.ASSET_BACKUP ?? '.asset-backup';

const APPLY = process.argv.includes('--apply');

interface Row {
  path: string;
  status: string;
  localBytes: number | null;
  remoteBytes: number | null;
  localSha: string | null;
  remoteSha: string | null;
}

const sha = (b: Buffer): string => createHash('sha256').update(b).digest('hex');

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const { rows } = JSON.parse(await readFile(AUDIT_REPORT, 'utf8')) as { rows: Row[] };

  // Only these two classes are actionable. Production-side 404s (FETCH_ERROR)
  // are PRESERVED broken references — production's own dead links. Repairing
  // them would violate NN-4/IR-9 and break V-14 parity.
  const actionable = rows.filter((r) => r.status === 'DRIFTED' || r.status === 'MISSING_LOCAL');

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = join(BACKUP_ROOT, stamp);

  console.log(`OI-12 Option 1 — apply audited production assets`);
  console.log(`  mode   : ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'}`);
  console.log(`  source : ${CACHE_DIR} (bytes as served by production at audit time)`);
  console.log(`  dest   : ${DEST_PUBLIC}`);
  if (APPLY) console.log(`  backup : ${backupDir}`);
  console.log(`  files  : ${actionable.length}\n`);

  if (!actionable.length) {
    console.log('Nothing to do — shipped assets already match production.');
    return;
  }

  let written = 0;
  const failures: string[] = [];

  for (const row of actionable) {
    const cachePath = join(CACHE_DIR, row.path);
    const destPath = join(DEST_PUBLIC, row.path);

    if (!(await exists(cachePath))) {
      failures.push(`${row.path} — absent from audit cache; re-run the audit`);
      continue;
    }

    const buf = await readFile(cachePath);
    const gotSha = sha(buf);

    // The cached bytes must still match what the audit recorded, or the audit
    // and the apply step are describing different files.
    if (row.remoteSha && gotSha !== row.remoteSha) {
      failures.push(`${row.path} — cache SHA ≠ audit SHA; re-run the audit`);
      continue;
    }

    const delta =
      row.localBytes !== null && row.remoteBytes !== null
        ? `${row.localBytes} → ${row.remoteBytes} (${row.remoteBytes - row.localBytes >= 0 ? '+' : ''}${row.remoteBytes - row.localBytes} bytes)`
        : `new file, ${buf.length} bytes`;

    console.log(`  ${row.status === 'DRIFTED' ? 'UPDATE ' : 'ADD    '} ${row.path}`);
    console.log(`          ${delta}`);

    if (!APPLY) continue;

    // Back up the current file before overwriting it (never delete: NN-10).
    if (await exists(destPath)) {
      const bak = join(backupDir, row.path);
      await mkdir(dirname(bak), { recursive: true });
      await copyFile(destPath, bak);
    }

    await mkdir(dirname(destPath), { recursive: true });
    await writeFile(destPath, buf);

    const readBack = sha(await readFile(destPath));
    if (readBack !== gotSha) {
      failures.push(`${row.path} — write verification FAILED`);
      continue;
    }
    written++;
  }

  console.log(`\n${'='.repeat(64)}`);
  if (APPLY) {
    console.log(`Written & verified : ${written} / ${actionable.length}`);
    console.log(`Backup of previous : ${backupDir}`);
  } else {
    console.log(`Would write        : ${actionable.length} file(s)`);
    console.log(`\nRe-run with --apply to write.`);
  }

  if (failures.length) {
    console.log(`\nFAILURES (${failures.length}):`);
    for (const f of failures) console.log(`  ${f}`);
    process.exit(1);
  }

  if (APPLY) {
    console.log(`\nNEXT: regenerate the manifest so integrity checks track the new bytes:`);
    console.log(`  npx tsx scripts/rebuild-asset-manifest.ts`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
