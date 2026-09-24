import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './auth';

/**
 * Admin write -> public page read round trip for the Videos CRUD feature
 * (`/admin/add-video`, `videos-list`, `src/lib/videos/repository.ts`).
 * Also guards that `/videos` (plural, contract-governed "broken by
 * design" B-01 page) is never touched by this feature — a distinction
 * the original audit missed and this feature deliberately preserved.
 */

const testId = Math.random().toString(36).slice(2, 8);
const TITLE = `E2E Video ${testId}`;
// dQw4w9WgXcQ is a real, stable, well-known YouTube video id — used only
// to exercise the embed src, never actually played by the test.
const VIDEO_ID = 'dQw4w9WgXcQ';

test.beforeEach(async ({ context, baseURL }) => {
  await loginAsAdmin(context, baseURL!);
});

test.afterEach(async ({ page }) => {
  await page.goto('/admin/videos-list');
  const row = page.locator('tr', { hasText: TITLE });
  if (await row.count()) {
    await row.locator('a[href^="/admin/destroy-video/"]').click();
  }
});

test('add a video, see its embed on /video, then delete it', async ({ page }) => {
  // 1. Create.
  await page.goto('/admin/add-video');
  await page.locator('input[name="title"]').fill(TITLE);
  await page.locator('input[name="youtubeUrl"]').fill(VIDEO_ID);
  await page.locator('select[name="status"]').selectOption('1');
  await page.getByRole('button', { name: 'Submit' }).click();

  // 2. Appears on the admin list.
  await page.goto('/admin/videos-list');
  await expect(page.locator('tr', { hasText: TITLE })).toBeVisible();
  await expect(page.locator('tr', { hasText: TITLE })).toContainText(VIDEO_ID);

  // 3. Appears as a real iframe embed on the public page.
  await page.goto('/video');
  const iframe = page.locator(`iframe[src*="${VIDEO_ID}"]`);
  await expect(iframe).toHaveCount(1);
  await expect(iframe).toHaveAttribute('title', TITLE);

  // 4. Delete, confirm removal.
  await page.goto('/admin/videos-list');
  const row = page.locator('tr', { hasText: TITLE });
  await row.locator('a[href^="/admin/destroy-video/"]').click();
  await expect(page).toHaveURL(/\/admin\/videos-list/);
  await expect(page.locator('tr', { hasText: TITLE })).toHaveCount(0);

  await page.goto('/video');
  await expect(page.locator(`iframe[src*="${VIDEO_ID}"]`)).toHaveCount(0);
});

test('/videos (plural) is untouched by the Videos CRUD feature', async ({ page }) => {
  const response = await page.goto('/videos');
  expect(response?.status()).toBe(200);
  // The real page shows "Coming Soon.." body copy from the broken-by-
  // design 404 view (see src/app/videos/page.tsx's header) — "404" only
  // appears in <title>, which body text doesn't include.
  await expect(page.locator('body')).toContainText('Coming Soon..');
  await expect(page).toHaveTitle(/404/);
  await expect(page.locator('iframe')).toHaveCount(0);
});
