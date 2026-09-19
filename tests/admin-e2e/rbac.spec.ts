import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './auth';

/**
 * Admin CMS auth/RBAC e2e tests — CR-006 Phase 10
 * (`docs/CR-006-PHASE-10-PLAN.md` §2.2). The negative case (no cookie)
 * proves `requireAdminSession()` still gates real requests; the positive
 * case proves the signed-cookie injection technique (`./auth.ts`) itself
 * works, which every other spec in this suite depends on.
 */

test('unauthenticated access to an admin route redirects to /admin/login', async ({ page }) => {
  await page.goto('/admin/home');
  await expect(page).toHaveURL(/\/admin\/login/);
});

test('a signed session cookie authenticates access to /admin/home', async ({
  page,
  context,
  baseURL,
}) => {
  await loginAsAdmin(context, baseURL!);
  await page.goto('/admin/home');
  await expect(page).not.toHaveURL(/\/admin\/login/);
});
