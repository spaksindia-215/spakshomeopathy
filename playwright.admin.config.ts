import { defineConfig, devices } from '@playwright/test';
import { config as loadDotenv } from 'dotenv';
import { resolve } from 'path';

// Loaded here (not auto-loaded by Playwright the way Next.js loads it for
// the dev server) because `tests/admin-e2e/auth.ts` needs `SESSION_SECRET`
// in THIS process to sign a matching session cookie — same two-file
// loading order (`.env` then `.env.local` override) `scripts/*.ts` already
// uses throughout this project.
loadDotenv({ path: resolve(__dirname, '.env') });
loadDotenv({ path: resolve(__dirname, '.env.local'), override: true });

/**
 * Playwright config for the Admin CMS's functional E2E tests — CR-006
 * Phase 10 (`docs/CR-006-PHASE-10-PLAN.md` §2.2).
 *
 * DELIBERATELY SEPARATE from `playwright.config.ts` (Laravel screenshot-
 * parity for buyer-facing pages) and `playwright.herbs.config.ts` (CR-003
 * herbs-storefront functional tests) — same reasoning that file's own
 * header already gives: a different testing category (functional/
 * interaction, not parity-diffing) that must never risk running
 * alongside either existing suite. Three configs, three `testDir`s,
 * three npm scripts keeps every boundary structural.
 *
 * AUTHENTICATION: these specs never submit the real login form — they
 * construct a validly-signed session cookie directly
 * (`tests/admin-e2e/auth.ts`) for the one real admin account, using the
 * same `SESSION_SECRET` the dev server itself reads from `.env.local`.
 * See that file's own header for the full rationale (no real admin
 * password is available or should be requested for this).
 *
 * Run with: npm run test:e2e:admin
 */

const BASE_URL = process.env.ADMIN_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './tests/admin-e2e',
  outputDir: './test-results-admin',

  retries: 0,
  // NOT fullyParallel — several specs share the one real admin account's
  // data (the redirects CRUD round-trip creates/deletes a real document
  // in the shared dev database); running them serially avoids one spec's
  // cleanup racing another's setup. The herbs suite can be fully
  // parallel because it only touches per-viewer localStorage, not a
  // shared database — a real difference between the two suites, not an
  // oversight.
  fullyParallel: false,
  workers: 1,

  reporter: [['list'], ['html', { outputFolder: 'playwright-report-admin', open: 'never' }]],

  // Longer than herbs-e2e's 30s default: `/admin/media-library`
  // (Phase 8) does a real filesystem scan of `uploaded_files/products`
  // (1615 real files as of Phase 8's own findings) on every request —
  // confirmed this phase to take several seconds even on a warm dev
  // server, longer still on a Next.js dev-mode cold compile. A real
  // characteristic of that page, not a flaky test.
  timeout: 45_000,
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
  ],

  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
