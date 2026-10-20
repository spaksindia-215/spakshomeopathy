import { test, expect } from '@playwright/test';
import { resolve } from 'path';
import { loginAsAdmin } from './auth';

/**
 * Admin write -> public page read round trip for the Cosmetics CRUD
 * feature (`/admin/add-cosmetics`, `cosmetics-list`,
 * `edit-cosmetics/[id]`, `src/lib/cosmetics/db/*`). Confirms a product
 * added via the admin form actually renders on the previously-empty
 * `/homeopathy/cosmetics` page, that editing persists, and that deleting
 * it reverts the public page back to its "coming soon" empty state.
 */

const testId = Math.random().toString(36).slice(2, 8);
const NAME = `E2E Cosmetics Product ${testId}`;
const EDITED_NAME = `E2E EDITED Cosmetics Product ${testId}`;
const FIXTURE_IMAGE = resolve(__dirname, '../../public/assets/images/about1.jpg');

test.beforeEach(async ({ context, baseURL, page }) => {
  await loginAsAdmin(context, baseURL!);
  // The Delete button uses window.confirm() — registered once here (not
  // separately in the test body and afterEach) so both the test's own
  // delete step and the afterEach cleanup share one listener instead of
  // Playwright rejecting a second one as "already handled".
  page.on('dialog', (dialog) => dialog.accept());
});

test.afterEach(async ({ page }) => {
  // Best-effort cleanup via the admin list's edit->delete flow.
  await page.goto('/admin/cosmetics-list');
  for (const name of [NAME, EDITED_NAME]) {
    const row = page.locator('tr', { hasText: name });
    if (await row.count()) {
      await row.locator('a[href^="/admin/edit-cosmetics/"]').click();
      await page.getByRole('button', { name: 'Delete' }).click();
      await page.goto('/admin/cosmetics-list');
    }
  }
});

test('add a cosmetics product, see it on /cosmetics, edit it, then delete it', async ({
  page,
}) => {
  // 1. Create.
  await page.goto('/admin/add-cosmetics');
  await page.locator('#name').fill(NAME);
  await page.locator('#price').fill('299');
  await page.locator('#image').setInputFiles(FIXTURE_IMAGE);
  await page.getByRole('button', { name: 'Save Cosmetics Product' }).click();
  await expect(page.locator('.alert-success')).toBeVisible();

  // 2. Appears on the admin list.
  await page.goto('/admin/cosmetics-list');
  await expect(page.locator('tr', { hasText: NAME })).toBeVisible();

  // 3. Appears on the public page (previously always empty).
  await page.goto('/cosmetics');
  await expect(page.locator('body')).toContainText(NAME);

  // 4. Edit — change the name, confirm the edit persisted publicly.
  await page.goto('/admin/cosmetics-list');
  const row = page.locator('tr', { hasText: NAME });
  await row.locator('a[href^="/admin/edit-cosmetics/"]').click();
  await expect(page.locator('#name')).toHaveValue(NAME);
  await page.locator('#name').fill(EDITED_NAME);
  // The Heading field independently pre-fills with the product's current
  // heading (`HomeopathyProductCard` renders both `pName` and `pHeading`
  // as separate visible strings on a card) — update it too so this edit
  // fully replaces every visible occurrence of the old name, matching
  // what an admin doing a real rename would do.
  await page.locator('#heading').fill(EDITED_NAME);
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.locator('.alert-success')).toBeVisible();

  await page.goto('/cosmetics');
  await expect(page.locator('body')).toContainText(EDITED_NAME);
  await expect(page.locator('body')).not.toContainText(NAME);

  // 5. Delete, confirm the public page reverts to its empty state.
  await page.goto('/admin/cosmetics-list');
  const editedRow = page.locator('tr', { hasText: EDITED_NAME });
  await editedRow.locator('a[href^="/admin/edit-cosmetics/"]').click();
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page).toHaveURL(/\/admin\/cosmetics-list/);
  await expect(page.locator('tr', { hasText: EDITED_NAME })).toHaveCount(0);

  await page.goto('/cosmetics');
  await expect(page.locator('body')).not.toContainText(EDITED_NAME);
  await expect(page.locator('body')).toContainText('coming soon');
});
