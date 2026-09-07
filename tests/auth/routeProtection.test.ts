/**
 * Route-protection COVERAGE tests — added M4 (route guard slice).
 *
 * LABEL: STRUCTURAL. Complements `tests/auth/guard.test.ts` (which
 * exercises `requireAdminSession`'s own logic in isolation) by asserting,
 * against the actual source tree, WHICH files call the guard and which
 * deliberately do not — this is what actually determines real
 * request-time behavior in Next.js (a Server Component/layout that never
 * calls `requireAdminSession()` cannot be protected by it, regardless of
 * what the guard function itself does in isolation).
 *
 * Covers the M4-AUTH task's remaining required scenarios that aren't unit
 * -testable against `guard.ts` alone:
 *   - the admin shell layout (protecting all ~25 pages under it) DOES
 *     call requireAdminSession
 *   - the admin login page does NOT call the guard (requirement: "Do not
 *     protect the public/admin login page itself")
 *   - /myaccount, /profile, /change-password DO call requireBuyerSession
 *   - update-profile route.ts DOES call requireBuyerSession independently
 *     (a Route Handler, unlike a page, isn't "covered" by a page load —
 *     it must guard itself)
 *   - public routes (home, login, register) do NOT call either guard
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const SRC_APP = join(__dirname, '../../src/app');

function read(relativePath: string): string {
  return readFileSync(join(SRC_APP, relativePath), 'utf-8');
}

describe('route protection wiring (STRUCTURAL — source inspection)', () => {
  it('admin shell layout imports and calls requireAdminSession', () => {
    const layout = read('admin/(shell)/layout.tsx');
    expect(layout).toMatch(
      /import\s*{\s*requireAdminSession\s*}\s*from\s*['"]@\/lib\/auth\/guard['"]/
    );
    expect(layout).toMatch(/await\s+requireAdminSession\(\)/);
  });

  // Matches only an actual ES import of the guard module — deliberately
  // NOT a bare `requireAdminSession` text match, since that identifier is
  // legitimately mentioned in prose comments (e.g. admin/login/page.tsx's
  // own header, explaining why the demo link below is no longer a live
  // bypass) without the file importing or calling it.
  const GUARD_IMPORT = /from\s*['"]@\/lib\/auth\/guard['"]/;

  it('admin login page does NOT import the guard (must remain publicly reachable)', () => {
    const loginPage = read('admin/login/page.tsx');
    expect(loginPage).not.toMatch(GUARD_IMPORT);
  });

  it('public routes (home, login, register, contact) do NOT import either guard', () => {
    for (const page of [
      'home/page.tsx',
      'login/page.tsx',
      'register/page.tsx',
      'contact/page.tsx',
    ]) {
      expect(read(page)).not.toMatch(GUARD_IMPORT);
    }
  });

  it('myaccount page imports and calls requireBuyerSession (buyer-guard slice)', () => {
    const page = read('myaccount/page.tsx');
    expect(page).toMatch(
      /import\s*{\s*requireBuyerSession\s*}\s*from\s*['"]@\/lib\/auth\/guard['"]/
    );
    expect(page).toMatch(/await\s+requireBuyerSession\(\)/);
    // Must actually CALL the buyer guard, not the admin one — a bare text
    // mention of `requireAdminSession` in a prose comment (e.g. comparing
    // placement patterns) does not count as calling it.
    expect(page).not.toMatch(/await\s+requireAdminSession\(\)/);
  });

  it('profile page imports and calls requireBuyerSession (buyer profile/password slice)', () => {
    const page = read('profile/page.tsx');
    expect(page).toMatch(
      /import\s*{\s*requireBuyerSession\s*}\s*from\s*['"]@\/lib\/auth\/guard['"]/
    );
    expect(page).toMatch(/await\s+requireBuyerSession\(\)/);
  });

  it('change-password page calls requireBuyerSession from BOTH the page render AND the Server Action', () => {
    const page = read('change-password/page.tsx');
    expect(page).toMatch(
      /import\s*{\s*requireBuyerSession\s*}\s*from\s*['"]@\/lib\/auth\/guard['"]/
    );
    // Two independent call sites are required here, not one: the page
    // component (gates viewing the form) and the Server Action (gates the
    // actual submission — a Server Action is a real network endpoint the
    // client can invoke directly, so it cannot rely on the page render
    // having already guarded access).
    const callSites = page.match(/await\s+requireBuyerSession\(\)/g) ?? [];
    expect(callSites.length).toBeGreaterThanOrEqual(2);
  });

  it('update-profile route.ts imports and calls requireBuyerSession independently', () => {
    const route = read('update-profile/route.ts');
    expect(route).toMatch(
      /import\s*{\s*requireBuyerSession\s*}\s*from\s*['"]@\/lib\/auth\/guard['"]/
    );
    expect(route).toMatch(/await\s+requireBuyerSession\(\)/);
  });

  it('the pre-existing /update-password GET page (HomeController@UpdatePassword, the reset-password flow) is untouched by the buyer-guard slice', () => {
    const page = read('update-password/page.tsx');
    // Must remain public — this is a DIFFERENT Laravel controller
    // (HomeController@UpdatePassword, the forgot-password reset flow, not
    // inside checkBuyer) that happens to share a URL with the buyer's
    // change-password POST target. See change-password/page.tsx's header
    // for the full route-collision explanation.
    expect(page).not.toMatch(GUARD_IMPORT);
  });

  it('manage-orders page imports and calls requireBuyerSession (buyer-orders slice)', () => {
    const page = read('manage-orders/page.tsx');
    expect(page).toMatch(
      /import\s*{\s*requireBuyerSession\s*}\s*from\s*['"]@\/lib\/auth\/guard['"]/
    );
    expect(page).toMatch(/await\s+requireBuyerSession\(\)/);
  });

  it('view-order/[orderId] page imports and calls requireBuyerSession (buyer-orders slice, B-12 correction)', () => {
    const page = read('view-order/[orderId]/page.tsx');
    expect(page).toMatch(
      /import\s*{\s*requireBuyerSession\s*}\s*from\s*['"]@\/lib\/auth\/guard['"]/
    );
    expect(page).toMatch(/await\s+requireBuyerSession\(\)/);
  });

  it('cancel-order route.ts imports and calls requireBuyerSession independently (a Route Handler, not covered by any page render)', () => {
    const route = read('cancel-order/route.ts');
    expect(route).toMatch(
      /import\s*{\s*requireBuyerSession\s*}\s*from\s*['"]@\/lib\/auth\/guard['"]/
    );
    expect(route).toMatch(/await\s+requireBuyerSession\(\)/);
  });

  it('login route (POST /user-login) has no guard import — reachable without a session', () => {
    const route = read('user-login/route.ts');
    expect(route).not.toMatch(GUARD_IMPORT);
  });

  it('admin user-login route (POST /admin/user-login) has no guard import — reachable without a session', () => {
    const route = read('admin/user-login/route.ts');
    expect(route).not.toMatch(GUARD_IMPORT);
  });

  it('search-products route.ts (M5-C) has no guard import — Laravel source has no auth check on this route either', () => {
    const route = read('search-products/route.ts');
    expect(route).not.toMatch(GUARD_IMPORT);
  });

  it('search-results and diseases-list pages (M5-C) have no guard import — public catalog pages', () => {
    expect(read('search-results/page.tsx')).not.toMatch(GUARD_IMPORT);
    expect(read('diseases-list/page.tsx')).not.toMatch(GUARD_IMPORT);
  });

  it("pincode write routes (M5-E) import and call requireAdminSession independently — all 6 pincode routes sit inside admin.php's userAuth group", () => {
    for (const routePath of [
      'admin/save-pincode/route.ts',
      'admin/update-pincode/route.ts',
      'admin/destroy-pincode/[id]/route.ts',
    ]) {
      const route = read(routePath);
      expect(route).toMatch(
        /import\s*{\s*requireAdminSession\s*}\s*from\s*['"]@\/lib\/auth\/guard['"]/
      );
      expect(route).toMatch(/await\s+requireAdminSession\(\)/);
    }
  });

  it("slider write routes (M5-E) import and call requireAdminSession independently — all 6 slider routes sit inside admin.php's userAuth group", () => {
    for (const routePath of [
      'admin/save-slider/route.ts',
      'admin/update-slider/route.ts',
      'admin/destroy-slider/[id]/route.ts',
    ]) {
      const route = read(routePath);
      expect(route).toMatch(
        /import\s*{\s*requireAdminSession\s*}\s*from\s*['"]@\/lib\/auth\/guard['"]/
      );
      expect(route).toMatch(/await\s+requireAdminSession\(\)/);
    }
  });

  it("blog-category write routes (M5-E) import and call requireAdminSession independently — all 6 blog-category routes sit inside admin.php's userAuth group", () => {
    for (const routePath of [
      'admin/save-blog-category/route.ts',
      'admin/update-blog-category/route.ts',
      'admin/destroy-blog-category/[id]/route.ts',
    ]) {
      const route = read(routePath);
      expect(route).toMatch(
        /import\s*{\s*requireAdminSession\s*}\s*from\s*['"]@\/lib\/auth\/guard['"]/
      );
      expect(route).toMatch(/await\s+requireAdminSession\(\)/);
    }
  });

  it("category (disease/herb tree) write routes (M5-E) import and call requireAdminSession independently — all 4 sit inside admin.php's userAuth group (no destroy route exists for this table — see categoryRepository.ts's own note)", () => {
    for (const routePath of [
      'admin/save-cat/route.ts',
      'admin/update-category/route.ts',
      'admin/update-category-status-active/[id]/route.ts',
      'admin/update-category-status-inactive/[id]/route.ts',
    ]) {
      const route = read(routePath);
      expect(route).toMatch(
        /import\s*{\s*requireAdminSession\s*}\s*from\s*['"]@\/lib\/auth\/guard['"]/
      );
      expect(route).toMatch(/await\s+requireAdminSession\(\)/);
    }
  });

  it("blog write routes (M5-E) import and call requireAdminSession independently — all 3 sit inside admin.php's userAuth group", () => {
    for (const routePath of [
      'admin/save-blog/route.ts',
      'admin/update-blog/route.ts',
      'admin/destroy-blog/[id]/route.ts',
    ]) {
      const route = read(routePath);
      expect(route).toMatch(
        /import\s*{\s*requireAdminSession\s*}\s*from\s*['"]@\/lib\/auth\/guard['"]/
      );
      expect(route).toMatch(/await\s+requireAdminSession\(\)/);
    }
  });

  it("post write routes (M5-E) import and call requireAdminSession independently — all 3 sit inside admin.php's userAuth group", () => {
    for (const routePath of [
      'admin/save-post/route.ts',
      'admin/update-post/route.ts',
      'admin/destroy-post/[post_id]/route.ts',
    ]) {
      const route = read(routePath);
      expect(route).toMatch(
        /import\s*{\s*requireAdminSession\s*}\s*from\s*['"]@\/lib\/auth\/guard['"]/
      );
      expect(route).toMatch(/await\s+requireAdminSession\(\)/);
    }
  });

  it("product_category write routes (M5-E, all 3 levels) import and call requireAdminSession independently — all 4 sit inside admin.php's userAuth group", () => {
    for (const routePath of [
      'admin/save-product-category/route.ts',
      'admin/save-product-subcat/route.ts',
      'admin/save-other-category/route.ts',
      'admin/destroy-product-category/[id]/route.ts',
    ]) {
      const route = read(routePath);
      expect(route).toMatch(
        /import\s*{\s*requireAdminSession\s*}\s*from\s*['"]@\/lib\/auth\/guard['"]/
      );
      expect(route).toMatch(/await\s+requireAdminSession\(\)/);
    }
  });

  it('every page under admin/(shell)/ is a descendant of the guarded layout (no sibling escape route)', () => {
    // Structural sanity check: Next.js applies a layout.tsx to every
    // page.tsx nested under it, with no per-page opt-out mechanism, so
    // "the layout calls the guard" (asserted above) is sufficient to
    // cover every page under (shell)/ without enumerating all ~25 by
    // name. This test only guards against a page accidentally being
    // moved outside the (shell) group, which would be a directory-
    // structure regression, not a guard-logic one.
    const shellDir = join(SRC_APP, 'admin/(shell)');
    const entries = readdirSync(shellDir);
    expect(entries.length).toBeGreaterThan(0);
    // admin/login must NOT be one of the (shell)-nested entries.
    expect(entries).not.toContain('login');
  });
});

/**
 * CSRF-equivalent protection wiring — added M5-B. Same structural-
 * inspection rationale as the guard tests above: whether a page's rendered
 * `<form>` embeds a real `_token` (not a hardcoded empty-string
 * placeholder) and whether the corresponding route.ts actually verifies
 * it are both facts about the SOURCE TREE, not about `csrf.ts`'s own logic
 * in isolation (already unit-tested in `tests/auth/csrf.test.ts`).
 *
 * SCOPE: only the 6 POST route.ts handlers Laravel's `VerifyCsrfToken`
 * actually protects (`isReading()` exempts GET/HEAD/OPTIONS — confirmed
 * directly against `vendor/laravel/framework/.../VerifyCsrfToken.php` this
 * slice) — `logout`, `admin/user-logout`, `cancel-order` are all GET and
 * correctly excluded, asserted explicitly below (a GET route gaining a
 * CSRF check would be new protection Laravel never had, not a parity fix).
 */
describe('CSRF-equivalent protection wiring (STRUCTURAL — source inspection)', () => {
  const CSRF_IMPORT = /from\s*['"]@\/lib\/auth\/csrf['"]/;
  const VERIFY_CALL = /verifyCsrfToken\(/;

  const PROTECTED_ROUTES = [
    'user-login/route.ts',
    'save-user/route.ts',
    'save-enquiry/route.ts',
    'save-appointment/route.ts',
    'admin/user-login/route.ts',
    'update-profile/route.ts',
    // M5-C: search-products has no live UI entry point (the only Laravel
    // form that posts here is HTML-commented-out, §BCN resolution), but
    // the route itself is real, POST, and Laravel's VerifyCsrfToken has
    // zero route exclusions — so CSRF is applied here too, for the same
    // reason it would apply if the header form were ever un-commented.
    'search-products/route.ts',
    // M5-E: both add-pin-code.blade.php and edit-pincode.blade.php have
    // {{csrf_field()}} on their forms (verified directly this slice) —
    // destroy-pincode is the GET-based delete and is correctly NOT in this
    // list (see EXEMPT_GET_ROUTES below).
    'admin/save-pincode/route.ts',
    'admin/update-pincode/route.ts',
    // M5-E: both add-slider.blade.php and edit-slider.blade.php have
    // {{csrf_field()}} on their forms — destroy-slider is the GET-based
    // delete and is correctly NOT in this list.
    'admin/save-slider/route.ts',
    'admin/update-slider/route.ts',
    // M5-E: both add-blog-category.blade.php and edit-blog-category.blade.php
    // have {{csrf_field()}} on their forms — destroy-blog-category is the
    // GET-based delete and is correctly NOT in this list.
    'admin/save-blog-category/route.ts',
    'admin/update-blog-category/route.ts',
    // M5-E: both add-category.blade.php and edit-category.blade.php have
    // @csrf on their forms — the two status-toggle routes are GET and
    // correctly NOT in this list (see EXEMPT_GET_ROUTES below); no
    // destroy route exists for this table at all.
    'admin/save-cat/route.ts',
    'admin/update-category/route.ts',
    // M5-E: both add-blog.blade.php and edit-blog.blade.php have
    // {{csrf_field()}} on their forms — destroy-blog is the GET-based
    // delete and is correctly NOT in this list.
    'admin/save-blog/route.ts',
    'admin/update-blog/route.ts',
    // M5-E: both add-post.blade.php and edit-post.blade.php have
    // {{csrf_field()}} on their forms — destroy-post is the GET-based
    // delete and is correctly NOT in this list.
    'admin/save-post/route.ts',
    'admin/update-post/route.ts',
    // M5-E: add-product-category.blade.php, add-product-subcategory.blade.php,
    // and add-other-category.blade.php all have {{csrf_field()}} on their
    // forms — destroy-product-category is the GET-based shared delete
    // and is correctly NOT in this list.
    'admin/save-product-category/route.ts',
    'admin/save-product-subcat/route.ts',
    'admin/save-other-category/route.ts',
  ];

  it.each(PROTECTED_ROUTES)('%s imports and calls verifyCsrfToken', (routePath) => {
    const route = read(routePath);
    expect(route).toMatch(CSRF_IMPORT);
    expect(route).toMatch(VERIFY_CALL);
  });

  const EXEMPT_GET_ROUTES = [
    'logout/route.ts',
    'admin/user-logout/route.ts',
    'cancel-order/route.ts',
    // M5-E: DestroyPinCode is GET in source (AdminController.php:1136),
    // IR-3 preserves that verb — GET destructive operations stay GET.
    'admin/destroy-pincode/[id]/route.ts',
    // M5-E: DestroySlider is GET in source (AdminController.php:1207),
    // same IR-3 reasoning.
    'admin/destroy-slider/[id]/route.ts',
    // M5-E: DestroyBlogCategory is GET in source (AdminController.php:910),
    // same IR-3 reasoning.
    'admin/destroy-blog-category/[id]/route.ts',
    // M5-E: UpdateCategoryStausActive/Inactive are GET in source
    // (AdminController.php:418, 427) — status-toggle links, not forms;
    // Laravel's VerifyCsrfToken only checks non-GET requests either way.
    'admin/update-category-status-active/[id]/route.ts',
    'admin/update-category-status-inactive/[id]/route.ts',
    // M5-E: DestroyBlog is GET in source (AdminController.php:1072), same
    // IR-3 reasoning.
    'admin/destroy-blog/[id]/route.ts',
    // M5-E: DestroyPost is GET in source (AdminController.php:827), same
    // IR-3 reasoning.
    'admin/destroy-post/[post_id]/route.ts',
    // M5-E: DestroyCategory (the shared product_category delete handler)
    // is GET in source (AdminController.php:188), same IR-3 reasoning.
    'admin/destroy-product-category/[id]/route.ts',
  ];

  it.each(EXEMPT_GET_ROUTES)(
    '%s does NOT import csrf.ts — correctly exempt, Laravel CSRF only checks non-GET requests',
    (routePath) => {
      const route = read(routePath);
      expect(route).not.toMatch(CSRF_IMPORT);
    }
  );

  const FORMS_WITH_REAL_TOKEN = [
    'login/page.tsx',
    'register/page.tsx',
    'seller-register/page.tsx',
    'admin/login/page.tsx',
    'profile/page.tsx',
    'contact/page.tsx',
    'consultancy/page.tsx',
    // M5-E
    'admin/(shell)/add-pin-code/page.tsx',
    'admin/(shell)/edit-pincode/[id]/page.tsx',
    'admin/(shell)/add-slider/page.tsx',
    'admin/(shell)/edit-slider/[id]/page.tsx',
    'admin/(shell)/add-blog-category/page.tsx',
    'admin/(shell)/edit-blog-category/[id]/page.tsx',
    'admin/(shell)/add-hurbcat/page.tsx',
    'admin/(shell)/edit-category/[id]/page.tsx',
    'admin/(shell)/add-blog/page.tsx',
    'admin/(shell)/edit-blog/[id]/page.tsx',
    'admin/(shell)/add-post/page.tsx',
    'admin/(shell)/edit-post/[post_id]/page.tsx',
    'admin/(shell)/add-product-category/page.tsx',
    'admin/(shell)/edit-product-category/[id]/page.tsx',
    'admin/(shell)/add-product-subcategory/page.tsx',
    'admin/(shell)/add-other-category/page.tsx',
  ];

  it.each(FORMS_WITH_REAL_TOKEN)(
    '%s imports generateCsrfToken and embeds a real (non-empty-placeholder) _token field',
    (pagePath) => {
      const page = read(pagePath);
      expect(page).toMatch(
        /import\s*{\s*generateCsrfToken\s*}\s*from\s*['"]@\/lib\/auth\/csrf['"]/
      );
      expect(page).toMatch(/generateCsrfToken\(\)/);
      // The hidden input must bind to the generated variable, not a
      // hardcoded empty string — this is the actual regression this test
      // guards against: `/contact` previously shipped `value=""` as a
      // placeholder (M1 scope) and it would be easy to silently leave that
      // placeholder in place while merely importing the function nearby.
      expect(page).toMatch(/name="_token"\s+value={csrfToken}/);
      expect(page).not.toMatch(/name="_token"\s+value=""/);
    }
  );

  it('change-password page (Server Action) does NOT need csrf.ts — Next.js Server Actions get an automatic same-origin check', () => {
    // Documented, not silently skipped: this is the one form in the app
    // that is a Server Action rather than a route.ts POST, and Next.js's
    // own framework-level Server Action protection (an Origin-header
    // check against the deployment's own host, unconfigured/default in
    // next.config.ts — confirmed this slice) already provides a
    // CSRF-equivalent property for this one endpoint. Adding a SECOND,
    // redundant token mechanism here was judged unnecessary, not
    // overlooked.
    const page = read('change-password/page.tsx');
    expect(page).not.toMatch(CSRF_IMPORT);
  });
});
