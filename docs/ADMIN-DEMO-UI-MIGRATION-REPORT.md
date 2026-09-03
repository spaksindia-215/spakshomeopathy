# M4-DEMO — Admin UI Migration Report (Phase 1)

**Status:** Phase 1 complete and verified. **Visual/UI migration only** — no
MongoDB, no real authentication, no real CRUD persistence, no API routes, no
production business logic. See "Closing Statement" at the end of this
document.

**Date:** 2026-08-21
**Scope:** Full admin panel shell (login, dashboard, sidebar/nav, footer) +
List/Create/Edit/View screens for 8 named modules: Products, Categories,
Posts, Blog (+ Blog Categories), Sliders, Pincodes, Users, Enquiries, plus
Admin Profile and the separate Change Password page.

---

## 1. What "Phase 1" means

Given the real scale of the Laravel admin panel — **104** `Route::` lines in
`routes/admin.php`, **49** real Blade views totaling **10,637** lines across
12 distinct CRUD modules — the owner approved a phased approach
(2026-08-21, via an explicit choice): **Phase 1 = shell + the 8 named
modules to full List+Create+Edit(+View where source has one) depth. Phase 2
(a later, separate instruction) = everything else**, listed in full in §5.

## 2. How to demo this

1. Visit `/admin/login`. The page shows a real-looking, but non-functional,
   Laravel login form (preserved verbatim from source, including its own
   real defects — see §4). It **does not authenticate**.
2. Below the form, a clearly separated, dashed-border callout reads
   **"DEMO ONLY — no real authentication exists in this milestone"** with an
   **"Enter Admin Panel (Demo)"** button. Click it to go straight to
   `/admin/home`.
3. From there, the full AdminLTE shell (header, sidebar, footer) is live.
   The sidebar's 10 real nav items (exact source labels, including the
   "Manage Enquires" misspelling) link to the 8 built modules; unbuilt
   Phase 2 links are present but their destination pages don't exist yet
   (expected — see §5).
4. Every List page's Edit/View action links to a real demo record ID drawn
   from curated real production data (see §3). Visiting an ID not present
   in the curated set correctly 404s via Next's `notFound()` — this is
   working as designed, not a bug.

## 3. Demo data — provenance

All data is real, curated production data from `Database/db_newhomo.sql`
(the same SQL dump used throughout this entire migration), extracted via
`scripts/generate-demo-fixtures.ts` → `getAcceptedDocuments()`. Nothing is
invented. New this phase: `src/lib/demo/admin/` (`users`, `enquiries`,
`pincodes`, `sliders`), plus small additive accessors on the pre-existing
`src/lib/demo/posts.ts` and `blogs.ts` (`getPostByLegacyId`,
`getBlogByLegacyId`, `getBlogCategoryByLegacyId`) for id-based Edit lookups
the public site never needed.

| Module | Source | Real row count used |
|---|---|---|
| Products | `src/lib/demo/products.ts` (reused, public+admin share it) | 125 curated |
| Categories | `src/lib/demo/categories.ts` (reused) | full real table |
| Posts | `src/lib/demo/posts.ts` (reused) | 15 curated (of 414) |
| Blog / Blog Categories | `src/lib/demo/blogs.ts` (reused) | 4 blogs / 1 category (full) |
| Sliders | `src/lib/demo/admin/sliders.ts` (new) | **0** — confirmed real production count |
| Pincodes | `src/lib/demo/admin/pincodes.ts` (new) | 1 (full real table) |
| Users (`users-list`) | `src/lib/demo/admin/users.ts` (new) | **0** — `utype=2` confirmed empty (see §4) |
| Enquiries | `src/lib/demo/admin/enquiries.ts` (new) | 15 curated (of 16,386) |

## 4. Preserved real defects — verified directly against source this session

Every item below was independently re-verified by reading the actual
`public_html/` Blade view and/or controller method, not assumed from prior
exploration. Nothing was "fixed."

### Flagship examples
- **`add-pin-code.blade.php:108`** — the Status `<select>`'s `name`
  attribute is literally `name="'pin_status"` (a stray leading single-quote
  baked into the rendered HTML, not a templating artifact). Reproduced
  byte-for-byte at `/admin/add-pin-code`. Contrast: `edit-pincode`'s
  equivalent select is well-formed (`name="pin_status"`) — not "fixed" to
  match, and Add not "broken" to match Edit.
- **`enquires-list.blade.php`** — `$sno++` sits *after* `@endforeach`
  (outside the loop it's meant to increment inside). Every row's S.No
  therefore renders `1`. Reproduced by hardcoding `1` for every row (not
  `.map((e,i)=>i+1)`, which would silently fix it). The same file's
  `<title>`/`<h1>`/breadcrumb also literally read **"Product List"** — a
  genuine copy-paste artifact — reproduced verbatim.
- **`profile.blade.php:69`** — `@if($AdmUser->image!="")`, but
  `UserController@UserProfile` (verified directly) never assigns
  `$AdmUser` — it is genuinely undefined, resolving falsy at render time
  (no crash). Reproduced by never taking that conditional's true-branch;
  the Edit Profile tab always shows the generic avatar.
- **`edit-product.blade.php:492,530`** — the slot-9 and slot-10 "Product
  How to Use" textareas are pre-filled from `p_price9`/`p_price10` (the
  PRICE fields), not `p_desc9`/`p_desc10` — a copy-paste bug. Reproduced
  exactly.

### Naming inversions / data-source asymmetries
- **P-04** (`add-post` vs `edit-post`): Add's Category `<select>` uses
  `slug` as its option value (`SavePost` looks the category up by slug);
  Edit's uses `id` (`UpdatePost` looks it up by id). Both confirmed
  directly in `AdminController@SavePost`/`UpdatePost`.
- **Users/Buyers naming inversion**: `AdminController@UsersList` (route
  `users-list`) filters `utype=2` — **sellers**, confirmed VESTIGIAL/never
  able to log in, and confirmed **zero real rows** (1 admin, 818 buyers, 0
  sellers in production). The sidebar's own "Manage Users" link actually
  points at `manage-buyers` (`utype=3`), a different, Phase-2-deferred
  route. `/admin/users-list` therefore renders honestly empty — **the
  owner explicitly confirmed keeping this behavior as-is** rather than
  swapping the module to show buyers, via an in-session decision.
- **B-09 / DR-03** (`pin_codes`): the real table's columns are
  `pincode`/`location`/`country`/`uid`/`status` (status is a **varchar**,
  not numeric) — NOT `pin_code`/`pin_address`/`pin_status` (int), which is
  what the Blade views and controller actually reference. Every real
  pincode save has always thrown a SQL error in production. This report
  does not resolve DR-03; the List/Edit pages read the schema's real field
  names so the one real row's actual data is visible, while both Add's
  corrupted attribute and Edit's well-formed one are still reproduced
  exactly as literal `name` values.
- **`ViewProduct`** (`product-view`): Category/Sub Category name lookups
  resolve `p_cat`/`p_subcat` against `product_category` — a DIFFERENT
  table from the one Add/Edit's Category `<select>` uses (`categories`).
  This is `p_cat`'s documented overloaded meaning made concrete. No
  Phase-1 fixture exists for `product_category`, so these two rows render
  intentionally blank on `/admin/product-view/[id]` — an honest reflection
  of a real Phase-2 gap, not a display bug.

### Structural / cosmetic
- Bootstrap CSS loaded twice — present on essentially every Add/Edit page
  across every module; reproduced as two literal `<link>` tags each time.
- Dead `$('#example1').DataTable()` calls alongside the real `#example2`
  init — present on `product-view`, `blog-list`, `blog-category-list`,
  `slider-list`, `pin-code-list`, `users-list`, `enquires-list`,
  `view-enquiry`. `#example1` never exists on any of these pages.
- `product-list`/`cat-list`/`post-list` load DataTables CSS/JS but never
  call `.DataTable()` at all — reproduced as inert includes.
- Double `class="..." class="..."` attribute on edit/delete icons
  (`product-list`, `post-list`, `cat-list`) — JSX only supports one
  `className`; the one unavoidable simplification, documented in each
  file.
- `cat-list`'s delete action is HTML-commented out in source — only an
  edit icon is rendered, no delete control at all.
- `add-hurbcat`'s `<title>` says "Add Product" (not "Add Category"), its
  `<h1>`/breadcrumb say "Add **Catogory**" (typo, preserved), and its
  submit button says "Save Product." Its dead `CKEDITOR.replace('p_desc')`
  script is not reproduced (no matching field exists on that page).
- `edit-blog-category`'s `<title>`/`<h1>`/breadcrumb all read "Add Blog
  Category" despite being a fully working Edit form — reproduced verbatim.
- Image field-name asymmetries preserved without normalizing: Category
  Add uses `c_image`, Edit uses `image`; Post Add uses `p_pimage`, Edit
  uses `post_image`.
- `blog-list` falls back to `assets/img/no-image.png` when an image is
  missing (the only List page with an explicit fallback); Status prints
  raw lowercase `"active"` / capitalized `"Inactive"` text (no badge).
- `edit-slider` has two structurally adjacent `.box-body` divs inside one
  `.box` — reproduced as two literal sibling elements, not merged.
- `users-list`'s View action literally links to `view-product/{id}` (a
  copy-paste leftover from the Product module) — reproduced as-is, not
  redirected to a sensible destination that doesn't exist in source.
- `pin-code-list`'s header row says "Name" over what is actually the
  pincode value.
- `AdminFooter.tsx` was corrected this session: it previously (incorrectly)
  said "All rights reserved."; the real `footer.blade.php` says **"All
  reserved."** (missing "rights") — this is the one place source is right
  and the pre-existing scaffolding was wrong, now fixed to match reality.

### CKEditor 4.7.3
Per the owner's explicit instruction, the real CDN engine
(`https://cdn.ckeditor.com/4.7.3/standard/ckeditor.js`) is **not loaded**.
`src/components/admin/CKEditorPlaceholder.tsx` is a real, name-addressable
`<textarea>` with static toolbar chrome reproducing CKEditor 4's default
grouping closely enough to read as authentic — used on all 6 real bindings
(`post_desc` ×2, `blog_desc` ×2, `p_desc` ×2). The Category module's own
dead `CKEDITOR.replace('p_desc')` reference (no `p_desc` field exists there)
is confirmed dead and not reproduced.

## 5. Full route inventory (104 rows, source order)

Legend: ✅ COMPLETE (Phase 1) · ⏭️ DEFERRED (Phase 2) · N/A ACTION-ONLY
(mutation route, no standalone view) · 🐛 BROKEN-IN-SOURCE-PRESERVE ·
🚫 NOT APPLICABLE (confirmed dead code) · ⚠️ AMBIGUOUS (resolved, see §4)

| # | Route | Controller method | Status |
|---|---|---|---|
| 1 | `GET login` | `AdminController@login` | ✅ `/admin/login` |
| 2 | `GET /` | `AdminController@login` | ✅ same view as #1 |
| 3 | `POST user-login` | `Auth\LoginController@UserLogin` | N/A action-only |
| 4 | `GET home` | `AdminController@index` | ✅ `/admin/home` |
| 5 | `GET user-logout` | `Auth\LoginController@getSignOut` | N/A action-only |
| 6 | `GET user-profile` | `UserController@UserProfile` | ✅ `/admin/user-profile` |
| 7 | `POST update-admin-profile` | `UserController@UpdateAdminProfie` | N/A action-only |
| 8 | `POST update-admin-password` | `UserController@UserChangePassword` | N/A action-only |
| 9 | `GET manage-sellers` | `AdminController@GetSellers` | ⏭️ Phase 2 |
| 10 | `GET view-seller/{id}` | `AdminController@ViewSeller` | ⏭️ Phase 2 |
| 11 | `GET manage-buyers` | `AdminController@GetBuyers` | ⏭️ Phase 2 |
| 12 | `GET view-buyer/{id}` | `AdminController@ViewBuyer` | ⏭️ Phase 2 |
| 13 | `GET update-user-status/{id}` | `AdminController@UpdateUserStatus` | N/A action-only |
| 14 | `GET profile` | `AdminController@AdminProfile` | 🐛 no such method exists (B-03) — never built |
| 15 | `GET add-product-category` | `AdminController@AddProductCategory` | ⏭️ Phase 2 (`product_category` tree) |
| 16 | `POST save-product-category` | `AdminController@SaveProductCategory` | N/A action-only |
| 17 | `GET product-category-list` | `AdminController@ProductCategoryList` | ⏭️ Phase 2 |
| 18 | `GET edit-product-category/{id}` | `AdminController@EditProductCat` | ⏭️ Phase 2 |
| 19 | `GET add-product-subcategory` | `AdminController@AddProductSubCategory` | ⏭️ Phase 2 |
| 20 | `GET product-subcategory-list` | `AdminController@ProductSubCategoryList` | ⏭️ Phase 2 |
| 21 | `POST save-product-subcat` | `AdminController@SaveProductSubCat` | N/A action-only |
| 22 | `GET add-other-category` | `AdminController@AddOtherCategory` | ⏭️ Phase 2 |
| 23 | `POST save-other-category` | `AdminController@SaveOtherCategory` | N/A action-only |
| 24 | `GET other-category-list` | `AdminController@OtherCategoryList` | ⏭️ Phase 2 |
| 25 | `GET getsub-category/{id}` | `SellerController@GetSubCat` | ⏭️ Phase 2 |
| 26 | `GET destroy-product-category/{id}` | `AdminController@DestroyCategory` | N/A action-only |
| 27 | `GET destroy-product-subcat/{id}` | `AdminController@DestroyPSubCat` | N/A action-only |
| 28 | `GET add-post` | `AdminController@AddPost` | ✅ `/admin/add-post` |
| 29 | `POST save-post` | `AdminController@SavePost` | N/A action-only |
| 30 | `GET post-list` | `AdminController@PostList` | ✅ `/admin/post-list` |
| 31 | `GET edit-post/{post_id}` | `AdminController@EditPost` | ✅ `/admin/edit-post/[post_id]` |
| 32 | `POST update-post` | `AdminController@UpdatePost` | N/A action-only |
| 33 | `GET destroy-post/{post_id}` | `AdminController@DestroyPost` | N/A action-only |
| 34 | `GET add-hurbcat` | `AdminController@AddHurbCat` | ✅ `/admin/add-hurbcat` |
| 35 | `GET add-product` | `AdminController@AddProduct` | ✅ `/admin/add-product` |
| 36 | `GET product-view/{id}` | `AdminController@ViewProduct` | ✅ `/admin/product-view/[id]` |
| 37 | `GET edit-product/{id}` | `AdminController@EditProduct` | ✅ `/admin/edit-product/[id]` |
| 38 | `GET edit-category/{id}` | `AdminController@EditCategory` | ✅ `/admin/edit-category/[id]` |
| 39 | `GET destroy-product/{id}` | `AdminController@DestroyProduct` | N/A action-only |
| 40 | `GET update-product-status/{id}` | `AdminController@UpdateProductStatus` | N/A action-only |
| 41 | `GET update-product-trending/{id}` | `AdminController@UpdateProductTrending` | N/A action-only |
| 42 | `GET update-product-featured/{id}` | `AdminController@UpdateProductFeatured` | N/A action-only |
| 43 | `POST save-pimage` | `AdminController@SaveProductImage` | N/A action-only (modal target, built inert on `edit-product`) |
| 44 | `POST save-pspecification` | `AdminController@SaveProductSpecif` | N/A action-only (modal target, built inert on `edit-product`) |
| 45 | `POST update-product` | `AdminController@UpdateProduct` | N/A action-only |
| 46 | `POST update-category` | `AdminController@UpdateCategory` | N/A action-only |
| 47 | `GET update-category-status-active/{id}` | `AdminController@UpdateCategoryStausActive` | N/A action-only |
| 48 | `GET update-category-status-inactive/{id}` | `AdminController@UpdateCategoryStausInactive` | N/A action-only |
| 49 | `POST save-product` | `AdminController@SaveProduct` | N/A action-only |
| 50 | `POST save-cat` | `AdminController@Savecategory` | N/A action-only |
| 51 | `GET cat-list` | `AdminController@CategorytList` | ✅ `/admin/cat-list` |
| 52 | `GET product-list` | `AdminController@ProductList` | ✅ `/admin/product-list` |
| 53 | `GET active-products` | `AdminController@ActiveProducts` | ⏭️ Phase 2 |
| 54 | `GET inactive-products` | `AdminController@InactiveProducts` | ⏭️ Phase 2 |
| 55 | `GET add-blog-category` | `AdminController@AddBlogCategory` | ✅ `/admin/add-blog-category` |
| 56 | `POST save-blog-category` | `AdminController@SaveBlogCategory` | N/A action-only |
| 57 | `GET destroy-blog-category/{id}` | `AdminController@DestroyBlogCategory` | N/A action-only |
| 58 | `GET edit-blog-category/{id}` | `AdminController@EditBlogCategory` | ✅ `/admin/edit-blog-category/[id]` |
| 59 | `POST update-blog-category` | `AdminController@UpdateBlogCategory` | N/A action-only |
| 60 | `GET blog-category-list` | `AdminController@BlogCategoryList` | ✅ `/admin/blog-category-list` |
| 61 | `GET add-blog` | `AdminController@AddBlog` | ✅ `/admin/add-blog` |
| 62 | `POST save-blog` | `AdminController@SaveBlog` | N/A action-only |
| 63 | `GET edit-blog/{id}` | `AdminController@EditBlog` | ✅ `/admin/edit-blog/[id]` |
| 64 | `POST update-blog` | `AdminController@UpdateBlog` | N/A action-only |
| 65 | `GET destroy-blog/{id}` | `AdminController@DestroyBlog` | N/A action-only |
| 66 | `GET blog-list` | `AdminController@BlogList` | ✅ `/admin/blog-list` |
| 67 | `GET order-list` | `AdminController@ManageOrders` | ⏭️ Phase 2 |
| 68 | `GET seller-orders/{sid}` | `AdminController@SellerOrders` | ⏭️ Phase 2 |
| 69 | `GET view-order/{orderId}` | `AdminController@ViewOrder` | ⏭️ Phase 2 |
| 70 | `GET change-order-status` | `AdminController@ChangeOrderStatus` | N/A action-only |
| 71 | `GET add-pin-code` | `AdminController@AddPinCode` | ✅ `/admin/add-pin-code` |
| 72 | `GET pin-code-list` | `AdminController@PinCodeList` | ✅ `/admin/pin-code-list` |
| 73 | `POST save-pincode` | `AdminController@SavePinCode` | N/A action-only |
| 74 | `GET edit-pincode/{id}` | `AdminController@EditPinCode` | ✅ `/admin/edit-pincode/[id]` |
| 75 | `POST update-pincode` | `AdminController@UpdatePinCode` | N/A action-only |
| 76 | `GET destroy-pincode/{id}` | `AdminController@DestroyPinCode` | N/A action-only |
| 77 | `GET add-slider` | `AdminController@AddSlider` | ✅ `/admin/add-slider` |
| 78 | `POST save-slider` | `AdminController@SaveSlider` | N/A action-only |
| 79 | `GET edit-slider/{id}` | `AdminController@EditSlider` | ✅ `/admin/edit-slider/[id]` |
| 80 | `POST update-slider` | `AdminController@UpdateSlider` | N/A action-only |
| 81 | `GET destroy-slider/{id}` | `AdminController@DestroySlider` | N/A action-only |
| 82 | `GET slider-list` | `AdminController@SliderList` | ✅ `/admin/slider-list` |
| 83 | `GET subscriber-list` | `AdminController@SubscriberList` | ⏭️ Phase 2 |
| 84 | `GET users-list` | `AdminController@UsersList` | ✅ `/admin/users-list` (renders empty — see §4) |
| 85 | `GET destroy-user/{id}` | `AdminController@DestroyUser` | N/A action-only |
| 86 | `GET enquires-list` | `AdminController@getEnquiry` | ✅ `/admin/enquires-list` |
| 87 | `GET destroy-enquiry/{id}` | `AdminController@DestroyEnq` | N/A action-only |
| 88 | `GET view-enquiry/{id}` | `AdminController@ViewEnquiry` | ✅ `/admin/view-enquiry/[id]` |
| 89 | `GET review-list` | `AdminController@ReviewList` | ⏭️ Phase 2 |
| 90 | `GET update-review/{id}/{status}` | `AdminController@ReviewUpdate` | N/A action-only |
| 91 | `GET seller-payments/{sid}` | `AdminController@SellerPayment` | ⏭️ Phase 2 |
| 92 | `GET change-payment-status` | `AdminController@ChangePaymentStatus` | N/A action-only |
| 93 | `GET manage-payments` | `AdminController@ManagePayment` | ⏭️ Phase 2 |
| 94 | `GET appointment-list` | `AdminController@ManageAppointment` | ⏭️ Phase 2 |
| 95 | `GET change-password` | `AdminController@ChangePassword` | ✅ `/admin/change-password` |
| 96 | `POST update-password` | `AdminController@UpdatePassword` | N/A action-only |
| 97 | `GET add-zone` | `AdminController@AddZone` | ⏭️ Phase 2 |
| 98 | `POST save-zone` | `AdminController@SaveZone` | N/A action-only |
| 99 | `GET zones-list` | `AdminController@ZonesList` | ⏭️ Phase 2 |
| 100 | `GET add-city` | `AdminController@AddCity` | ⏭️ Phase 2 |
| 101 | `POST save-city` | `AdminController@SaveCity` | N/A action-only |
| 102 | `GET city-list` | `AdminController@CityList` | ⏭️ Phase 2 |
| 103 | `GET cancel-order` | `AdminController@CancelOrder` | N/A action-only |
| 104 | *(implicit)* `AdminController@ManagePayments` (plural) | — | 🚫 dead code, zero routes bind to it — never built |

**Tally:** 25 ✅ COMPLETE · 1 🐛 broken-in-source (never built) · 1 🚫
confirmed dead code (never built) · ~23 ⏭️ Phase 2 · ~54 N/A action-only
(mutation routes with no standalone view to build).

## 6. Explicit Phase 2 deferral list (with reasoning)

- **`product_category`/`product_subcategory`/`other_category` tree**
  (routes #15–27, #53–54) — unlinked from the sidebar; the owner's
  "Categories" instruction maps to the sidebar's actual "Manage Category"
  = the herb/disease `categories` module, built this phase.
- **Sellers/Buyers** (`manage-sellers`/`manage-buyers`/`view-seller`/
  `view-buyer`, routes #9–12) — explicitly named Phase 2; needs a new
  buyer-profile-join fixture shape not built this phase.
- **Zones/Cities** (routes #97–102).
- **Orders/Payments/SellerPayments** (routes #67–70, #91–94) — dashboard's
  "Total Orders" stat box is deliberately left as `N/A` with a tooltip
  rather than a real or fabricated count.
- **Appointments** (route #94).
- **Reviews** (routes #89–90).
- **Subscribers** (route #83).
- **`GET profile` → `AdminController@AdminProfile`** (route #14) — 🐛
  confirmed no matching controller method exists at all (B-03) — not
  Phase 1 or Phase 2, permanently broken in source.
- **`AdminController@ManagePayments` (plural)** — 🚫 confirmed dead code,
  zero routes bind to it (the real `manage-payments` route binds to the
  singular `ManagePayment`) — not built at all.

## 7. Verification results

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ clean |
| `npm run lint` | ✅ clean (2 pre-existing Google Font warnings, not errors) |
| `npm run format:check` | ✅ clean |
| `npm run test` (178 tests) | ✅ all passed |
| `npm run assets:verify` (2860 files) | ✅ 2860/2860 verified, 0 mismatches, 0 missing |
| `npm run build` | ✅ 47 routes built, 0 errors |
| Manual route smoke test (25 admin URLs) | ✅ all 200; nonexistent demo ids correctly 404 |
| Flagship defect spot-checks in rendered HTML | ✅ corrupted `pin_status` attribute, enquiries S.No="1" ×15, "Product List" title mislabel, sidebar's exact 10 nav items, "All reserved." footer — all confirmed present |

## 8. Closing statement

**Admin UI is visually migrated for demonstration. Authentication,
MongoDB, APIs, CRUD persistence and production business logic remain
intentionally deferred.**

Per the agreed stop condition, work now pauses here for owner review. No
MongoDB connection, API routes, real authentication, real CRUD
persistence, payments, or Phase 2 modules were built or will be built
without further explicit instruction.
