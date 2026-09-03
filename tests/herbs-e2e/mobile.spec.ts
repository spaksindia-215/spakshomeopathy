import { test, expect, devices } from '@playwright/test';

/**
 * Mobile-layout checks for the Herbs Store (original brief §44's item
 * "14. Test mobile layout", called out as its own flow). Forces the
 * Pixel 7 viewport/UA regardless of which project runs this file, so
 * these assertions hold even when the suite is invoked with only the
 * `desktop` project selected.
 *
 * Chromium-based device (not an iPhone/WebKit preset) deliberately —
 * this sandbox's installed Playwright browser cache does not have the
 * WebKit version this Playwright release expects (confirmed directly:
 * `webkit-2311` present, `webkit-2336` requested), so an iPhone preset
 * fails every test here with a "browser not installed" error unrelated
 * to the app itself. Pixel 7 (`defaultBrowserType: "chromium"`) gives
 * the same mobile-viewport/touch/UA coverage using the browser already
 * available.
 */
test.use({ ...devices['Pixel 7'] });

test.beforeEach(async ({ page }) => {
  await page.goto('/herbs');
  await page.evaluate(() => {
    window.localStorage.removeItem('spaks-herbs-cart');
    window.localStorage.removeItem('spaks-herbs-wishlist');
  });
});

test('mobile: header shows a hamburger menu, not the full desktop nav', async ({ page }) => {
  await page.goto('/herbs');
  await expect(page.locator('.hs-menu-toggle')).toBeVisible();
  await expect(page.locator('.hs-nav')).not.toBeVisible();
});

test('mobile: hamburger menu opens a navigation drawer with working links', async ({ page }) => {
  await page.goto('/herbs');
  await page.locator('.hs-menu-toggle').click();
  await expect(page.locator('.hs-drawer')).toBeVisible();

  await page.locator('.hs-drawer a', { hasText: 'Herbs' }).click();
  await expect(page).toHaveURL(/\/herbs\/products/);
});

test('mobile: product grid renders 2 columns, not a single squeezed column', async ({ page }) => {
  await page.goto('/herbs/products');
  const grid = page.locator('.hs-product-grid').first();
  const columns = await grid.evaluate(
    (el) => getComputedStyle(el).gridTemplateColumns.split(' ').length
  );
  expect(columns).toBe(2);
});

test('mobile: filters are hidden behind a "Filters" button, not shown inline', async ({ page }) => {
  await page.goto('/herbs/products');
  await expect(page.locator('.hs-catalog > .hs-filters')).not.toBeVisible();
  await expect(page.locator('.hs-filter-toggle')).toBeVisible();
});

test('mobile: tapping "Filters" opens the filter drawer and it can be dismissed', async ({
  page,
}) => {
  await page.goto('/herbs/products');
  await page.locator('.hs-filter-toggle').click();
  await expect(page.locator('.hs-drawer')).toBeVisible();

  await page.locator('.hs-drawer button', { hasText: /show \d+ results/i }).click();
  await expect(page.locator('.hs-drawer')).not.toBeVisible();
});

test('mobile: product detail page CTAs stack full-width and remain usable', async ({ page }) => {
  await page.goto('/herbs/product/ashwagandha-root-powder');
  const addToCart = page.locator('.hs-pdp__actions button', { hasText: 'Add to Cart' });
  await expect(addToCart).toBeVisible();

  const box = await addToCart.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  // Full-width per the mobile CSS rule `.hs-pdp__actions .hs-btn { width: 100% }`
  // — allow a small margin for container padding.
  expect(box!.width).toBeGreaterThan((viewport?.width ?? 0) * 0.7);

  await addToCart.click();
  await expect(page.locator('.hs-icon-btn__badge').last()).toHaveText('1');
});

test('mobile: cart page is usable end-to-end on a small viewport', async ({ page }) => {
  await page.goto('/herbs/product/ashwagandha-root-powder');
  await page.locator('.hs-pdp__actions button', { hasText: 'Add to Cart' }).click();
  await page.goto('/herbs/cart');

  await expect(page.locator('.hs-cart-line')).toHaveCount(1);
  await expect(page.locator('.hs-btn', { hasText: 'Proceed to Checkout' })).toBeVisible();
});
