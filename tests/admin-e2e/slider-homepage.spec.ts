import { test, expect } from '@playwright/test';
import { resolve } from 'path';
import { loginAsAdmin } from './auth';

/**
 * Admin write -> public page read round trip for the Slider-wired-into-
 * the-homepage feature (`/admin/add-slider`, `slider-list`,
 * `RedesignedHome.tsx`'s promo banner section). This resolves the
 * project's own documented "P-18 Preserved Defect" — sliders used to be
 * fully admin-manageable but never rendered anywhere; this test confirms
 * that connection actually works end to end.
 */

const testId = Math.random().toString(36).slice(2, 8);
const TITLE = `E2E Slider ${testId}`;
const FIXTURE_IMAGE = resolve(__dirname, '../../public/assets/images/about1.jpg');

test.beforeEach(async ({ context, baseURL }) => {
  await loginAsAdmin(context, baseURL!);
});

test.afterEach(async ({ page }) => {
  await page.goto('/admin/slider-list');
  const row = page.locator('tr', { hasText: TITLE });
  if (await row.count()) {
    await row.locator('a[href^="/admin/destroy-slider/"]').click();
  }
});

test('add an active slider, see it on the homepage promo banner, then delete it', async ({
  page,
}) => {
  // 1. Create, active.
  await page.goto('/admin/add-slider');
  await page.locator('input[name="slider_title"]').fill(TITLE);
  await page.locator('input[name="slider_subtitle"]').fill('E2E subtitle');
  await page.locator('input[name="slider_image"]').setInputFiles(FIXTURE_IMAGE);
  await page.locator('select[name="slider_status"]').selectOption('1');
  await page.getByRole('button', { name: 'Submit' }).click();

  // 2. Appears on the admin list.
  await page.goto('/admin/slider-list');
  await expect(page.locator('tr', { hasText: TITLE })).toBeVisible();

  // 3. Appears on the real homepage's promo banner section.
  await page.goto('/');
  await expect(page.locator('body')).toContainText(TITLE);

  // 4. Delete, confirm removal from the homepage.
  await page.goto('/admin/slider-list');
  const row = page.locator('tr', { hasText: TITLE });
  await row.locator('a[href^="/admin/destroy-slider/"]').click();
  await expect(page.locator('tr', { hasText: TITLE })).toHaveCount(0);

  await page.goto('/');
  await expect(page.locator('body')).not.toContainText(TITLE);
});
