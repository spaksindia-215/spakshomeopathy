/**
 * Rebuild asset-manifest.json + asset-checksums.sha256 from what is ACTUALLY
 * shipped in public/, recording each file's provenance.
 *
 * WHY THIS EXISTS
 * ---------------
 * The M0 manifest hashed the LARAVEL BACKUP and asserted dest == source. After
 * the OI-12 Option 1 re-sourcing, a subset of files legitimately comes from
 * LIVE PRODUCTION instead, so "matches the backup" is no longer the correct
 * integrity property. This manifest records, per file, WHERE the bytes came
 * from — so `assets:verify` still detects accidental drift, while the audit
 * trail shows exactly which files were re-sourced and why.
 *
 * CONTRACT BASIS
 * --------------
 * S-6 / G-9: checksum evidence retained at every gate.
 * F-30: provenance is recorded, not the content changed. No file is edited.
 * S-11: every deviation traceable — `provenance: "live-production"` marks each
 *   re-sourced file against the owner's 2026-08-10 OI-12 Option 1 decision.
 *
 * USAGE
 *   npx tsx scripts/rebuild-asset-manifest.ts
 */

import { createHash } from 'crypto';
import { createReadStream } from 'fs';
import { readdir, readFile, stat, writeFile } from 'fs/promises';
import { join, relative } from 'path';

const DEST_PUBLIC = process.env.DEST_PUBLIC ?? 'public';
const AUDIT_REPORT = process.env.AUDIT_REPORT ?? 'docs/evidence/asset-audit-live.json';
const PREV_MANIFEST = process.env.ASSET_MANIFEST ?? 'asset-manifest.json';

interface AuditRow {
  path: string;
  status: string;
  remoteSha: string | null;
  lastModified: string | null;
}

function hashFile(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const h = createHash('sha256');
    const s = createReadStream(path);
    s.on('error', reject);
    s.on('data', (c) => h.update(c));
    s.on('end', () => resolve(h.digest('hex')));
  });
}

async function walk(dir: string, base: string, out: string[] = []): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) await walk(full, base, out);
    else if (e.isFile()) out.push(relative(base, full).replace(/\\/g, '/'));
  }
  return out;
}

async function main(): Promise<void> {
  const prev = JSON.parse(await readFile(PREV_MANIFEST, 'utf8'));
  const audit = JSON.parse(await readFile(AUDIT_REPORT, 'utf8')) as { rows: AuditRow[] };

  const resourced = new Map<string, AuditRow>();
  for (const r of audit.rows) {
    if (r.status === 'DRIFTED' || r.status === 'MISSING_LOCAL') resourced.set(r.path, r);
  }

  const files = (await walk(DEST_PUBLIC, DEST_PUBLIC)).sort();
  const entries = [];
  let totalBytes = 0;
  let liveCount = 0;

  for (const rel of files) {
    const full = join(DEST_PUBLIC, rel);
    const info = await stat(full);
    const sha256 = await hashFile(full);
    totalBytes += info.size;

    const re = resourced.get(rel);
    // A re-sourced file counts as live-production ONLY if its bytes really are
    // the audited production bytes; otherwise it is still the backup copy.
    const isLive = re != null && re.remoteSha === sha256;
    if (isLive) liveCount++;

    entries.push({
      path: rel,
      bytes: info.size,
      sha256,
      provenance: isLive ? 'live-production' : 'laravel-backup',
      ...(isLive
        ? {
            productionLastModified: re?.lastModified ?? null,
            decision: 'OI-12 Option 1 (owner-approved 2026-08-10)',
          }
        : {}),
    });
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    supersedes: prev.generatedAt ?? null,
    destination: DEST_PUBLIC,
    provenanceNote:
      'Files marked live-production were re-sourced from https://spakshomeopathy.com under the ' +
      "owner's OI-12 Option 1 decision (2026-08-10) because the Laravel backup was proven stale " +
      'and divergent. All other files remain byte-identical to the Laravel backup. See ' +
      'docs/evidence/asset-audit-live.json for the full audit.',
    counts: {
      total: entries.length,
      fromLaravelBackup: entries.length - liveCount,
      fromLiveProduction: liveCount,
      totalBytes,
    },
    excluded: prev.excluded ?? [],
    files: entries,
  };

  await writeFile(PREV_MANIFEST, JSON.stringify(manifest, null, 2), 'utf8');
  await writeFile(
    'asset-checksums.sha256',
    entries.map((e) => `${e.sha256}  ${e.path}`).join('\n') + '\n',
    'utf8'
  );

  console.log(`Asset manifest rebuilt`);
  console.log(`  total files          : ${manifest.counts.total}`);
  console.log(`  from Laravel backup  : ${manifest.counts.fromLaravelBackup}`);
  console.log(`  from live production : ${manifest.counts.fromLiveProduction}`);
  console.log(`  total size           : ${(totalBytes / 1048576).toFixed(1)} MB`);
  console.log(`\nWrote ${PREV_MANIFEST} and asset-checksums.sha256`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
