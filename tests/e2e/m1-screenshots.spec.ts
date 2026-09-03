import { test, expect } from '@playwright/test';

/**
 * M1 screenshot parity (V-02) — closes Outstanding Issue OI-8 from
 * docs/GATE-REPORT-M1.md.
 *
 * Compares the local Next.js build against the production screenshots
 * captured in Milestone 0 (`baseline/screenshots/<id>-guest-<viewport>.png`),
 * using Playwright's built-in `toHaveScreenshot()` pixel comparison. The
 * project's `snapshotPathTemplate` (see playwright.config.ts) points
 * directly at `baseline/screenshots/`, so the M0 production capture *is*
 * the expected snapshot — nothing is copied or re-captured.
 *
 * Tolerance: `maxDiffPixelRatio: 0.01`, configured project-wide in
 * playwright.config.ts `expect.toHaveScreenshot`, absorbs font
 * antialiasing across machines without masking real layout drift
 * (contract §7.4 — fidelity is measured, not assumed).
 *
 * Each project (chromium-desktop/tablet/mobile) runs this file at its
 * configured viewport; the snapshot name passed to `toHaveScreenshot`
 * must therefore vary by project so `about-guest-desktop.png` is compared
 * only when running under chromium-desktop, etc.
 *
 * NAMING: hyphens, not dots. Playwright SANITIZES dots in snapshot names into
 * hyphens when resolving the file, so requesting "about.guest.desktop.png"
 * makes it look for "about-guest-desktop.png" and report the dot-named
 * production capture as missing. capture-baseline.ts writes both spellings so
 * the production capture is the file actually compared (contract T-1).
 */

const M1_PAGES = [
  'about',
  'contact',
  'terms',
  'privacy-policy',
  'return-policy',
  'mother-tincture',
  'details',
  'video',
  'videos-broken',
] as const;

const PATH_FOR: Record<(typeof M1_PAGES)[number], string> = {
  about: '/about',
  contact: '/contact',
  terms: '/terms',
  'privacy-policy': '/privacy-policy',
  'return-policy': '/return-policy',
  'mother-tincture': '/mother-tincture',
  details: '/details',
  video: '/video',
  'videos-broken': '/videos',
};

const VIEWPORT_SUFFIX_BY_PROJECT: Record<string, string> = {
  'chromium-desktop': 'desktop',
  'chromium-tablet': 'tablet',
  'chromium-mobile': 'mobile',
};

for (const id of M1_PAGES) {
  test(`${id} matches production screenshot`, async ({ page }, testInfo) => {
    const suffix = VIEWPORT_SUFFIX_BY_PROJECT[testInfo.project.name];
    test.skip(!suffix, `No baseline viewport mapping for project "${testInfo.project.name}"`);

    await page.goto(PATH_FOR[id]);

    // OI-15 — wait for a DETERMINISTIC OBSERVABLE, never a fixed sleep.
    //
    // The previous `waitForTimeout(2500)` was a race. The Google Translate
    // widget injects a ~61px banner asynchronously; measured at 320px it lays
    // out at ~600ms locally and ~730-920ms on production, but under load the
    // 2.5s budget was occasionally missed, capturing the page at 2938px
    // instead of 2999px. That produced flaky mobile failures that had nothing
    // to do with the application — once the widget has settled both sides are
    // identical (12/12 runs at 2999px, prod and local).
    //
    // The widget bootstraps in two observable stages:
    //   1. `.goog-te-combo` — the language <select> exists (script ran)
    //   2. `div.skiptranslate` gains height — the banner contributes layout
    //
    // Both stages are AWAITED but NOT REQUIRED. The widget is third-party and
    // genuinely nondeterministic on BOTH sides — measured on production, the
    // same page yields the banner on some loads and not others (e.g. /about at
    // 320px: 3427px with banner, 3366px without, across consecutive runs; and
    // /video where production sometimes never loads the widget at all).
    // Neither application controls this, so a hard requirement would make the
    // suite fail on production's own variance rather than on a real defect.
    // Awaiting bounds the race; the settle gate below then pins the result.
    //
    // This is a readiness gate, NOT a retry: a failed comparison is never
    // re-run, and no failure is converted into a pass.
    await page
      .waitForFunction(() => !!document.querySelector('.goog-te-combo'), undefined, {
        timeout: 12000,
      })
      .catch(() => {
        // Widget did not initialize on this load — happens on production too.
      });

    await page
      .waitForFunction(
        () => {
          const banner = document.querySelector('div.skiptranslate');
          return !!banner && banner.getBoundingClientRect().height > 0;
        },
        undefined,
        { timeout: 12000, polling: 'raf' }
      )
      .catch(() => {
        // Banner genuinely absent for this load.
      });

    // Layout-settled gate: body height unchanged across several consecutive
    // animation frames. Observes the quantity actually under test (page
    // height) reaching a fixed point, rather than guessing a duration.
    await page.waitForFunction(
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
      { timeout: 15000, polling: 'raf' }
    );

    // Legacy jQuery widgets (Owl, WOW, Magnific) are initialized by
    // LegacyScriptRunner after hydration (OI-10). `.owl-loaded` is Owl's own
    // completion marker, so where a carousel exists we wait for that rather
    // than guessing a duration. Pages without a carousel skip this.
    await page.waitForFunction(
      () => {
        const carousels = document.querySelectorAll('.owl-carousel');
        if (carousels.length === 0) return true;
        return document.querySelectorAll('.owl-carousel.owl-loaded').length === carousels.length;
      },
      undefined,
      { timeout: 15000 }
    );

    // `.recent-products__carousel` is configured `autoplay: true` with
    // `autoplayTimeout: 2000` (theme.js:421-433), so it advances every 2s and
    // its scroll offset depends on WHEN the screenshot is taken. Baseline and
    // comparison must be pinned to the same slide or the diff reports a
    // carousel that merely rotated.
    //
    // OI-17: calling Owl's own `to.owl.carousel` JS API to force a slide threw
    // inside the plugin ("Cannot read properties of undefined (reading
    // 'start')") once autoplay had already ticked — a preexisting Owl/jQuery
    // interaction issue, not something introduced here — and a thrown
    // `evaluate` was swallowed by the surrounding catch, silently pinning
    // nothing. `autoplayHoverPause: true` is already part of the carousel's
    // OWN configuration (theme.js:433) — hovering the mouse over it is normal
    // user interaction Owl already supports, not a call into its internals.
    // Hovering immediately after `.owl-loaded` reliably lands before
    // autoplay's first 2000ms tick: verified 10/10 identical transforms
    // (`matrix(1,0,0,1,-1200,0)`) across 5 consecutive runs each on production
    // and local. No plugin behavior is altered — the same pause the widget
    // offers on any real cursor hover is triggered slightly earlier so the
    // capture is deterministic.
    await page
      .locator('.recent-products__carousel')
      .hover({ timeout: 5000 })
      .catch(() => {
        /* no such carousel on this page */
      });
    // Confirm the carousel's transform has stopped changing post-hover,
    // rather than assuming a fixed duration is long enough.
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
        { timeout: 8000, polling: 'raf' }
      )
      .catch(() => {
        /* transform never settled — captured as-is */
      });

    // Fonts affect text metrics; wait for them rather than absorbing the
    // difference into the pixel tolerance.
    await page.evaluate(() => document.fonts.ready);

    // OI-15 — images must be DECODED, not merely loaded.
    //
    // `fullPage` capture stitches the page while scrolling. An <img> can be
    // `complete` (bytes fetched) yet not painted at the moment its strip is
    // captured, which rendered one /about product photo as a blank box at
    // 320px. `decode()` resolves only once the bitmap is ready to paint, so
    // awaiting it for every image removes the paint race deterministically.
    // Images that fail to decode are ignored — production has a genuinely
    // broken request too, and that failure is preserved (NN-4), not fixed.
    await page.evaluate(async () => {
      await Promise.all([...document.images].map((img) => img.decode().catch(() => undefined)));
    });

    // OI-16 — mask ONLY the third-party YouTube embeds.
    //
    // `/video` and `/details` embed youtube.com/embed/* iframes. The
    // application's own markup and CSS are provably correct: production and
    // local render the SAME 6 videos at PIXEL-IDENTICAL geometry
    // (200x200 at 54/284/514 × 406/613 on tablet — measured, both sides).
    // What differs is content YouTube itself paints inside the iframe: its
    // "Watch on YouTube" overlay chrome appears non-deterministically between
    // loads. Thumbnails are identical; only the overlay differs.
    //
    // Nothing in the application can control that, and the contract forbids
    // altering the embed to force screenshot equality. So the iframe RECTANGLES
    // are masked and everything around them is still compared strictly.
    // This is deliberately NOT a page-level tolerance: the surrounding UI —
    // including each iframe's position, which is what a layout regression
    // would move — remains fully asserted. Pages without embeds mask nothing.
    const youtubeEmbeds = page.locator('iframe[src*="youtube.com/embed"]');

    await expect(page).toHaveScreenshot(`${id}-guest-${suffix}.png`, {
      fullPage: true,
      mask: [youtubeEmbeds],
      maskColor: '#FF00FF',
    });
  });
}
