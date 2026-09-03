import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration — regression testing framework.
 *
 * ROLE IN THIS PROJECT (MIGRATION-CONTRACT.md Part 5)
 * ---------------------------------------------------
 * Playwright is the execution engine for the browser-dependent verification
 * categories. Vitest covers the programmatic ones.
 *
 *   V-01 UI Parity          -> DOM capture + normalized diff vs baseline
 *   V-02 Responsive         -> screenshots at 320/768/1024/1440
 *   V-03 Route Parity       -> status codes, redirect chains, cookies
 *   V-04 Authentication     -> storageState fixtures per role
 *   V-12 Error Handling     -> BROKEN-item regression (asserts FAILURE)
 *   V-13 Console Errors     -> console listener, diffed against baseline
 *   V-14 Network Requests   -> request listener, diffed against baseline
 *
 * MILESTONE 0 SCOPE
 * -----------------
 * FRAMEWORK CONFIGURATION ONLY. No migration tests exist yet, by instruction.
 * The only Playwright code in the project is the baseline CAPTURE script
 * (scripts/capture-baseline.ts), which reads the LIVE LARAVEL SITE and writes
 * reference artifacts. It asserts nothing about the Next.js app.
 *
 * TWO DISTINCT MODES
 * ------------------
 * 1. CAPTURE (Milestone 0, and re-run if the Laravel app changes)
 *      Target: BASELINE_BASE_URL (the live Laravel site)
 *      Writes: baseline/**
 *      Run via: npm run baseline:capture
 *
 * 2. VERIFY (Milestone 1 onward)
 *      Target: BASE_URL (the Next.js app)
 *      Compares against: baseline/**
 *      Run via: npm run test:e2e
 *
 * Capture must NEVER run against the Next.js app, and verification must
 * NEVER overwrite the baseline. Contract T-1: if the baseline is wrong,
 * everything downstream is wrong.
 *
 * DETERMINISM REQUIREMENTS (contract §7.2)
 * ----------------------------------------
 * Comparisons must normalize permitted variance before diffing: CSRF tokens,
 * session ids, `str_random(5)` slug suffixes on new records, rand() order-id
 * components, timestamps, and Date headers. Everything else is a defect.
 *
 * Animations are disabled and a fixed timezone/locale is pinned so repeated
 * runs are byte-stable.
 */

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

/**
 * Viewports. Contract V-02 mandates 320/768/1024/1440; the blueprint's
 * testing plan (§24.9) adds 375 and 1920 for a key-page set.
 */
export const VIEWPORTS = {
  mobile: { width: 320, height: 640 },
  mobileLarge: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  laptop: { width: 1024, height: 768 },
  desktop: { width: 1440, height: 900 },
  desktopWide: { width: 1920, height: 1080 },
} as const;

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results',
  snapshotDir: './baseline/screenshots',

  // Contract T-2: fidelity is proven, not asserted. Never silently retry a
  // parity failure into a pass — a flaky diff is itself a finding.
  retries: 0,
  fullyParallel: false,
  workers: 1,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  timeout: 60_000,
  expect: {
    timeout: 15_000,
    toHaveScreenshot: {
      // Small tolerance absorbs font antialiasing across machines without
      // masking real layout drift. Tighten if CI hardware is fixed.
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
      caret: 'hide',
    },
  },

  // Points Playwright's expected-snapshot lookup directly at the
  // production baseline captured in Milestone 0. `{arg}` is the name
  // passed to `toHaveScreenshot(name)` (e.g. "about.guest.desktop.png"),
  // which already matches capture-baseline.ts's naming convention exactly
  // — so the M0 capture IS the expected snapshot; nothing is copied.
  snapshotPathTemplate: '{snapshotDir}/{arg}{ext}',

  // Never auto-create a missing baseline.
  //
  // Playwright's default is 'missing', which WRITES any absent snapshot and
  // fails only that first run — so the next run "passes" against a file the
  // harness invented. In this project the expected snapshots are PRODUCTION
  // captures (contract T-1); a locally-generated stand-in is not a baseline
  // and would silently assert the Next.js app against itself. Observed doing
  // exactly that: an unexpected snapshot name produced hyphen-named files in
  // baseline/screenshots/ that then shadowed the real dot-named captures.
  //
  // 'none' makes a missing baseline a hard error. Re-capture deliberately with
  // `npm run baseline:capture` (optionally ROUTE_IDS=... for a subset).
  updateSnapshots: 'none',

  use: {
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',

    // Pin locale and timezone so rendered dates are deterministic.
    // The Laravel app renders dates server-side (e.g. admin header
    // `date('d F, Y')`), so client timezone must not introduce drift.
    locale: 'en-US',
    timezoneId: 'Asia/Kolkata',
  },

  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: VIEWPORTS.desktop },
    },
    {
      name: 'chromium-tablet',
      use: { ...devices['Desktop Chrome'], viewport: VIEWPORTS.tablet },
    },
    {
      name: 'chromium-mobile',
      use: { ...devices['Desktop Chrome'], viewport: VIEWPORTS.mobile },
    },
    // Cross-browser verification (contract V-02 / blueprint §24.9) is a
    // Milestone 13 activity. Firefox is installed and available; the project
    // is declared here so enabling it later requires no config change.
    {
      name: 'firefox-desktop',
      use: { ...devices['Desktop Firefox'], viewport: VIEWPORTS.desktop },
    },
  ],
});
