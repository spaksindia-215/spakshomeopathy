import { test, expect } from '@playwright/test';

/**
 * Herbs Store functional E2E tests (CR-003 follow-on, original brief
 * §44's 14 flows). Run via `npm run test:e2e:herbs` —
 * `playwright.herbs.config.ts`'s own header explains why this is a
 * separate config/suite from the baseline-diff `tests/e2e/`.
 *
 * Each test clears Herbs Store localStorage first (`spaks-herbs-*` keys)
 * so tests don't leak cart/wishlist state into each other regardless of
 * run order — `fullyParallel: true` in the config means order isn't
 * guaranteed anyway.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/herbs');
  await page.evaluate(() => {
    window.localStorage.removeItem('spaks-herbs-cart');
    window.localStorage.removeItem('spaks-herbs-wishlist');
    window.localStorage.removeItem('spaks-herbs-recently-viewed');
  });
});

test('1. Herbs homepage loads with hero, categories, and featured products', async ({ page }) => {
  // Already on /herbs from beforeEach — no need to navigate again.
  await expect(page.locator('.hs-hero__title')).toBeVisible();
  await expect(page.locator('.hs-cat-card').first()).toBeVisible();
  await expect(page.locator('.hs-product-card').first()).toBeVisible();
});

test('2. Browse a herb-form category page', async ({ page }) => {
  const card = page.locator('.hs-cat-card', { hasText: 'Herb Powders' });
  await card.scrollIntoViewIfNeeded();
  await Promise.all([page.waitForURL(/\/herbs\/category\/powders/), card.click()]);
  await expect(page.locator('.hs-section__title')).toHaveText('Herb Powders');
  await expect(page.locator('.hs-product-card').first()).toBeVisible();
});

test('3. Search finds a known product by name', async ({ page }) => {
  await page.goto('/herbs/products');
  await page.getByPlaceholder(/search herbs/i).fill('Ashwagandha');
  await page.waitForTimeout(300);
  const result = page.locator('.hs-search__result').first();
  await expect(result).toContainText('Ashwagandha');
  await Promise.all([page.waitForURL(/\/herbs\/product\/ashwagandha/), result.click()]);
});

test('4. Search with no matches shows an empty state, not a blank/broken page', async ({
  page,
}) => {
  // Already on /herbs from beforeEach.
  await page.getByPlaceholder(/search herbs/i).fill('zzzznonexistentherbxyz');
  await page.waitForTimeout(300);
  await expect(page.locator('.hs-search__empty')).toBeVisible();
  await expect(page.locator('.hs-search__empty')).toContainText(/no herbs found/i);
});

test('5. Filtering the catalog by herb form narrows the results', async ({ page }) => {
  await page.goto('/herbs/products');
  const countBefore = await page.locator('.hs-toolbar__count').textContent();

  await page.locator('.hs-filters input[name="form"]').first().check();
  await page.waitForTimeout(200);

  const countAfter = await page.locator('.hs-toolbar__count').textContent();
  expect(countAfter).not.toBe(countBefore);
  await expect(page.locator('.hs-product-card').first()).toBeVisible();
});

test('6. Sorting by price (low to high) actually reorders the grid', async ({ page }) => {
  await page.goto('/herbs/products');
  await page.locator('.hs-select').selectOption('price-asc');
  await page.waitForTimeout(200);

  const prices = await page.locator('.hs-product-card .hs-price').allTextContents();
  const numeric = prices.map((p) => Number(p.replace(/[^\d]/g, '')));
  const sorted = [...numeric].sort((a, b) => a - b);
  expect(numeric).toEqual(sorted);
});

test('7. Pagination advances to a second page of results', async ({ page }) => {
  await page.goto('/herbs/products');
  const pagination = page.locator('.hs-pagination');
  if ((await pagination.count()) === 0) {
    test.skip(
      true,
      'Catalogue smaller than one page — pagination not applicable at current seed size.'
    );
  }
  const firstCardBefore = await page
    .locator('.hs-product-card')
    .first()
    .locator('.hs-product-card__title')
    .textContent();
  await page.locator('.hs-pagination button', { hasText: '2' }).click();
  await page.waitForTimeout(200);
  const firstCardAfter = await page
    .locator('.hs-product-card')
    .first()
    .locator('.hs-product-card__title')
    .textContent();
  expect(firstCardAfter).not.toBe(firstCardBefore);
});

test('8. Opening a product detail page shows gallery, price, and variants', async ({ page }) => {
  await page.goto('/herbs/product/ashwagandha-root-powder');
  await expect(page.locator('.hs-pdp__title')).toHaveText('Ashwagandha Root Powder');
  await expect(page.locator('.hs-gallery__main')).toBeVisible();
  await expect(page.locator('.hs-pdp__price')).toBeVisible();
  await expect(page.locator('.hs-variant-pill').first()).toBeVisible();
});

test('9. Selecting a different variant updates the displayed price', async ({ page }) => {
  await page.goto('/herbs/product/ashwagandha-root-powder');
  const priceBefore = await page.locator('.hs-pdp__price').textContent();

  const variants = page.locator('.hs-variant-pill');
  await variants.nth(1).click();
  await page.waitForTimeout(150);

  const priceAfter = await page.locator('.hs-pdp__price').textContent();
  expect(priceAfter).not.toBe(priceBefore);
});

test('10. Add to Cart from a product detail page updates the header cart badge', async ({
  page,
}) => {
  await page.goto('/herbs/product/ashwagandha-root-powder');
  await page.locator('.hs-pdp__actions button', { hasText: 'Add to Cart' }).click();
  await expect(page.locator('.hs-icon-btn__badge').last()).toHaveText('1');
});

test('11. Add to Cart from a product card (catalog grid) also updates the badge', async ({
  page,
}) => {
  await page.goto('/herbs/products');
  await page.locator('.hs-product-card .hs-product-card__footer button').first().click();
  await expect(page.locator('.hs-icon-btn__badge').last()).toHaveText('1');
});

test('12. Quantity selector on the cart page updates the line total and subtotal', async ({
  page,
}) => {
  await page.goto('/herbs/product/ashwagandha-root-powder');
  await page.locator('.hs-pdp__actions button', { hasText: 'Add to Cart' }).click();
  await page.goto('/herbs/cart');

  const totalBefore = await page.locator('.hs-cart-line__total').first().textContent();
  await page.locator('.hs-qty button').last().click(); // "+" button
  await page.waitForTimeout(150);
  const totalAfter = await page.locator('.hs-cart-line__total').first().textContent();

  expect(totalAfter).not.toBe(totalBefore);
});

test('13. Removing an item from the cart empties it and shows the empty state', async ({
  page,
}) => {
  await page.goto('/herbs/product/ashwagandha-root-powder');
  await page.locator('.hs-pdp__actions button', { hasText: 'Add to Cart' }).click();
  await page.goto('/herbs/cart');

  await expect(page.locator('.hs-cart-line')).toHaveCount(1);
  await page.locator('.hs-cart-line__remove').click();
  await expect(page.locator('.hs-empty-state__title')).toContainText(/cart is empty/i);
});

test('14. Wishlist: adding from a product card shows it on the wishlist page', async ({ page }) => {
  await page.goto('/herbs/products');
  const firstCard = page.locator('.hs-product-card').first();
  const productName = await firstCard.locator('.hs-product-card__title').textContent();

  await firstCard.locator('.hs-product-card__icon-btn[aria-label*="wishlist" i]').click();
  await page.goto('/herbs/wishlist');

  await expect(page.locator('.hs-product-card__title').first()).toHaveText(
    productName?.trim() ?? ''
  );
});

test('15. Wishlist empty state shows when nothing has been saved', async ({ page }) => {
  await page.goto('/herbs/wishlist');
  await expect(page.locator('.hs-empty-state__title')).toContainText(/wishlist is empty/i);
});

test('16. Quick View modal opens from a product card, shows product info, and can add to cart', async ({
  page,
}) => {
  await page.goto('/herbs/products');
  const firstCard = page.locator('.hs-product-card').first();
  await firstCard.hover();
  await firstCard.locator('.hs-product-card__icon-btn[aria-label*="Quick view" i]').click();

  await expect(page.locator('.hs-modal')).toBeVisible();
  await expect(page.locator('#quick-view-title')).toBeVisible();

  await page.locator('.hs-modal .hs-btn', { hasText: 'Add to Cart' }).click();
  await expect(page.locator('.hs-icon-btn__badge').last()).toHaveText('1');
});

test('17. Quick View modal closes on Escape (keyboard accessibility)', async ({ page }) => {
  await page.goto('/herbs/products');
  const firstCard = page.locator('.hs-product-card').first();
  await firstCard.hover();
  await firstCard.locator('.hs-product-card__icon-btn[aria-label*="Quick view" i]').click();
  await expect(page.locator('.hs-modal')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.locator('.hs-modal')).not.toBeVisible();
});

test('18. Full cart-to-checkout navigation reaches the checkout page with the item listed', async ({
  page,
}) => {
  await page.goto('/herbs/product/ashwagandha-root-powder');
  await page.locator('.hs-pdp__actions button', { hasText: 'Add to Cart' }).click();
  await page.goto('/herbs/cart');
  await page.locator('.hs-btn', { hasText: 'Proceed to Checkout' }).click();

  await expect(page).toHaveURL(/\/herbs\/checkout/);
  await expect(page.locator('.hs-summary')).toContainText('Ashwagandha Root Powder');
});

test('19. Checkout with an empty cart shows the empty-cart state, not a broken form', async ({
  page,
}) => {
  await page.goto('/herbs/checkout');
  await expect(page.locator('.hs-empty-state__title')).toContainText(/cart is empty/i);
});

test('20. Related products on a PDP link to a different, real product', async ({ page }) => {
  await page.goto('/herbs/product/ashwagandha-root-powder');
  const relatedSection = page.locator('section', { hasText: 'Related Herbs' });
  if ((await relatedSection.count()) === 0) {
    test.skip(true, 'No related products scored for this product in the current seed catalogue.');
  }
  const relatedCard = relatedSection.locator('.hs-product-card').first();
  const relatedTitle = await relatedCard.locator('.hs-product-card__title').textContent();
  expect(relatedTitle?.trim()).not.toBe('');
  expect(relatedTitle?.trim()).not.toBe('Ashwagandha Root Powder');
});
