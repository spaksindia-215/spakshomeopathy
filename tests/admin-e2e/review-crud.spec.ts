import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './auth';

/**
 * Admin-side round trip for the Review add/edit/delete CRUD feature
 * (`/admin/add-review/[productId]`, `edit-review/[productId]/[reviewId]`,
 * `review-list`). ADMIN-SIDE ONLY, DELIBERATELY: grepped `src/app` and
 * confirmed no public page renders `product.reviews` anywhere — reviews
 * have no public-facing consumer to verify against yet (a real gap,
 * reported separately, not silently worked around here). This spec
 * confirms the admin CRUD itself (add/list/edit/delete) works correctly
 * against a real product's embedded `reviews` array.
 */

const testId = Math.random().toString(36).slice(2, 8);
const REVIEWER_NAME = `E2E Reviewer ${testId}`;
const REVIEW_TEXT = `E2E review text ${testId}`;
const EDITED_REVIEW_TEXT = `E2E EDITED review text ${testId}`;

let productId = '';

test.beforeEach(async ({ context, baseURL, page }) => {
  await loginAsAdmin(context, baseURL!);
  // Find a real product to attach the test review to.
  await page.goto('/admin/product-list');
  const firstEditLink = page.locator('a[href^="/admin/edit-product/"]').first();
  const href = await firstEditLink.getAttribute('href');
  if (!href) throw new Error('No products found in /admin/product-list — cannot run review CRUD test.');
  productId = href.split('/').pop()!;
});

test.afterEach(async ({ page }) => {
  await page.goto('/admin/review-list');
  const row = page.locator('tr', { hasText: REVIEWER_NAME });
  if (await row.count()) {
    await row.locator('a[href^="/admin/destroy-review/"]').click();
  }
});

test('add a review, see it on review-list, edit it, then delete it', async ({ page }) => {
  // 1. Add.
  await page.goto(`/admin/add-review/${productId}`);
  await page.locator('input[name="rName"]').fill(REVIEWER_NAME);
  await page.locator('select[name="rRating"]').selectOption('5');
  await page.locator('textarea[name="rReview"]').fill(REVIEW_TEXT);
  await page.locator('select[name="rStatus"]').selectOption('1');
  await page.getByRole('button', { name: 'Submit' }).click();

  // 2. Appears on review-list.
  await expect(page).toHaveURL(/\/admin\/review-list/);
  await expect(page.locator('tr', { hasText: REVIEWER_NAME })).toBeVisible();
  await expect(page.locator('tr', { hasText: REVIEWER_NAME })).toContainText(REVIEW_TEXT);

  // 3. Edit — change the review text, confirm the edit persisted.
  const row = page.locator('tr', { hasText: REVIEWER_NAME });
  await row.locator('a[href^="/admin/edit-review/"]').click();
  await expect(page.locator('textarea[name="rReview"]')).toHaveValue(REVIEW_TEXT);
  await page.locator('textarea[name="rReview"]').fill(EDITED_REVIEW_TEXT);
  await page.getByRole('button', { name: 'Submit' }).click();

  await expect(page).toHaveURL(/\/admin\/review-list/);
  await expect(page.locator('tr', { hasText: REVIEWER_NAME })).toContainText(EDITED_REVIEW_TEXT);

  // 4. Delete, confirm removal.
  const editedRow = page.locator('tr', { hasText: REVIEWER_NAME });
  await editedRow.locator('a[href^="/admin/destroy-review/"]').click();
  await expect(page).toHaveURL(/\/admin\/review-list/);
  await expect(page.locator('tr', { hasText: REVIEWER_NAME })).toHaveCount(0);
});
