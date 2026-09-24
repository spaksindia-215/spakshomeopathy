import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './auth';

/**
 * Admin write -> public page read round trip for the shared Testimonials
 * CRUD feature (`/admin/add-testimonial`, `testimonials-list`,
 * `src/lib/testimonials/repository.ts`). Confirms the `sections` tagging
 * actually scopes a testimonial to only the section(s) it's tagged for —
 * the whole point of the shared-pool design over two separate CRUDs.
 */

const testId = Math.random().toString(36).slice(2, 8);
const HERBS_NAME = `E2E Herbs Reviewer ${testId}`;
const HOMEOPATHY_NAME = `E2E Homeopathy Reviewer ${testId}`;

test.beforeEach(async ({ context, baseURL }) => {
  await loginAsAdmin(context, baseURL!);
});

test.afterEach(async ({ page }) => {
  await page.goto('/admin/testimonials-list');
  for (const name of [HERBS_NAME, HOMEOPATHY_NAME]) {
    const row = page.locator('tr', { hasText: name });
    if (await row.count()) {
      await row.locator('a[href^="/admin/destroy-testimonial/"]').click();
      await page.goto('/admin/testimonials-list');
    }
  }
});

async function addTestimonial(
  page: import('@playwright/test').Page,
  name: string,
  section: 'herbs' | 'homeopathy'
) {
  await page.goto('/admin/add-testimonial');
  await page.locator('input[name="name"]').fill(name);
  await page.locator('input[name="location"]').fill('E2E City');
  await page.locator('select[name="rating"]').selectOption('5');
  await page.locator('textarea[name="quote"]').fill(`E2E quote from ${name}`);
  // Both checkboxes start with only "herbs" checked by default (see
  // add-testimonial/page.tsx) — explicitly set both to the desired state
  // rather than relying on that default.
  const herbsBox = page.locator('input[name="sections"][value="herbs"]');
  const homeopathyBox = page.locator('input[name="sections"][value="homeopathy"]');
  if (section === 'herbs') {
    await herbsBox.check();
    await homeopathyBox.uncheck();
  } else {
    await herbsBox.uncheck();
    await homeopathyBox.check();
  }
  await page.locator('select[name="status"]').selectOption('1');
  await page.getByRole('button', { name: 'Submit' }).click();
}

test('a testimonial tagged herbs-only appears on /herbs but not /homeopathy', async ({ page }) => {
  await addTestimonial(page, HERBS_NAME, 'herbs');

  await page.goto('/herbs');
  await expect(page.locator('body')).toContainText(HERBS_NAME);

  await page.goto('/homeopathy');
  await expect(page.locator('body')).not.toContainText(HERBS_NAME);
});

test('a testimonial tagged homeopathy-only appears on /homeopathy but not /herbs', async ({
  page,
}) => {
  await addTestimonial(page, HOMEOPATHY_NAME, 'homeopathy');

  await page.goto('/homeopathy');
  await expect(page.locator('body')).toContainText(HOMEOPATHY_NAME);

  await page.goto('/herbs');
  await expect(page.locator('body')).not.toContainText(HOMEOPATHY_NAME);
});
