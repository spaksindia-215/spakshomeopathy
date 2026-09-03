/**
 * Production baseline capture — Milestone 0, contract T-1.
 *
 * READS the live Laravel application. WRITES reference artifacts to baseline/.
 * It asserts nothing and never touches the Next.js app.
 *
 * SAFETY (contract F-1, NN-10)
 * ----------------------------
 * Capture is strictly READ-ONLY against production:
 *   - GET requests only
 *   - no form submission
 *   - no destructive GET routes (see scripts/routes.ts exclusions)
 *   - no /testMail (sends real email)
 * A guard below aborts if the target URL is not the expected Laravel host,
 * so this can never be pointed at the Next.js app and overwrite the baseline.
 *
 * ARTIFACTS PER ROUTE x ROLE
 * --------------------------
 *   <id>.<role>.html          raw HTML                     (V-01)
 *   <id>.<role>.normalized.html  HTML with permitted variance stripped (V-01)
 *   <id>.<role>.<viewport>.png   screenshots                (V-02)
 *   <id>.<role>.meta.json     status, redirects, headers, cookies (V-03)
 *   <id>.<role>.console.json  console messages             (V-13)
 *   <id>.<role>.network.json  network requests             (V-14)
 *
 * NORMALIZATION (contract §7.2)
 * -----------------------------
 * Only permitted variance is stripped: CSRF tokens, session ids, timestamps.
 * Everything else is preserved so that real differences surface as defects.
 *
 * USAGE
 *   npm run baseline:capture                 # guest routes
 *   BUYER_EMAIL=.. BUYER_PASSWORD=.. \
 *   ADMIN_EMAIL=.. ADMIN_PASSWORD=.. \
 *     npm run baseline:capture               # all roles
 */

import { chromium, type Browser, type Page, type BrowserContext } from '@playwright/test';
import { mkdir, writeFile, copyFile } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';
import { ALL_ROUTES, routesForRole, type AuthRole, type RouteSpec } from './routes';
import { VIEWPORTS } from '../playwright.config';

const BASELINE_BASE_URL = process.env.BASELINE_BASE_URL ?? 'https://spakshomeopathy.com';
const OUT_DIR = process.env.BASELINE_DIR ?? 'baseline';

/** Viewports captured for every route. Contract V-02. */
const CAPTURE_VIEWPORTS = [
  ['mobile', VIEWPORTS.mobile],
  ['tablet', VIEWPORTS.tablet],
  ['desktop', VIEWPORTS.desktop],
] as const;

/**
 * SAFETY GUARD. Capture must only ever read the Laravel application.
 * Pointing it at localhost would overwrite the baseline with the very thing
 * the baseline is meant to check (contract T-1).
 */
function assertSafeTarget(url: string): void {
  const host = new URL(url).hostname;
  const allowed = ['spakshomeopathy.com', 'www.spakshomeopathy.com'];
  if (!allowed.includes(host)) {
    throw new Error(
      `REFUSING TO CAPTURE from "${host}". The baseline may only be captured ` +
        `from the live Laravel application (${allowed.join(', ')}). ` +
        `Capturing from anywhere else would corrupt the reference set (contract T-1).`
    );
  }
}

/**
 * Strips permitted variance (contract §7.2) so repeated captures are stable
 * and so later comparison does not flag inherently random values.
 */
export function normalizeHtml(html: string): string {
  return (
    html
      // Laravel CSRF token — regenerated per request
      .replace(/(name="_token"\s+value=")[^"]*(")/g, '$1__CSRF_TOKEN__$2')
      .replace(/(<meta\s+name="csrf-token"\s+content=")[^"]*(")/g, '$1__CSRF_TOKEN__$2')
      // Session identifiers
      .replace(/laravel_session=[^;"'\s]+/g, 'laravel_session=__SESSION__')
      .replace(/XSRF-TOKEN=[^;"'\s]+/g, 'XSRF-TOKEN=__XSRF__')
      // Cache-busting query strings on assets
      .replace(/(\?|&)(v|ver|t)=\d{6,}/g, '$1$2=__TS__')
      // Absolute timestamps that move between runs
      .replace(/\b\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}\b/g, '__DATETIME__')
      // Normalize line endings only; DO NOT collapse whitespace —
      // whitespace can be structurally meaningful in the original markup.
      .replace(/\r\n/g, '\n')
  );
}

function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

interface CaptureResult {
  id: string;
  path: string;
  role: AuthRole;
  status: number | null;
  finalUrl: string;
  redirected: boolean;
  htmlSha256: string;
  normalizedSha256: string;
  htmlBytes: number;
  consoleErrors: number;
  consoleWarnings: number;
  requestCount: number;
  failedRequests: number;
  viewports: string[];
  error?: string;
  note?: string;
}

async function captureRoute(
  context: BrowserContext,
  route: RouteSpec,
  role: AuthRole,
  outDir: string
): Promise<CaptureResult> {
  const page: Page = await context.newPage();
  const consoleMessages: Array<{ type: string; text: string }> = [];
  const networkRequests: Array<{ method: string; url: string; status?: number; failed?: boolean }> =
    [];

  page.on('console', (msg) => {
    consoleMessages.push({ type: msg.type(), text: msg.text().slice(0, 500) });
  });
  page.on('requestfailed', (req) => {
    networkRequests.push({ method: req.method(), url: req.url(), failed: true });
  });
  page.on('response', (res) => {
    networkRequests.push({ method: res.request().method(), url: res.url(), status: res.status() });
  });

  const base = `${route.id}.${role}`;
  const result: CaptureResult = {
    id: route.id,
    path: route.path,
    role,
    status: null,
    finalUrl: '',
    redirected: false,
    htmlSha256: '',
    normalizedSha256: '',
    htmlBytes: 0,
    consoleErrors: 0,
    consoleWarnings: 0,
    requestCount: 0,
    failedRequests: 0,
    viewports: [],
  };
  if (route.note) result.note = route.note;

  try {
    const url = new URL(route.path, BASELINE_BASE_URL).toString();
    const response = await page.goto(url, { waitUntil: 'load', timeout: 60_000 });

    result.status = response?.status() ?? null;
    result.finalUrl = page.url();
    result.redirected = page.url() !== url;

    // Let deferred/jQuery-initialized widgets settle (carousels, sliders).
    await page.waitForTimeout(2500);

    const html = await page.content();
    result.htmlSha256 = sha256(html);
    result.htmlBytes = Buffer.byteLength(html, 'utf8');

    const normalized = normalizeHtml(html);
    result.normalizedSha256 = sha256(normalized);

    await writeFile(join(outDir, 'html', `${base}.html`), html, 'utf8');
    await writeFile(join(outDir, 'html', `${base}.normalized.html`), normalized, 'utf8');

    // Screenshots at each mandated viewport.
    //
    // SETTLE REQUIREMENT (fixed after the M1 gate found a baseline defect).
    // The original implementation waited only 700ms after a viewport change,
    // which was NOT enough for the Google Translate widget on every public
    // page (`inc/header.blade.php`). The widget injects a "Select Language"
    // <select> asynchronously and RE-RENDERS on resize, so the first
    // (desktop) screenshot captured it but the subsequent tablet/mobile
    // screenshots were taken mid-render — silently omitting a ~61px element
    // and producing baselines that did not match production.
    //
    // We now wait for the widget to actually be present rather than guessing
    // a duration. Pages without the widget fall through on the timeout, so
    // this is safe for the legacy microsites too (contract T-1: the baseline
    // must be right, because everything downstream is compared against it).
    // OI-15 UPDATE: the 1500ms sleep below was still a race. The Google
    // Translate banner contributes ~61px and lands at ~600-900ms, but under
    // load it was occasionally missed, freezing an arbitrary outcome into the
    // baseline. Every wait here is now a DETERMINISTIC OBSERVABLE, and the
    // capture must use the SAME gate as tests/e2e/m1-screenshots.spec.ts so
    // both sides are captured at the same lifecycle point.
    for (const [name, vp] of CAPTURE_VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // 1. Translate script has run (select exists).
      await page
        .locator('#google_translate_element select')
        .first()
        .waitFor({ state: 'attached', timeout: 12_000 })
        .catch(() => {
          /* page has no translate widget — expected on legacy microsites */
        });

      // 2. Banner contributes layout. Awaited, not required: the widget is
      //    third-party and genuinely nondeterministic — production itself
      //    yields the banner on some loads and not others.
      await page
        .waitForFunction(
          () => {
            const banner = document.querySelector('div.skiptranslate');
            return !!banner && banner.getBoundingClientRect().height > 0;
          },
          undefined,
          { timeout: 12_000, polling: 'raf' }
        )
        .catch(() => {
          /* banner absent on this load */
        });

      // 3. Page height has reached a fixed point.
      await page
        .waitForFunction(
          () => {
            const w = window as unknown as { __stable?: number; __lastH?: number };
            const h = document.body.scrollHeight;
            if (w.__lastH === h) {
              w.__stable = (w.__stable ?? 0) + 1;
            } else {
              w.__stable = 0;
              w.__lastH = h;
            }
            return (w.__stable ?? 0) >= 3;
          },
          undefined,
          { timeout: 12_000, polling: 'raf' }
        )
        .catch(() => {
          /* height never settled — captured as-is */
        });

      // 4. Pin autoplaying carousels. `.recent-products__carousel` is
      //    `autoplay: true, autoplayTimeout: 2000` (theme.js:421-433), so its
      //    offset depends on capture time. Baseline and comparison must be
      //    pinned identically — see tests/e2e/m1-screenshots.spec.ts (OI-17)
      //    for why: calling Owl's `to.owl.carousel` JS API to force slide 0
      //    threw inside the plugin once autoplay had ticked. Hovering the
      //    carousel uses `autoplayHoverPause: true`, which is part of the
      //    widget's OWN configuration (theme.js:433) — ordinary interaction
      //    Owl already supports, not a call into its internals. Hovering
      //    immediately after `.owl-loaded` reliably lands before autoplay's
      //    first tick: verified 10/10 identical transforms across 5
      //    consecutive runs each on production and local.
      await page
        .locator('.recent-products__carousel')
        .hover({ timeout: 5_000 })
        .catch(() => {
          /* no such carousel on this page */
        });
      await page
        .waitForFunction(
          () => {
            const stage = document.querySelector(
              '.recent-products__carousel .owl-stage'
            ) as HTMLElement | null;
            if (!stage) return true;
            const w = window as unknown as { __tf?: string; __tfStable?: number };
            const tf = getComputedStyle(stage).transform;
            if (w.__tf === tf) {
              w.__tfStable = (w.__tfStable ?? 0) + 1;
            } else {
              w.__tfStable = 0;
              w.__tf = tf;
            }
            return (w.__tfStable ?? 0) >= 3;
          },
          undefined,
          { timeout: 8_000, polling: 'raf' }
        )
        .catch(() => {
          /* transform never settled — captured as-is */
        });

      // 5. Images decoded, not merely fetched (avoids blank strips in
      //    fullPage stitching).
      await page.evaluate(async () => {
        await Promise.all([...document.images].map((img) => img.decode().catch(() => undefined)));
      });

      // TWO SPELLINGS, deliberately. `${base}.${name}.png` (dots) is the
      // historical convention used by meta/html artifacts. Playwright
      // SANITIZES dots in snapshot names into hyphens when resolving the
      // expected file, so the screenshot comparison actually looks for
      // `<id>-guest-<viewport>.png`. Writing both keeps the artifact naming
      // consistent AND makes the file Playwright compares a genuine
      // production capture rather than an auto-generated stand-in (T-1).
      const shotDot = join(outDir, 'screenshots', `${base}.${name}.png`);
      const shotHyphen = join(outDir, 'screenshots', `${base.replace(/\./g, '-')}-${name}.png`);
      await page.screenshot({
        path: shotDot,
        fullPage: true,
        animations: 'disabled',
        // OI-16: mask third-party YouTube embeds — their internal overlay
        // chrome renders non-deterministically. Must match the mask used in
        // m1-screenshots.spec.ts exactly, or baseline and comparison differ.
        mask: [page.locator('iframe[src*="youtube.com/embed"]')],
        maskColor: '#FF00FF',
      });
      await copyFile(shotDot, shotHyphen);
      result.viewports.push(name);
    }

    result.consoleErrors = consoleMessages.filter((m) => m.type === 'error').length;
    result.consoleWarnings = consoleMessages.filter((m) => m.type === 'warning').length;
    result.requestCount = networkRequests.length;
    result.failedRequests = networkRequests.filter((r) => r.failed).length;

    await writeFile(
      join(outDir, 'meta', `${base}.meta.json`),
      JSON.stringify(
        {
          route: route.path,
          role,
          blueprintRef: route.ref,
          note: route.note ?? null,
          status: result.status,
          finalUrl: result.finalUrl,
          redirected: result.redirected,
          headers: response ? await response.allHeaders() : null,
          capturedAt: new Date().toISOString(),
        },
        null,
        2
      ),
      'utf8'
    );
    await writeFile(
      join(outDir, 'console', `${base}.console.json`),
      JSON.stringify(consoleMessages, null, 2),
      'utf8'
    );
    await writeFile(
      join(outDir, 'network', `${base}.network.json`),
      JSON.stringify(networkRequests, null, 2),
      'utf8'
    );
  } catch (err) {
    result.error = String(err).split('\n')[0]?.slice(0, 300) ?? 'unknown error';
  } finally {
    await page.close();
  }

  return result;
}

/**
 * Authenticates a context by posting the Laravel login form.
 *
 * NOTE: this is the ONE place capture submits a form. It is a login, which
 * creates no business records. Blueprint §5.2 documents the `backuser`
 * hidden field that gates which role may use which form.
 */
async function authenticate(
  browser: Browser,
  role: 'buyer' | 'admin',
  email: string,
  password: string
): Promise<BrowserContext | null> {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const loginPath = role === 'admin' ? '/admin/login' : '/login';

  try {
    await page.goto(new URL(loginPath, BASELINE_BASE_URL).toString(), {
      waitUntil: 'load',
      timeout: 60_000,
    });
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await Promise.all([
      page.waitForLoadState('load', { timeout: 60_000 }),
      page.click('button[type="submit"], input[type="submit"]'),
    ]);
    await page.waitForTimeout(1500);

    const landed = page.url();
    const ok = role === 'admin' ? landed.includes('/admin/home') : !landed.includes('/login');

    if (!ok) {
      console.error(`  ✗ ${role} login failed — landed on ${landed}`);
      await context.close();
      return null;
    }
    console.log(`  ✓ ${role} authenticated — landed on ${landed}`);
    await page.close();
    return context;
  } catch (err) {
    console.error(`  ✗ ${role} login error: ${String(err).split('\n')[0]}`);
    await context.close();
    return null;
  }
}

async function main(): Promise<void> {
  assertSafeTarget(BASELINE_BASE_URL);

  for (const sub of ['html', 'screenshots', 'meta', 'console', 'network']) {
    await mkdir(join(OUT_DIR, sub), { recursive: true });
  }

  console.log(`Baseline capture`);
  console.log(`  target : ${BASELINE_BASE_URL}`);
  console.log(`  output : ${OUT_DIR}/`);
  console.log(`  mode   : READ-ONLY (GET requests only)\n`);

  const browser = await chromium.launch();
  const results: CaptureResult[] = [];
  const skipped: Array<{ id: string; role: AuthRole; reason: string }> = [];

  // ---- guest ----
  const guestContext = await browser.newContext({ ignoreHTTPSErrors: true });
  // ROUTE_IDS: optional comma-separated allow-list of route ids, so a targeted
  // re-capture (e.g. only the 9 M1 pages after a capture-gate change) does not
  // require re-running all 62 routes. Omitted → every route, as before.
  const routeFilter = process.env.ROUTE_IDS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const guestRoutes = routesForRole('guest').filter(
    (r) => !routeFilter || routeFilter.includes(r.id)
  );
  console.log(`GUEST — ${guestRoutes.length} routes${routeFilter ? ' (filtered)' : ''}`);
  for (const route of guestRoutes) {
    const r = await captureRoute(guestContext, route, 'guest', OUT_DIR);
    results.push(r);
    console.log(
      `  ${r.error ? '✗' : '✓'} ${String(r.status ?? 'ERR').padEnd(3)} ${route.path}` +
        `${r.error ? ` — ${r.error.slice(0, 60)}` : ''}`
    );
  }
  await guestContext.close();

  // ---- buyer ----
  const buyerEmail = process.env.BUYER_EMAIL;
  const buyerPassword = process.env.BUYER_PASSWORD;
  const buyerRoutes = routesForRole('buyer');
  if (buyerEmail && buyerPassword) {
    console.log(`\nBUYER — ${buyerRoutes.length} routes`);
    const ctx = await authenticate(browser, 'buyer', buyerEmail, buyerPassword);
    if (ctx) {
      for (const route of buyerRoutes) {
        const r = await captureRoute(ctx, route, 'buyer', OUT_DIR);
        results.push(r);
        console.log(
          `  ${r.error ? '✗' : '✓'} ${String(r.status ?? 'ERR').padEnd(3)} ${route.path}`
        );
      }
      await ctx.close();
    } else {
      for (const route of buyerRoutes)
        skipped.push({ id: route.id, role: 'buyer', reason: 'authentication failed' });
    }
  } else {
    console.log(`\nBUYER — SKIPPED (BUYER_EMAIL / BUYER_PASSWORD not set)`);
    for (const route of buyerRoutes)
      skipped.push({ id: route.id, role: 'buyer', reason: 'no credentials supplied' });
  }

  // ---- admin ----
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminRoutes = routesForRole('admin');
  if (adminEmail && adminPassword) {
    console.log(`\nADMIN — ${adminRoutes.length} routes`);
    const ctx = await authenticate(browser, 'admin', adminEmail, adminPassword);
    if (ctx) {
      for (const route of adminRoutes) {
        const r = await captureRoute(ctx, route, 'admin', OUT_DIR);
        results.push(r);
        console.log(
          `  ${r.error ? '✗' : '✓'} ${String(r.status ?? 'ERR').padEnd(3)} ${route.path}`
        );
      }
      await ctx.close();
    } else {
      for (const route of adminRoutes)
        skipped.push({ id: route.id, role: 'admin', reason: 'authentication failed' });
    }
  } else {
    console.log(`\nADMIN — SKIPPED (ADMIN_EMAIL / ADMIN_PASSWORD not set)`);
    for (const route of adminRoutes)
      skipped.push({ id: route.id, role: 'admin', reason: 'no credentials supplied' });
  }

  await browser.close();

  const manifest = {
    capturedAt: new Date().toISOString(),
    target: BASELINE_BASE_URL,
    capturedRoutes: results.length,
    skippedRoutes: skipped.length,
    totalRoutesInInventory: ALL_ROUTES.length,
    viewports: CAPTURE_VIEWPORTS.map(([n, v]) => `${n} (${v.width}x${v.height})`),
    complete: skipped.length === 0,
    results,
    skipped,
  };
  // A filtered run (ROUTE_IDS) captures a SUBSET, so writing the manifest
  // would replace the full-run record with a partial one and silently lose the
  // capture history for every route not re-run. Screenshots/HTML are still
  // refreshed; only the manifest is preserved.
  if (routeFilter) {
    console.log(`\nFiltered run (ROUTE_IDS) — manifest.json left unchanged.`);
  } else {
    await writeFile(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  }

  const failed = results.filter((r) => r.error).length;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Captured : ${results.length}  (errors: ${failed})`);
  console.log(`Skipped  : ${skipped.length}`);
  console.log(`Complete : ${manifest.complete ? 'YES' : 'NO — see manifest.json'}`);
  console.log(`Manifest : ${join(OUT_DIR, 'manifest.json')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
