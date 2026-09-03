/**
 * Harvest every asset URL referenced by the M0 production baseline captures.
 *
 * Input  : baseline/raw-html/*.raw.html  (35 captures of the LIVE Laravel site)
 *          baseline/manifest.json        (capture path → source URL mapping)
 * Output : docs/evidence/referenced-assets.txt
 *
 * RELATIVE URL RESOLUTION (important)
 * ----------------------------------
 * The legacy microsites (/Dandruff/, /hair-dandruff/, /enlarged-prostate/,
 * /record/) are raw-PHP/HTML pages that reference their assets RELATIVELY
 * ("assets/js/main.js"). Those resolve against the referencing page's own
 * directory, NOT the site root: /Dandruff/assets/js/main.js — verified 200,
 * whereas /assets/js/main.js is a 404. Resolving them against the root is
 * therefore wrong and manufactures ~59 phantom "missing" assets.
 * Each URL is resolved against its capture's real production URL.
 *
 * These captures are production's own HTML, so the URLs harvested here are
 * exactly the assets production tells a browser to load — the correct audit
 * surface for OI-12 (contract Part 3 rank 6: observed production governs).
 *
 * Also emits the external/third-party hosts separately: they are NOT ours to
 * ship, but V-14 (network request parity) requires the new app to make the
 * same third-party requests, so they must stay visible and auditable.
 *
 * USAGE
 *   npx tsx scripts/harvest-referenced-assets.ts
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const BASELINE_HTML = process.env.BASELINE_HTML ?? 'baseline/raw-html';
const BASELINE_MANIFEST = process.env.BASELINE_MANIFEST ?? 'baseline/manifest.json';
const OUT_DIR = process.env.AUDIT_OUT ?? 'docs/evidence';

const ASSET_RE = /\.(css|js|png|jpe?g|gif|svg|webp|woff2?|ttf|eot|ico|pdf|mp4)(\?|#|$)/i;
const SAME_ORIGIN_RE = /^https?:\/\/(www\.)?spakshomeopathy\.com/i;

function isExternal(u: string): boolean {
  return /^https?:\/\//i.test(u) && !SAME_ORIGIN_RE.test(u);
}

interface CaptureResult {
  id: string;
  finalUrl?: string;
  path?: string;
}

async function main(): Promise<void> {
  const files = (await readdir(BASELINE_HTML)).filter((f) => f.endsWith('.raw.html'));

  // id -> the page's real production URL, so relative refs resolve correctly.
  const manifest = JSON.parse(await readFile(BASELINE_MANIFEST, 'utf8')) as {
    target: string;
    results: CaptureResult[];
  };
  const baseById = new Map<string, string>();
  for (const r of manifest.results) {
    baseById.set(r.id, r.finalUrl ?? new URL(r.path ?? '/', manifest.target).toString());
  }

  const same = new Map<string, number>();
  const external = new Map<string, number>();
  const unresolved: string[] = [];

  for (const f of files) {
    const id = f.replace(/\.(guest|buyer|admin)\.raw\.html$/, '');
    const pageUrl = baseById.get(id);
    if (!pageUrl) {
      unresolved.push(f);
      continue;
    }

    const html = await readFile(join(BASELINE_HTML, f), 'utf8');
    const found = new Set<string>();

    for (const m of html.matchAll(/(?:href|src|data-src)\s*=\s*["']([^"']+)["']/gi)) {
      if (m[1]) found.add(m[1]);
    }
    for (const m of html.matchAll(/url\(\s*["']?([^)"']+)["']?\s*\)/gi)) {
      if (m[1]) found.add(m[1]);
    }

    for (const raw of found) {
      const u = raw.trim();
      if (!u || u.startsWith('data:') || u.startsWith('#') || u.startsWith('javascript:')) continue;
      if (!ASSET_RE.test(u)) continue;

      // Resolve against the REFERENCING PAGE, not the site root.
      let abs: string;
      try {
        abs = new URL(u, pageUrl).toString();
      } catch {
        continue;
      }

      const bucket = isExternal(abs) ? external : same;
      bucket.set(abs, (bucket.get(abs) ?? 0) + 1);
    }
  }

  if (unresolved.length) {
    console.log(`⚠ ${unresolved.length} capture(s) had no manifest entry and were SKIPPED:`);
    for (const f of unresolved) console.log(`    ${f}`);
  }

  await mkdir(OUT_DIR, { recursive: true });

  const sameSorted = [...same.keys()].sort();
  await writeFile(join(OUT_DIR, 'referenced-assets.txt'), sameSorted.join('\n') + '\n', 'utf8');

  const extLines = [...external.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([u, n]) => `${String(n).padStart(4)}  ${u}`);
  await writeFile(
    join(OUT_DIR, 'referenced-assets-external.txt'),
    `# Third-party assets referenced by production.\n` +
      `# NOT shipped by us. Listed because V-14 requires the new app to make the\n` +
      `# SAME third-party requests (see P-13/R-14 hot-linking).\n\n` +
      extLines.join('\n') +
      '\n',
    'utf8'
  );

  console.log(`Baseline captures scanned : ${files.length}`);
  console.log(`Same-origin assets        : ${sameSorted.length}`);
  console.log(`External assets           : ${external.size}`);
  console.log(`\nWrote ${join(OUT_DIR, 'referenced-assets.txt')}`);
  console.log(`Wrote ${join(OUT_DIR, 'referenced-assets-external.txt')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
