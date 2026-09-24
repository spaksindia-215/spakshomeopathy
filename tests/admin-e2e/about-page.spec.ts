import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './auth';

/**
 * Admin write -> public page read round trip for the About Page editor
 * feature (`/admin/edit-about`, `src/lib/about/repository.ts`).
 * Single-document collection, no delete — restores the pre-test heading
 * in `afterEach`, same pattern `site-settings.spec.ts` uses.
 */

const testId = Math.random().toString(36).slice(2, 8);
const TEST_HEADING = `E2E About Heading ${testId}`;

let originalHeading = '';

test.beforeEach(async ({ context, baseURL, page }) => {
  await loginAsAdmin(context, baseURL!);
  await page.goto('/admin/edit-about');
  originalHeading = await page.locator('#heading').inputValue();
});

test.afterEach(async ({ page }) => {
  await page.goto('/admin/edit-about');
  await page.locator('#heading').fill(originalHeading);
  await page.getByRole('button', { name: 'Save' }).click();
});

test('editing the About page heading updates the public /about page', async ({ page }) => {
  await page.goto('/admin/edit-about');
  await page.locator('#heading').fill(TEST_HEADING);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('.alert-success')).toBeVisible();

  await page.goto('/about');
  await expect(page.locator('body')).toContainText(TEST_HEADING);
});
