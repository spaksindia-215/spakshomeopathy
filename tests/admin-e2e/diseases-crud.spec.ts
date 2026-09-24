import { test, expect } from '@playwright/test';
import { resolve } from 'path';
import { loginAsAdmin } from './auth';

/**
 * Admin write -> public page read round trip for the Diseases CRUD
 * feature (`/admin/add-disease`, `diseases-list`,
 * `src/lib/diseases/repository.ts`). Confirms a real, non-empty booking
 * URL renders on `/all-diseases` — this feature deliberately fixes the
 * page's own original "empty href" defect (see
 * `src/lib/diseases/schema.ts`'s header), so this is also a regression
 * guard against that fix silently regressing.
 */

const testId = Math.random().toString(36).slice(2, 8);
const TITLE = `E2E Disease ${testId}`;
const BOOKING_URL = `https://example.com/e2e-book-${testId}`;
const FIXTURE_IMAGE = resolve(__dirname, '../../public/assets/images/about1.jpg');

test.beforeEach(async ({ context, baseURL }) => {
  await loginAsAdmin(context, baseURL!);
});

test.afterEach(async ({ page }) => {
  await page.goto('/admin/diseases-list');
  const row = page.locator('tr', { hasText: TITLE });
  if (await row.count()) {
    await row.locator('a[href^="/admin/destroy-disease/"]').click();
  }
});

test('add a disease, see it on /all-diseases with a real booking link, then delete it', async ({
  page,
}) => {
  // 1. Create.
  await page.goto('/admin/add-disease');
  await page.locator('input[name="title"]').fill(TITLE);
  await page.locator('input[name="bookingUrl"]').fill(BOOKING_URL);
  await page.locator('input[name="image"]').setInputFiles(FIXTURE_IMAGE);
  await page.locator('select[name="status"]').selectOption('1');
  await page.getByRole('button', { name: 'Submit' }).click();

  // 2. Appears on the admin list.
  await expect(page).toHaveURL(/\/admin\/add-disease/);
  await page.goto('/admin/diseases-list');
  await expect(page.locator('tr', { hasText: TITLE })).toBeVisible();

  // 3. Appears on the public page with a real (non-empty) booking href.
  await page.goto('/all-diseases');
  const card = page.locator('.tour-box', { hasText: TITLE });
  await expect(card).toBeVisible();
  const href = await card.locator('a', { hasText: TITLE }).getAttribute('href');
  expect(href).toBe(BOOKING_URL);

  // 4. Delete, confirm removal from both admin list and public page.
  await page.goto('/admin/diseases-list');
  const row = page.locator('tr', { hasText: TITLE });
  await row.locator('a[href^="/admin/destroy-disease/"]').click();
  await expect(page).toHaveURL(/\/admin\/diseases-list/);
  await expect(page.locator('tr', { hasText: TITLE })).toHaveCount(0);

  await page.goto('/all-diseases');
  await expect(page.locator('body')).not.toContainText(TITLE);
});
