import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the Herbs Store's functional E2E tests
 * (CR-003 follow-on — original brief §44).
 *
 * DELIBERATELY SEPARATE from `playwright.config.ts`, not a shared project
 * inside it. That file's whole purpose (see its own header) is
 * baseline-diff parity testing against production Laravel screenshots
 * captured in Milestone 0 (`updateSnapshots: 'none'` — a missing baseline
 * is a hard error, by design, per contract T-1). The Herbs Store has no
 * Laravel page to diff against; these are ordinary functional/interaction
 * tests (does Add to Cart work, does the filter narrow results, does
 * checkout complete) — a fundamentally different testing category that
 * must never be confused with, or accidentally run alongside, the
 * parity suite. Two configs, two `testDir`s, two npm scripts
 * (`test:e2e` vs `test:e2e:herbs`) keeps that boundary structural, not
 * just a comment someone could miss.
 *
 * Run with: npm run test:e2e:herbs
 * (needs the app running separately — see that script's own note, or use
 * `webServer` below for a one-shot local run.)
 */

const BASE_URL = process.env.HERBS_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './tests/herbs-e2e',
  outputDir: './test-results-herbs',

  retries: 0,
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,

  reporter: [['list'], ['html', { outputFolder: 'playwright-report-herbs', open: 'never' }]],

  timeout: 30_000,
  expect: { timeout: 8_000 },

  use: {
    baseURL: BASE_URL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
  },

  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
    // Chromium-based (Pixel 7), not an iPhone/WebKit preset — see
    // tests/herbs-e2e/mobile.spec.ts's own header for why.
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],

  // Only used if HERBS_BASE_URL is left at its default and no server is
  // already running on :3000 — Playwright starts one, waits for it, and
  // tears it down after the run. If a dev server is already up (the more
  // common case while iterating), Playwright reuses it instead of
  // double-starting.
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
