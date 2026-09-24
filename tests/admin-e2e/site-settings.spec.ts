import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './auth';

/**
 * Admin write -> public page read round trip for the Site Settings
 * feature (`/admin/site-settings`, `src/lib/settings/repository.ts`).
 * Single-document collection, no delete — "cleanup" means restoring the
 * pre-test snapshot read in `beforeEach`, same reasoning
 * `about-page.spec.ts` uses for its own single-document collection.
 */

const testId = Math.random().toString(36).slice(2, 8);
const TEST_EMAIL = `e2e-${testId}@example.com`;
const TEST_PHONE = `+91 99999${testId.padStart(5, '0').slice(0, 5)}`;

let originalEmail = '';
let originalPhone = '';

test.beforeEach(async ({ context, baseURL, page }) => {
  await loginAsAdmin(context, baseURL!);
  await page.goto('/admin/site-settings');
  originalEmail = await page.locator('#contactEmail').inputValue();
  originalPhone = await page.locator('#contactPhone').inputValue();
});

test.afterEach(async ({ page }) => {
  // Best-effort restore, regardless of whether the test body passed.
  await page.goto('/admin/site-settings');
  await page.locator('#contactEmail').fill(originalEmail);
  await page.locator('#contactPhone').fill(originalPhone);
  await page.getByRole('button', { name: 'Save' }).click();
});

test('editing contact email/phone in Site Settings updates the public footer and contact page', async ({
  page,
}) => {
  // 1. Save new values.
  await page.goto('/admin/site-settings');
  await page.locator('#contactEmail').fill(TEST_EMAIL);
  await page.locator('#contactPhone').fill(TEST_PHONE);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('.alert-success')).toBeVisible();

  // 2. Public footer (rendered on /about via PublicFooter).
  await page.goto('/about');
  await expect(page.locator('body')).toContainText(TEST_EMAIL);
  await expect(page.locator('body')).toContainText(TEST_PHONE);

  // 3. Contact page's own "Contact Detail" block.
  await page.goto('/contact');
  await expect(page.locator('body')).toContainText(TEST_EMAIL);
  await expect(page.locator('body')).toContainText(TEST_PHONE);
});
