import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './auth';

/**
 * Admin write -> public page read round trip for the Herb Articles CRUD
 * feature (`/admin/add-herb-article`, `herb-articles-list`,
 * `src/lib/herbArticles/repository.ts`). Confirms the article appears in
 * the `/herbs` teaser grid AND that its own `/herbs/learn/[slug]` detail
 * page renders (not a 404) with the right title/excerpt.
 */

const testId = Math.random().toString(36).slice(2, 8);
const TITLE = `E2E Herb Article ${testId}`;
const SLUG = `e2e-herb-article-${testId}`;
const EXCERPT = `E2E excerpt for article ${testId}`;

test.beforeEach(async ({ context, baseURL }) => {
  await loginAsAdmin(context, baseURL!);
});

test.afterEach(async ({ page }) => {
  await page.goto('/admin/herb-articles-list');
  const row = page.locator('tr', { hasText: TITLE });
  if (await row.count()) {
    await row.locator('a[href^="/admin/destroy-herb-article/"]').click();
  }
});

test('add a herb article, see it on /herbs and its own detail page, then delete it', async ({
  page,
}) => {
  // 1. Create.
  await page.goto('/admin/add-herb-article');
  await page.locator('input[name="title"]').fill(TITLE);
  await page.locator('input[name="slug"]').fill(SLUG);
  await page.locator('input[name="category"]').fill('E2E Category');
  await page.locator('input[name="readTime"]').fill('1 min read');
  await page.locator('textarea[name="excerpt"]').fill(EXCERPT);
  await page.locator('select[name="status"]').selectOption('1');
  await page.getByRole('button', { name: 'Submit' }).click();

  // 2. Appears on the admin list.
  await page.goto('/admin/herb-articles-list');
  await expect(page.locator('tr', { hasText: TITLE })).toBeVisible();

  // 3. Appears in the /herbs teaser grid, linking to its detail page.
  await page.goto('/herbs');
  const card = page.locator('a', { hasText: TITLE });
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute('href', `/herbs/learn/${SLUG}`);

  // 4. Its detail page renders with the real title/excerpt, not a 404.
  const response = await page.goto(`/herbs/learn/${SLUG}`);
  expect(response?.status()).toBe(200);
  await expect(page.locator('h1')).toContainText(TITLE);
  await expect(page.locator('body')).toContainText(EXCERPT);

  // 5. Delete, confirm removal from both.
  await page.goto('/admin/herb-articles-list');
  const row = page.locator('tr', { hasText: TITLE });
  await row.locator('a[href^="/admin/destroy-herb-article/"]').click();
  await expect(page.locator('tr', { hasText: TITLE })).toHaveCount(0);

  await page.goto('/herbs');
  await expect(page.locator('body')).not.toContainText(TITLE);

  const afterDelete = await page.goto(`/herbs/learn/${SLUG}`);
  expect(afterDelete?.status()).toBe(404);
});
