/**
 * OI-12 FULL ASSET AUDIT — live production vs shipped copy.
 *
 * Fetches every same-origin asset referenced by the M0 production baseline
 * captures and compares it, byte-for-byte, against the file currently shipped
 * in public/. Produces a drift report. READ-ONLY: writes nothing into public/.
 *
 * CONTRACT BASIS
 * --------------
 * Part 3 rank 6: observed production behavior governs runtime reality. The M0
 *   asset copy is checksum-perfect against the LOCAL BACKUP, but §13.4 proved
 *   the backup is stale AND divergent (6 modified rules, not merely additive),
 *   so the backup is not what production serves.
 * Owner decision 2026-08-10: OI-12 resolved as OPTION 1 — re-source assets from
 *   live production, with a FULL audit. This script is that audit's evidence.
 * F-30: no asset is edited. Files are fetched and compared only; any
 *   replacement is a separate, explicit step (apply-live-assets.ts).
 * S-6: every asset checksum-verified at an unchanged URL.
 *
 * USAGE
 *   npx tsx scripts/audit-live-assets.ts
 *   PROD_ORIGIN=https://spakshomeopathy.com npx tsx scripts/audit-live-assets.ts
 */

import { createHash } from 'crypto';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { setTimeout as sleep } from 'timers/promises';

const PROD_ORIGIN = process.env.PROD_ORIGIN ?? 'https://spakshomeopathy.com';
const DEST_PUBLIC = process.env.DEST_PUBLIC ?? 'public';
const OUT_DIR = process.env.AUDIT_OUT ?? 'docs/evidence';
const CACHE_DIR = process.env.AUDIT_CACHE ?? '.audit-cache';
const CONCURRENCY = Number(process.env.AUDIT_CONCURRENCY ?? 6);

/** Assets referenced by production pages, harvested from the M0 baseline. */
const REFERENCED_LIST = process.env.AUDIT_LIST ?? 'docs/evidence/referenced-assets.txt';

type Status = 'IDENTICAL' | 'DRIFTED' | 'MISSING_LOCAL' | 'MISSING_REMOTE' | 'FETCH_ERROR';

interface Row {
  path: string;
  status: Status;
  localBytes: number | null;
  remoteBytes: number | null;
  localSha: string | null;
  remoteSha: string | null;
  lastModified: string | null;
  note?: string;
}

const sha = (b: Buffer): string => createHash('sha256').update(b).digest('hex');

/**
 * Normalize a referenced URL to a public/-relative path, or null to skip.
 *
 * The harvester emits ABSOLUTE URLs already resolved against their referencing
 * page, which is what makes the legacy microsites' relative refs
 * ("assets/js/main.js" under /Dandruff/) land on the right path.
 */
function toRelPath(raw: string): string | null {
  const u0 = raw.trim();
  if (!u0 || u0.startsWith('data:') || u0.startsWith('#')) return null;

  let pathname: string;
  try {
    pathname = new URL(u0, PROD_ORIGIN).pathname;
  } catch {
    return null;
  }

  // The Laravel app serves the same tree at /x and /public/x (R-28).
  pathname = pathname.replace(/^\/public\//, '/');
  if (pathname === '/' || pathname.endsWith('/')) return null;
  if (!/\.(css|js|png|jpe?g|gif|svg|webp|woff2?|ttf|eot|ico|pdf|mp4)$/i.test(pathname)) return null;

  return decodeURIComponent(pathname.slice(1));
}

async function fetchAsset(
  rel: string
): Promise<{ buf: Buffer | null; lastModified: string | null; code: number }> {
  const url = `${PROD_ORIGIN}/${rel.split('/').map(encodeURIComponent).join('/')}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        headers: { 'User-Agent': 'spaks-migration-asset-audit/1.0' },
      });
      if (res.status === 404) return { buf: null, lastModified: null, code: 404 };
      if (!res.ok) {
        if (attempt === 2) return { buf: null, lastModified: null, code: res.status };
        await sleep(400 * (attempt + 1));
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      return { buf, lastModified: res.headers.get('last-modified'), code: res.status };
    } catch {
      if (attempt === 2) return { buf: null, lastModified: null, code: 0 };
      await sleep(400 * (attempt + 1));
    }
  }
  return { buf: null, lastModified: null, code: 0 };
}

async function main(): Promise<void> {
  const listRaw = await readFile(REFERENCED_LIST, 'utf8');
  const paths = Array.from(
    new Set(
      listRaw
        .split('\n')
        .map(toRelPath)
        .filter((p): p is string => p !== null)
    )
  ).sort();

  console.log(`OI-12 full asset audit`);
  console.log(`  origin : ${PROD_ORIGIN}`);
  console.log(`  local  : ${DEST_PUBLIC}`);
  console.log(`  assets : ${paths.length}\n`);

  const rows: Row[] = [];
  let done = 0;

  async function worker(queue: string[]): Promise<void> {
    for (;;) {
      const rel = queue.pop();
      if (!rel) return;

      let localBuf: Buffer | null = null;
      try {
        localBuf = await readFile(join(DEST_PUBLIC, rel));
      } catch {
        localBuf = null;
      }

      const { buf: remoteBuf, lastModified, code } = await fetchAsset(rel);

      let status: Status;
      let note: string | undefined;
      if (!remoteBuf && !localBuf) {
        status = 'FETCH_ERROR';
        note = `local absent; remote HTTP ${code}`;
      } else if (!remoteBuf) {
        status = code === 404 ? 'MISSING_REMOTE' : 'FETCH_ERROR';
        note = `remote HTTP ${code}`;
      } else if (!localBuf) {
        status = 'MISSING_LOCAL';
      } else {
        status = sha(localBuf) === sha(remoteBuf) ? 'IDENTICAL' : 'DRIFTED';
      }

      if (remoteBuf) {
        const cachePath = join(CACHE_DIR, rel);
        await mkdir(dirname(cachePath), { recursive: true });
        await writeFile(cachePath, remoteBuf);
      }

      rows.push({
        path: rel,
        status,
        localBytes: localBuf?.length ?? null,
        remoteBytes: remoteBuf?.length ?? null,
        localSha: localBuf ? sha(localBuf) : null,
        remoteSha: remoteBuf ? sha(remoteBuf) : null,
        lastModified,
        note,
      });

      done++;
      if (done % 20 === 0) console.log(`  ...${done}/${paths.length}`);
    }
  }

  const queue = [...paths];
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)));
  rows.sort((a, b) => a.path.localeCompare(b.path));

  const by = (s: Status): Row[] => rows.filter((r) => r.status === s);
  const summary = {
    generatedAt: new Date().toISOString(),
    origin: PROD_ORIGIN,
    audited: rows.length,
    identical: by('IDENTICAL').length,
    drifted: by('DRIFTED').length,
    missingLocal: by('MISSING_LOCAL').length,
    missingRemote: by('MISSING_REMOTE').length,
    fetchError: by('FETCH_ERROR').length,
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(
    join(OUT_DIR, 'asset-audit-live.json'),
    JSON.stringify({ summary, rows }, null, 2),
    'utf8'
  );

  console.log(`\n${'='.repeat(64)}`);
  console.log(`Audited        : ${summary.audited}`);
  console.log(`Identical      : ${summary.identical}`);
  console.log(`DRIFTED        : ${summary.drifted}`);
  console.log(`Missing local  : ${summary.missingLocal}`);
  console.log(`Missing remote : ${summary.missingRemote}`);
  console.log(`Fetch errors   : ${summary.fetchError}`);

  for (const label of ['DRIFTED', 'MISSING_LOCAL', 'MISSING_REMOTE', 'FETCH_ERROR'] as const) {
    const list = by(label);
    if (!list.length) continue;
    console.log(`\n--- ${label} (${list.length}) ---`);
    for (const r of list.slice(0, 60)) {
      const d =
        r.localBytes !== null && r.remoteBytes !== null
          ? ` ${r.localBytes} → ${r.remoteBytes} bytes (${r.remoteBytes - r.localBytes >= 0 ? '+' : ''}${r.remoteBytes - r.localBytes})`
          : '';
      console.log(`  ${r.path}${d}${r.note ? `  [${r.note}]` : ''}`);
    }
  }

  console.log(`\nReport : ${join(OUT_DIR, 'asset-audit-live.json')}`);
  console.log(`Cache  : ${CACHE_DIR}/ (fetched production bytes, for review)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
