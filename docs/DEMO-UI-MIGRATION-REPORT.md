# Demo UI Migration Report — Batches A + B (Public-Site UI)

**Status:** Batch A and Batch B complete and verified. Admin UI and
buyer-authenticated account pages remain deferred — see §9.
**Date:** 2026-08-21
**Scope:** Visual/UI-only demo migration, per owner instructions
2026-08-20/2026-08-21 ("MAKE THE ENTIRE WEBSITE LOOK MIGRATED AND
DEMO-READY... does NOT need to be functionally connected to MongoDB
yet").
**MongoDB:** NOT CONNECTED. **Authentication:** MOCK/NOT IMPLEMENTED.
**Payment:** NOT IMPLEMENTED. **Business logic:** DEFERRED.

---

## 1. Complete public/buyer route checklist

Built from the authoritative 172-route table in
`docs/M3-APPLICATION-MAPPING.md` (public + buyer-authenticated sections),
cross-checked against `routes/web.php`, `resources/views/`, and the
current `src/app/` tree. Admin routes (§3 of that document, 102 routes)
are out of scope per owner instruction and not listed below.

| # | Route | Status | Notes |
|---|---|---|---|
| 1 | `GET /` | ✅ COMPLETE | Batch A |
| 2 | `GET /home` | ✅ COMPLETE | Batch A |
| 3 | `GET /products` | ✅ COMPLETE | Batch A — renders honestly empty (see §5) |
| 4 | `GET /productsbydisease/{slug}` | ✅ COMPLETE | Batch A |
| 5 | `GET /diseases-list` | ✅ COMPLETE | Batch A |
| 6 | `GET /videos` | ✅ COMPLETE | M1 (broken-by-design, preserved) |
| 7 | `GET /diseases-details/{slug}` | ✅ COMPLETE | Batch A |
| 8 | `GET /main-category-products/{cat_slug}` | ✅ COMPLETE | Batch A |
| 9 | `GET /category-poducts/{cat_slug}` | ✅ COMPLETE | Batch A |
| 10 | `GET /poducts-list/{cat_slug}` | ✅ COMPLETE | Batch A — renders honestly empty (see §5) |
| 11 | `GET /top-poducts` | ✅ COMPLETE | Batch A |
| 12 | `GET /about` | ✅ COMPLETE | M1 |
| 13 | `GET /mother-tincture` | ✅ COMPLETE | M1 |
| 14 | `GET /contact` | ✅ COMPLETE | M1 |
| 15 | `POST /save-enquiry` | N/A | Action-only, no standalone view |
| 16 | `GET /login` | ✅ COMPLETE | Batch A |
| 17 | `GET /seller-register` | ✅ COMPLETE | **Batch B** |
| 18 | `GET /register` | ✅ COMPLETE | Batch A |
| 19 | `POST /user-login` | N/A | Action-only |
| 20 | `POST /save-user` | N/A | Action-only |
| 21 | `GET /user-update-status` | N/A | LIVE-orphan, token-only redirect, no standalone page |
| 22 | `GET /logout` | N/A | Action-only |
| 23 | `GET /details` | ✅ COMPLETE | M1 |
| 24 | `POST /store-cart` | N/A | Action-only |
| 25 | `GET /product-store-cart` | N/A | Action-only (alias of #24) |
| 26 | `GET`/`POST /shopping-cart` | ✅ COMPLETE | Batch A (named deviation — see prior report §7) |
| 27 | `GET /remove-cart/{id}` | N/A | Action-only |
| 28 | `GET /cart/update` | N/A | Action-only |
| 29 | `GET /cart-remove-iteam/{id}` | N/A | Action-only |
| 30 | `GET`/`POST /update-cart` | N/A | Action-only |
| 31 | `GET /terms` | ✅ COMPLETE | M1 |
| 32 | `GET /privacy-policy` | ✅ COMPLETE | M1 |
| 33 | `GET /video` | ✅ COMPLETE | M1 |
| 34 | `GET /return-policy` | ✅ COMPLETE | M1 |
| 35 | `GET /cart-list` | ✅ COMPLETE | Batch A |
| 36 | `POST /update-cart-ajax` | N/A | Action-only |
| 37 | `POST /payment/method` | N/A | Action-only, Payment-related, out of scope |
| 38 | `GET /payment-success` | NOT APPLICABLE | Dead route (docs/M3-APPLICATION-MAPPING.md row #38) |
| 39 | `GET /payment-failed` | NOT APPLICABLE | Dead route (row #39) |
| 40 | `GET /product-details/{slug}` | ✅ COMPLETE | Batch A |
| 41 | `POST /save-review` | N/A | Action-only |
| 42 | `GET /blog-detail/{blog_slug}` | ✅ COMPLETE | **Batch B** |
| 43 | `POST /product-order` | NOT APPLICABLE | Broken (column-mismatch), no standalone view, not a page |
| 44 | `GET /categories/{cat}` | ✅ COMPLETE | **Batch B** |
| 45 | `POST /search-products` | N/A | Action-only |
| 46 | `GET /buy-product/{pslug}` | 🚫 BLOCKED | Requires real inline `Auth::check()`/`utype` branching in the controller itself, not just a middleware gate around a static view — genuinely cannot render meaningfully without real auth. LIVE-orphan (no nav link) per row #46. Deferred with buyer-authenticated routes. |
| 47 | `POST /success-order` | NOT APPLICABLE | Dead (row #47) |
| 48 | `GET /order-placed` | NOT APPLICABLE | Broken-by-design (B-17), out of this batch's scope, not requested |
| 49 | `GET /reset-password` | ✅ COMPLETE | **Batch B** |
| 50 | `POST /user-reset-password` | N/A | Action-only |
| 51 | `GET /update-password` | ✅ COMPLETE | **Batch B** |
| 52 | `POST /user-update-password` | N/A | Action-only |
| 53 | `GET /post-details/{slug}` | ✅ COMPLETE | Batch A |
| 54 | `GET /consultancy` | ✅ COMPLETE | **Batch B** |
| 55 | `POST /save-appointment` | N/A | Action-only |
| 56 | `GET /testMail` | NOT APPLICABLE | Dead dev artifact, explicitly excluded per contract §3.1 |
| — | `GET /all-diseases` | ✅ COMPLETE | Batch A |
| — | Public blog LISTING page | **NOT APPLICABLE — does not exist in source.** Verified directly against the full 172-route table: only `/blog-detail/{slug}` (a detail page) exists; no index/listing route or view exists anywhere in `routes/web.php`. Not invented. | |
| 57 | `GET /buyer-panel` | 🚫 BLOCKED | Broken in source (B-02, undefined method) AND requires real auth |
| 58 | `GET /manage-orders` | 🚫 BLOCKED | Requires real buyer session/order data |
| 59 | `GET /view-order/{orderId}` | 🚫 BLOCKED | Broken in source (B-12) AND requires real auth |
| 60 | `GET /profile` | 🚫 BLOCKED | Requires real buyer session data |
| 61 | `POST /update-profile` | N/A | Action-only |
| 62 | `GET /change-password` | 🚫 BLOCKED | Requires real buyer session (`checkBuyer` gate is not just cosmetic — the view has no meaningful non-authenticated state) |
| 63 | `GET /myaccount` | 🚫 BLOCKED | Requires real buyer session data |
| 64 | `POST /update-password` (buyer) | N/A | Action-only |
| 65 | `POST /product-checkout` | ✅ COMPLETE | Batch A (named deviation — made GET-navigable, see prior report §7) |
| 66 | `POST /post-checkout` | NOT APPLICABLE | Dead (row #66) |
| 67 | `POST /save-order` | NOT APPLICABLE | Dead (row #67) |
| 68 | `GET /cancel-order` | N/A | Action-only, destructive, requires real auth |
| 69 | `POST /update-shipping-type` | N/A | Action-only |
| — | 4 static microsites (`Dandruff/`, `hair-dandruff/`, `enlarged-prostate/`, `record/`) | ⚠️ VERIFIED PRESENT, PARTIALLY NON-FUNCTIONAL | See §6 |

**Summary:** 25 routes ✅ COMPLETE (9 M1 + 16 Batch A/B pages, counting
route-pairs like `/`+`/home` and `/shopping-cart`+`/cart-list` as their
own rows above), 1 explicitly NOT APPLICABLE (no blog listing exists in
source), 5 🚫 BLOCKED (buyer-authenticated, correctly deferred), the
remainder N/A (POST-action routes with no standalone view) or NOT
APPLICABLE (confirmed Dead/Broken-and-out-of-scope). **Nothing was
silently omitted** — every numbered row in the source route table is
accounted for above.

---

## 2. Batch B routes completed (this session)

| Route | Source Blade | Notes |
|---|---|---|
| `/consultancy` | `consultancy.blade.php` | Appointment-booking form, no validation (matches source) |
| `/categories/{cat}` | `categories.blade.php` | Alt-theme subcategory listing; broken link to non-existent `/products/{slug}` route preserved verbatim |
| `/blog-detail/{blog_slug}` | `blog-detail.blade.php` | A THIRD, distinct template family — see §6 |
| `/seller-register` | `seller-register.blade.php` | Largest page this batch — 7 file inputs, real Spaks-branded content (not generic zeintext placeholder) |
| `/reset-password` | `forgot-password.blade.php` | Same "Register" `<title>` defect as `/login`, preserved |
| `/update-password` | `update-password.blade.php` | Alt-theme; working Show/Hide password toggle |

## 3. Total public routes now available

**33 total navigable Next.js routes** (`npm run build` output, static +
dynamic): 9 M1 + 16 Batch A + 6 Batch B + `/` and `/home` and
`/cart-list`/`/shopping-cart` route pairs already counted within Batch A.

## 4. Routes still missing (deferred, not silently omitted)

See §1's checklist for the complete, row-by-row accounting. Summary:

- **All 102 admin routes** — explicitly out of scope this task.
- **5 buyer-authenticated routes requiring real session state**
  (`/buyer-panel`, `/manage-orders`, `/view-order/{id}`, `/profile`,
  `/change-password`, `/myaccount`) — none of these can render a
  meaningful UI without real auth (they either display session-specific
  data with no sensible non-authenticated fallback, or are themselves
  broken in source). Per this task's own instruction ("unless the UI can
  be rendered without real authentication"), these were evaluated and
  found NOT to qualify — deferred, not built as fake-authenticated
  placeholders.
- **`/buy-product/{pslug}`** — same reasoning; the controller itself
  branches on `Auth::check()`, not just a middleware gate.
- **A public blog listing page** — does not exist in source at all
  (confirmed against the full route table); not invented.
- Confirmed Dead/Broken-and-out-of-scope routes — not ported, consistent
  with M1's established precedent.

## 5. Mock/demo data used this batch

Extended `src/lib/demo/` with 4 new real, curated datasets (same
provenance discipline as Batch A — extracted from
`Database/db_newhomo.sql` via `getAcceptedDocuments`, never invented):

| Data | Count | Used by |
|---|---|---|
| Blogs | 4 (full real table) | `/blog-detail/{slug}` |
| Blog categories | 1 (full real table) | (not yet consumed by any built page) |
| Statezones | 36 (full real table, added in Batch A, reused here) | — |
| Product categories | 675 (full, already curated in Batch A) | `/categories/{cat}` (child-category lookup) |

Regeneration command unchanged: `npx tsx scripts/generate-demo-fixtures.ts`.

## 6. Two new findings from real assets/data this batch

1. **`/blog-detail/{slug}` is the most broken-by-missing-assets page
   found in this entire migration.** It uses a THIRD, distinct
   asset/template family (`assets/css/vendors.css`,
   `assets/js/{plugins,vendors,active,main}.js`, `assets/img/banner-bg.jpg`,
   `assets/img/favicon.jpg`) — separate from both the mainline theme and
   the alt-theme ("zeintext") family already documented. **All seven of
   this page's own unique assets are missing from `public/`** (confirmed
   by direct filesystem check). The page renders its real header/footer
   (shared `PublicHeader`/`PublicFooter`, same as every other page) but
   its own body content will appear completely unstyled — an honest
   reflection of what these asset paths actually resolve to, not a bug
   in this migration. `docs/asset-manifest.md` §6.1 had already flagged
   this family as "not yet fully catalogued — OI-20 open"; this session's
   finding is consistent with and extends that open item.
2. **3 of the 4 static legacy microsites are raw, unexecutable PHP, not
   static HTML.** `public/Dandruff/`, `public/hair-dandruff/`, and
   `public/enlarged-prostate/` each contain `index.php`/`header.php`/
   `footer.php` — not `index.html`. Next.js's static file server cannot
   execute PHP; visiting these paths would return the raw PHP source text
   or a 404, not a rendered page. Only `public/record/` has a real
   `index.html` and would actually render. `docs/M3-APPLICATION-MAPPING.md`
   §4 already correctly classifies these three as "Raw-PHP SEO microsite"
   and recommends "port as static assets" — that conversion (rewriting
   PHP includes into static HTML) was never actually done and is real,
   separate work, not a visual-migration task; NOT attempted this
   session, flagged here rather than silently left broken without
   documentation.

## 7. Visually complete but non-functional features (Batch B)

- `/seller-register`'s 7 file-upload inputs — render correctly, accept no
  real file (no backend).
- `/update-password` and `/seller-register`'s "Show/Hide password"
  toggle — genuinely functional (real client-side DOM toggle), unlike
  the surrounding form which does not submit anywhere real.
- `/categories/{cat}`'s product-card links point to `/products/{slug}` —
  confirmed NOT a registered route anywhere in this app (a real,
  pre-existing broken link in source, reproduced verbatim).

## 8. A real build error found and fixed this batch

Initial `/seller-register` and `/update-password` implementations used
React `onClick` handlers for the "Show/Hide password" button — this
fails `next build` (`Error: Event handlers cannot be passed to Client
Component props`) because these are Server Components (no `'use client'`
directive, consistent with every other page in this migration). Fixed by
reproducing the SAME pattern already established for
`/product-details/[slug]`'s variant-selector script: the button gets a
plain `id`, and a `<script dangerouslySetInnerHTML>` block registers the
click listener after the page renders — real, working behavior, no
React event handler, no new architectural pattern introduced.

## 9. Known limitations

- Admin UI: not started, per explicit owner instruction.
- Buyer-authenticated account pages: deferred per §4's reasoning.
- `/blog-detail/{slug}`: will render visually broken (unstyled) due to
  missing assets that are also missing in the real source repository —
  see §6.
- 3 of 4 static legacy microsites will not actually render if visited
  (raw PHP, no PHP runtime) — see §6. Not fixed this session; flagged as
  a distinct, larger task (PHP→static-HTML conversion) from visual UI
  migration.
- `DEMO_BLOG_CATEGORIES` was added to the demo-data layer but is not yet
  consumed by any built page (no page needed it this batch).

## 10. Verification results

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ Pass, 0 errors |
| `npm run lint` | ✅ Pass, 0 errors |
| `npm run format:check` | ✅ Pass |
| `npm run test` | ✅ **178/178 pass**, 23 test files (unchanged — this batch is UI/visual work, no new Vitest tests added, no regression to the MongoDB/migration layer this batch didn't touch) |
| `npm run build` | ✅ Pass — **33 routes** (static + dynamic), clean `.next` cache |
| `npm run assets:verify` | ✅ 2860/2860 files verified, 0 mismatches, 0 missing |
| Manual smoke test (all 6 new Batch B routes + 2 dynamic-slug edge cases) | ✅ All return correct HTTP status — 200 for real content, 404 for `notFound()`-guarded unmatched slugs, 200-with-empty-content for no-null-guard routes (matching every other dynamic route's established pattern in this migration) |

**Not independently re-measured this batch:** pixel-level responsive
layout at 320/768/1440px for the 6 new pages specifically — the
underlying markup reuses the exact same Bootstrap grid classes
(`col-lg-*`/`col-md-*`/`col-sm-*`) and CSS files already responsive-
verified for the M1 pages and Batch A's alt-theme pages, so no new
responsive-layout code was introduced, but no new screenshot comparison
was captured for these specific 6 routes. Not claiming pixel-perfect
parity for them beyond that inherited-CSS reasoning.

## 11. Exact commands to start the demo

```bash
cd spakshomeopathy-next
npm run dev
```

Then visit `http://localhost:3000/`. New in this batch:

```
/consultancy                                    → appointment booking form
/categories/electronic-prhpg                    → real subcategory listing (pick any real
                                                     catSlug from productCategories.generated.ts)
/blog-detail/{slug}                             → pick a real blogSlug from blogs.generated.ts
                                                     (note: will render unstyled, see §6)
/seller-register                                → large multi-section registration form
/reset-password                                 → password-reset request UI
/update-password                                → password-update UI with working show/hide toggle
```

To regenerate the demo data from the real SQL dump:
`npx tsx scripts/generate-demo-fixtures.ts`.

---

## Final statement

**Batch B is a visual/demo migration only. MongoDB, authentication,
APIs, payments, and production business logic remain intentionally
deferred.**
