/**
 * M1 verification capture — closes Outstanding Issue OI-8 from
 * docs/GATE-REPORT-M1.md (console/network portion; V-02 screenshot
 * comparison is a separate Playwright spec — see
 * tests/e2e/m1-screenshots.spec.ts).
 *
 * Captures console messages (V-13) and network requests (V-14) from the
 * LOCAL NEXT.JS BUILD for every M1-scope guest route, then diffs both
 * against the production `baseline/` captured in Milestone 0.
 *
 * SAFETY: this is the "VERIFY" mode described in playwright.config.ts —
 * it targets BASE_URL (default http://localhost:3000), never the live
 * Laravel site, and it never writes into baseline/ (only into
 * verify/m1/). A guard below refuses to run if BASE_URL looks like the
 * production domain.
 *
 * USAGE
 *   npm run build && npm run start &   # in one terminal
 *   npm run verify:m1                  # in another
 */

import { chromium, type Page } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { join } from 'path';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const BASELINE_DIR = 'baseline';
const OUT_DIR = 'verify/m1';

// The 9 routes actually built in M1. Kept separate from routes.ts's full
// inventory (which includes many routes not yet implemented) so this
// script only asserts about pages that exist.
const M1_ROUTES: Array<{ id: string; path: string }> = [
  { id: 'about', path: '/about' },
  { id: 'contact', path: '/contact' },
  { id: 'terms', path: '/terms' },
  { id: 'privacy-policy', path: '/privacy-policy' },
  { id: 'return-policy', path: '/return-policy' },
  { id: 'mother-tincture', path: '/mother-tincture' },
  { id: 'details', path: '/details' },
  { id: 'video', path: '/video' },
  { id: 'videos-broken', path: '/videos' },
];

function assertNotProduction(url: string): void {
  const host = new URL(url).hostname;
  if (host === 'spakshomeopathy.com' || host === 'www.spakshomeopathy.com') {
    throw new Error(
      `REFUSING TO RUN VERIFY against "${host}". This script targets the ` +
        `local Next.js build (BASE_URL), never the live Laravel site.`
    );
  }
}

interface RouteResult {
  id: string;
  path: string;
  status: number | null;
  consoleErrors: number;
  consoleWarnings: number;
  consoleMessages: Array<{ type: string; text: string }>;
  requestCount: number;
  failedRequests: number;
  requests: Array<{ method: string; url: string; status?: number; failed?: boolean }>;
  error?: string;
}

async function captureRoute(page: Page, route: { id: string; path: string }): Promise<RouteResult> {
  const consoleMessages: Array<{ type: string; text: string }> = [];
  const requests: Array<{ method: string; url: string; status?: number; failed?: boolean }> = [];

  const consoleHandler = (msg: import('@playwright/test').ConsoleMessage) => {
    consoleMessages.push({ type: msg.type(), text: msg.text().slice(0, 500) });
  };
  const failHandler = (req: import('@playwright/test').Request) => {
    requests.push({ method: req.method(), url: req.url(), failed: true });
  };
  const responseHandler = (res: import('@playwright/test').Response) => {
    requests.push({ method: res.request().method(), url: res.url(), status: res.status() });
  };

  page.on('console', consoleHandler);
  page.on('requestfailed', failHandler);
  page.on('response', responseHandler);

  const result: RouteResult = {
    id: route.id,
    path: route.path,
    status: null,
    consoleErrors: 0,
    consoleWarnings: 0,
    consoleMessages: [],
    requestCount: 0,
    failedRequests: 0,
    requests: [],
  };

  try {
    const url = new URL(route.path, BASE_URL).toString();
    const response = await page.goto(url, { waitUntil: 'load', timeout: 30_000 });
    result.status = response?.status() ?? null;
    await page.waitForTimeout(1500);

    result.consoleMessages = consoleMessages;
    result.consoleErrors = consoleMessages.filter((m) => m.type === 'error').length;
    result.consoleWarnings = consoleMessages.filter((m) => m.type === 'warning').length;
    result.requests = requests;
    result.requestCount = requests.length;
    result.failedRequests = requests.filter((r) => r.failed).length;
  } catch (err) {
    result.error = String(err).split('\n')[0]?.slice(0, 300) ?? 'unknown error';
  } finally {
    page.off('console', consoleHandler);
    page.off('requestfailed', failHandler);
    page.off('response', responseHandler);
  }

  return result;
}

/** Strips scheme+host so production vs. localhost URLs compare equal. */
function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

/** Hosts that are legitimately requested from both environments unchanged. */
function classifyHost(url: string): 'app' | 'third-party' {
  try {
    const host = new URL(url).hostname;
    if (
      host === 'localhost' ||
      host === 'spakshomeopathy.com' ||
      host === 'www.spakshomeopathy.com'
    ) {
      return 'app';
    }
    return 'third-party';
  } catch {
    return 'app';
  }
}

interface ConsoleDiff {
  id: string;
  baselineCount: number;
  verifyCount: number;
  newMessages: string[];
  missingMessages: string[];
}

interface NetworkDiff {
  id: string;
  baselineAppPathCount: number;
  verifyAppPathCount: number;
  missingFromVerify: string[];
  unexpectedInVerify: string[];
}

async function main(): Promise<void> {
  assertNotProduction(BASE_URL);
  await mkdir(OUT_DIR, { recursive: true });

  console.log(`M1 verification capture (console + network)`);
  console.log(`  target : ${BASE_URL}`);
  console.log(`  output : ${OUT_DIR}/`);
  console.log(`  routes : ${M1_ROUTES.length}\n`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    locale: 'en-US',
    timezoneId: 'Asia/Kolkata',
  });

  const results: RouteResult[] = [];
  for (const route of M1_ROUTES) {
    const page = await context.newPage();
    const r = await captureRoute(page, route);
    results.push(r);
    await page.close();
    console.log(
      `  ${r.error ? '✗' : '✓'} ${String(r.status ?? 'ERR').padEnd(3)} ${route.path}` +
        `  console(err=${r.consoleErrors},warn=${r.consoleWarnings})  requests=${r.requestCount}` +
        `${r.error ? ` — ${r.error}` : ''}`
    );
  }
  await context.close();
  await browser.close();

  // ---- Console diff vs. baseline ----
  console.log(`\n${'='.repeat(70)}\nCONSOLE DIFF (V-13)\n${'='.repeat(70)}`);
  const consoleDiffs: ConsoleDiff[] = [];
  for (const r of results) {
    const baselinePath = join(BASELINE_DIR, 'console', `${r.id}.guest.console.json`);
    let baseline: Array<{ type: string; text: string }> = [];
    try {
      baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
    } catch {
      console.log(`  ${r.id}: no baseline console file (skipped)`);
      continue;
    }
    const baseSet = new Set(baseline.map((m) => `${m.type}:${m.text}`));
    const verifySet = new Set(r.consoleMessages.map((m) => `${m.type}:${m.text}`));
    const newMessages = [...verifySet].filter((m) => !baseSet.has(m));
    const missingMessages = [...baseSet].filter((m) => !verifySet.has(m));
    const diff: ConsoleDiff = {
      id: r.id,
      baselineCount: baseline.length,
      verifyCount: r.consoleMessages.length,
      newMessages,
      missingMessages,
    };
    consoleDiffs.push(diff);
    const flag = newMessages.length > 0 ? '✗ NEW MESSAGES' : '✓';
    console.log(
      `  ${flag} ${r.id}: baseline=${baseline.length} verify=${r.consoleMessages.length}`
    );
    for (const m of newMessages) console.log(`      + ${m.slice(0, 140)}`);
    for (const m of missingMessages)
      console.log(`      - ${m.slice(0, 140)} (present in baseline, absent here)`);
  }

  // ---- Network diff vs. baseline ----
  console.log(`\n${'='.repeat(70)}\nNETWORK DIFF (V-14)\n${'='.repeat(70)}`);
  const networkDiffs: NetworkDiff[] = [];
  for (const r of results) {
    const baselinePath = join(BASELINE_DIR, 'network', `${r.id}.guest.network.json`);
    let baseline: Array<{ method: string; url: string; status?: number }> = [];
    try {
      baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
    } catch {
      console.log(`  ${r.id}: no baseline network file (skipped)`);
      continue;
    }
    // Compare same-app requests by path (host differs: localhost vs.
    // production). Third-party requests (CDN, Google Translate, YouTube,
    // hot-linked social icons) are compared by full URL — these must be
    // byte-identical since they're either hardcoded absolute URLs or
    // external CDN references, not host-relative.
    const baselinePaths = new Set(
      baseline
        .filter((r2) => classifyHost(r2.url) === 'app')
        .map((r2) => `${r2.method} ${pathOf(r2.url)}`)
    );
    const verifyPaths = new Set(
      r.requests
        .filter((r2) => classifyHost(r2.url) === 'app')
        .map((r2) => `${r2.method} ${pathOf(r2.url)}`)
    );
    const baselineThirdParty = new Set(
      baseline
        .filter((r2) => classifyHost(r2.url) === 'third-party')
        .map((r2) => `${r2.method} ${r2.url}`)
    );
    const verifyThirdParty = new Set(
      r.requests
        .filter((r2) => classifyHost(r2.url) === 'third-party')
        .map((r2) => `${r2.method} ${r2.url}`)
    );

    const missingFromVerify = [...baselinePaths].filter((p) => !verifyPaths.has(p));
    const unexpectedInVerify = [...verifyPaths].filter((p) => !baselinePaths.has(p));
    const missingThirdParty = [...baselineThirdParty].filter((p) => !verifyThirdParty.has(p));
    const unexpectedThirdParty = [...verifyThirdParty].filter((p) => !baselineThirdParty.has(p));

    const diff: NetworkDiff = {
      id: r.id,
      baselineAppPathCount: baselinePaths.size,
      verifyAppPathCount: verifyPaths.size,
      missingFromVerify: [...missingFromVerify, ...missingThirdParty.map((p) => `[3P] ${p}`)],
      unexpectedInVerify: [...unexpectedInVerify, ...unexpectedThirdParty.map((p) => `[3P] ${p}`)],
    };
    networkDiffs.push(diff);
    const flag = diff.missingFromVerify.length + diff.unexpectedInVerify.length > 0 ? '✗' : '✓';
    console.log(
      `  ${flag} ${r.id}: baseline_app_paths=${baselinePaths.size} verify_app_paths=${verifyPaths.size} ` +
        `missing=${diff.missingFromVerify.length} unexpected=${diff.unexpectedInVerify.length}`
    );
    for (const m of diff.missingFromVerify) console.log(`      - ${m}`);
    for (const m of diff.unexpectedInVerify) console.log(`      + ${m}`);
  }

  const manifest = {
    capturedAt: new Date().toISOString(),
    target: BASE_URL,
    results,
    consoleDiffs,
    networkDiffs,
  };
  await writeFile(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`\n${'='.repeat(70)}`);
  console.log(`Manifest written to ${join(OUT_DIR, 'manifest.json')}`);

  const consoleFailures = consoleDiffs.filter((d) => d.newMessages.length > 0);
  const networkFailures = networkDiffs.filter(
    (d) => d.missingFromVerify.length > 0 || d.unexpectedInVerify.length > 0
  );
  if (consoleFailures.length > 0 || networkFailures.length > 0) {
    console.log(
      `\nFAIL: ${consoleFailures.length} page(s) with new console messages, ` +
        `${networkFailures.length} page(s) with network diffs.`
    );
    process.exitCode = 1;
  } else {
    console.log(`\nPASS: no new console messages, no network diffs.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
