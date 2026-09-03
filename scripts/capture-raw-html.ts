/**
 * Raw (pre-JavaScript) server HTML capture — Milestone 0/1 correction, contract T-1.
 *
 * WHY THIS EXISTS
 * ----------------
 * `capture-baseline.ts` uses Playwright's `page.content()` after `waitUntil: 'load'`
 * plus a settle delay. That records the POST-JavaScript DOM: Google Translate's
 * injected <select>, bxSlider's runtime-cloned slide list, a JS-duplicated sticky
 * <nav>, etc. That capture is the correct baseline for V-02/V-13/V-14 (visual,
 * console, network — what a browser actually shows/does).
 *
 * It is the WRONG baseline for D1 structural comparison (contract §7.1, NN-5):
 * "Rendered DOM must match" means the DOM Laravel's Blade templates emit
 * server-side, not the DOM after third-party JS has mutated it. React server
 * components must byte-match the SERVER markup; the same unmodified JS
 * (bxSlider, Google Translate, sticky-nav script) then runs against it exactly
 * as it does today. Diffing React's output against a post-JS snapshot would
 * either wrongly fail (React doesn't natively pre-render Google Translate's
 * injected markup) or wrongly pass (masking a real server-markup mismatch
 * such as the header's search form / My-Account submenu being commented out
 * server-side in production, discovered via manual curl during M1).
 *
 * This script fetches raw HTML with no browser and no JS execution — exactly
 * what `curl` or Laravel's own response body contains.
 *
 * READS the live Laravel application. WRITES to baseline/raw-html/.
 * GET requests only; reuses the same guarded route list as capture-baseline.ts.
 *
 * USAGE
 *   npm run baseline:capture-raw
 */

import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';
import { routesForRole } from './routes';
import { normalizeHtml } from './capture-baseline';

const BASELINE_BASE_URL = process.env.BASELINE_BASE_URL ?? 'https://spakshomeopathy.com';
const OUT_DIR = join(process.env.BASELINE_DIR ?? 'baseline', 'raw-html');

function assertSafeTarget(url: string): void {
  const host = new URL(url).hostname;
  const allowed = ['spakshomeopathy.com', 'www.spakshomeopathy.com'];
  if (!allowed.includes(host)) {
    throw new Error(
      `REFUSING TO CAPTURE from "${host}". Raw-HTML capture may only read the ` +
        `live Laravel application (${allowed.join(', ')}).`
    );
  }
}

function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

interface RawResult {
  id: string;
  path: string;
  status: number | null;
  finalUrl: string;
  redirected: boolean;
  htmlSha256: string;
  normalizedSha256: string;
  htmlBytes: number;
  contentType: string | null;
  error?: string;
}

async function captureOne(path: string, id: string): Promise<RawResult> {
  const url = new URL(path, BASELINE_BASE_URL).toString();
  const result: RawResult = {
    id,
    path,
    status: null,
    finalUrl: url,
    redirected: false,
    htmlSha256: '',
    normalizedSha256: '',
    htmlBytes: 0,
    contentType: null,
  };

  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        // A plain UA — this must be what Laravel serves to any client,
        // not a browser-specific variant.
        'User-Agent': 'Mozilla/5.0 (compatible; SpaksMigrationBaseline/1.0)',
      },
    });
    result.status = res.status;
    result.finalUrl = res.url;
    result.redirected = res.redirected;
    result.contentType = res.headers.get('content-type');

    const html = await res.text();
    result.htmlSha256 = sha256(html);
    result.htmlBytes = Buffer.byteLength(html, 'utf8');
    const normalized = normalizeHtml(html);
    result.normalizedSha256 = sha256(normalized);

    await writeFile(join(OUT_DIR, `${id}.guest.raw.html`), html, 'utf8');
    await writeFile(join(OUT_DIR, `${id}.guest.raw.normalized.html`), normalized, 'utf8');
  } catch (err) {
    result.error = String(err).split('\n')[0]?.slice(0, 300) ?? 'unknown error';
  }

  return result;
}

async function main(): Promise<void> {
  assertSafeTarget(BASELINE_BASE_URL);
  await mkdir(OUT_DIR, { recursive: true });

  console.log(`Raw (pre-JS) HTML capture`);
  console.log(`  target : ${BASELINE_BASE_URL}`);
  console.log(`  output : ${OUT_DIR}/`);
  console.log(`  mode   : READ-ONLY (GET, no browser, no JS execution)\n`);

  // Guest routes only — this corrects the M1 header/footer/static-page
  // source. Buyer/admin raw capture remains blocked on OI-1a/OI-1b, same
  // as the existing Playwright baseline.
  const routes = routesForRole('guest');
  const results: RawResult[] = [];

  for (const route of routes) {
    const r = await captureOne(route.path, route.id);
    results.push(r);
    console.log(
      `  ${r.error ? '✗' : '✓'} ${String(r.status ?? 'ERR').padEnd(3)} ${route.path}` +
        `${r.error ? ` — ${r.error}` : ''}`
    );
  }

  const manifest = {
    capturedAt: new Date().toISOString(),
    target: BASELINE_BASE_URL,
    method: 'fetch (no browser, no JS execution)',
    purpose:
      'D1 structural-comparison source of truth. Supersedes capture-baseline.ts ' +
      'post-JS HTML for server-markup porting; that capture remains authoritative ' +
      'for V-02/V-13/V-14.',
    capturedRoutes: results.length,
    results,
  };
  await writeFile(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  const failed = results.filter((r) => r.error).length;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Captured : ${results.length}  (errors: ${failed})`);
  console.log(`Manifest : ${join(OUT_DIR, 'manifest.json')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
