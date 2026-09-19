import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './auth';

/**
 * Shallow "does it render when authenticated" smoke checks — CR-006
 * Phase 10 (`docs/CR-006-PHASE-10-PLAN.md` §2.2), one screen per
 * remaining phase not already covered by `redirects-crud.spec.ts`'s deep
 * flow. Each check only confirms the page reaches a 200 response and
 * renders its own admin-shell chrome (the sidebar/content-header every
 * admin page shares) — NOT full CRUD coverage of that module, which is
 * explicitly out of this phase's scope (plan §2.2's "not covered" list).
 */

test.beforeEach(async ({ context, baseURL }) => {
  await loginAsAdmin(context, baseURL!);
});

const SMOKE_PAGES: { path: string; heading: string; phase: string }[] = [
  { path: '/admin/order-list', heading: 'Order List', phase: 'Phase 3 — Orders' },
  { path: '/admin/homeopathy-list', heading: 'Homeopathy List', phase: 'Phase 4 — Catalog core' },
  {
    path: '/admin/wellness-categories',
    heading: 'Wellness Categories',
    phase: 'Phase 6 — Herbs/wellness',
  },
  { path: '/admin/pages-list', heading: 'Pages', phase: 'Phase 7 — Content CMS' },
  { path: '/admin/media-library', heading: 'Media Library', phase: 'Phase 8 — Media/SEO/Redirects' },
  { path: '/admin/admin-users-list', heading: 'Admin Users', phase: 'Phase 9 — Audit log' },
];

for (const { path, heading, phase } of SMOKE_PAGES) {
  test(`${phase}: ${path} renders for an authenticated admin`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1', { hasText: heading })).toBeVisible();
  });
}
