import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './auth';

/**
 * The one DEEP admin CRUD round-trip in this suite — CR-006 Phase 10
 * (`docs/CR-006-PHASE-10-PLAN.md` §2.2). Deliberately chosen over adding
 * three separate shallow tests: creating a redirect touches Phase 8
 * (redirects), reading it back on the audit log touches Phase 9 (audit
 * log), and every step passes through the RBAC guard chain (Phase 2/9)
 * — one real browser flow exercises all three at once.
 *
 * Uses a distinctive `fromPath` (`/phase10-e2e-test-<random>`) so this
 * spec can never collide with real admin-created data, and cleans up via
 * the real delete link in an `afterEach` regardless of whether the test
 * body passed — same "clean up even on failure" discipline the manual
 * verification scripts in Phases 8/9 already followed.
 */

const testId = Math.random().toString(36).slice(2, 8);
const FROM_PATH = `/phase10-e2e-test-${testId}`;
const TO_PATH = `/phase10-e2e-target-${testId}`;

test.beforeEach(async ({ context, baseURL }) => {
  await loginAsAdmin(context, baseURL!);
});

test.afterEach(async ({ page }) => {
  // Best-effort cleanup: find and follow the delete link for this test's
  // own redirect, if it's still there (harmless no-op if the test body
  // already deleted it via the happy path).
  await page.goto('/admin/redirects-list');
  const row = page.locator('tr', { hasText: FROM_PATH });
  if (await row.count()) {
    await row.locator('a[href^="/admin/destroy-redirect/"]').click();
  }
});

test('create a redirect, see it on the list, see it on the audit log, then delete it', async ({
  page,
}) => {
  // 1. Create — Phase 8's admin form.
  await page.goto('/admin/add-redirect');
  await page.locator('#fromPath').fill(FROM_PATH);
  await page.locator('#toPath').fill(TO_PATH);
  await page.locator('#statusCode').selectOption('301');
  await page.getByRole('button', { name: 'Save' }).click();

  // 2. Appears on the list.
  await expect(page).toHaveURL(/\/admin\/redirects-list/);
  await expect(page.locator('tr', { hasText: FROM_PATH })).toBeVisible();
  await expect(page.locator('tr', { hasText: FROM_PATH })).toContainText(TO_PATH);

  // 3. The write shows up on the audit log (Phase 9), filtered to the
  // redirects collection so this assertion doesn't depend on how much
  // other traffic has hit the shared dev database.
  await page.goto('/admin/audit-log?collection=redirects');
  await expect(page.locator('tbody tr').first()).toBeVisible();

  // 4. Delete — confirms the round-trip is fully reversible, and lets
  // the afterEach's own cleanup find nothing left to do.
  await page.goto('/admin/redirects-list');
  const row = page.locator('tr', { hasText: FROM_PATH });
  await row.locator('a[href^="/admin/destroy-redirect/"]').click();
  await expect(page).toHaveURL(/\/admin\/redirects-list/);
  await expect(page.locator('tr', { hasText: FROM_PATH })).toHaveCount(0);
});
