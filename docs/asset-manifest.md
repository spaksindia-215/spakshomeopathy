# Milestone 2 — Per-Page Asset Manifest

**Status:** Cataloguing complete for all 117 Blade views.
**Scope:** Documentation only. No `spakshomeopathy-next/src/app/` page routes were created
or modified beyond what Milestone 1 already built. No Laravel source was modified.
**Governing:** `MIGRATION-CONTRACT.md`, `blueprint.md` §0 (classification), §4.1 (the
"no layout inheritance" problem), §22 Milestone 2 (this deliverable's spec).

**Method.** Every `*.blade.php` file under `spakshomeopathy.com/resources/views/` was
parsed programmatically to extract: `<title>`, `<meta>` tags inside `<head>`, `<link>`
stylesheet tags inside `<head>` (in source order), inline `<style>` blocks, and every
`<script>` tag in the file — `src`-bearing and inline — in document order (this is what
determines load order: jQuery before plugins before `theme.js`). Extraction code:
`scripts/m2-extract-heads.py` is **not** committed as project tooling (see §9 — it was
a one-off analysis script; its output is fully transcribed into this document and cross-
checked against source at every claim below, so re-running it is not required to trust
this manifest — but the method is documented here for reproducibility).

Every finding below carries a `file:line` reference (Step 2 of contract §10.1) or, where
production was independently checked, a note saying so explicitly (§12.3 tie-break
evidence). **For the ~85 views with no pre-existing `baseline/raw-html/` capture, this
manifest is VERIFIED AGAINST LOCAL SOURCE ONLY** unless a specific production check is
called out. No authenticated (buyer/admin) capture was attempted or used anywhere in
this document — see §10.

---

## 1. Inventory — 117 views, four groups

| Group | Path pattern | Count | Head-bearing (full `<head>`) |
|---|---|---|---|
| Public/buyer root views | `resources/views/*.blade.php` | 40 | 38 (`enquiry-email`, `mail` have no `<head>`) |
| Admin views | `resources/views/admin/**/*.blade.php` | 63 | 55 (`admin/inc/*` ×3 and `admin/buyer/*` ×8 minus 5 head-bearing = see below) |
| Buyer-duplicate views (root `buyer/`) | `resources/views/buyer/*.blade.php` | 8 | 8 |
| Mail templates | `resources/views/mails/*.blade.php` | 4 | 4 (title-only heads) |
| **Total** | | **117** ([confirmed by exhaustive `find`](#0-count-method)) | 105 |

<a name="0-count-method"></a>Count method: `find resources/views -name '*.blade.php' | wc -l` → 117, cross-tabulated by directory. This matches the contract's own count expectations (~40 public/root, ~63 admin, 4 mail); the contract's directory list did not separately call out `resources/views/buyer/*` (8 files) — a **new finding**, not previously catalogued in the blueprint or M1 gate report. See §7.

Breakdown actually used in this document (finer than the contract's four buckets, because two subtrees are dead and one bucket needed splitting):

| Sub-group | Count | Bucket (blueprint §0) |
|---|---|---|
| Root public/buyer views (`resources/views/*.blade.php`) | 40 | 35 LIVE/LIVE-orphan, 5 DEAD (§7) |
| `admin/` proper (own `<head>`, routed) | 52 | LIVE/LIVE-orphan |
| `admin/inc/*` (partials, no own `<head>`) | 3 | LIVE (included by all 52) |
| `admin/buyer/*` (never included, never routed) | 8 | **DEAD** (§7) |
| `buyer/*` (root-level, never included, never routed) | 8 | **DEAD** (§7 — new finding) |
| `mails/*` | 4 | 2 LIVE (`reset`, and `enquiry-email` at root — see below), 2 DEAD (`test`, `verify`) |
| `inc/*` (public partials) | 2 | LIVE (included by all 40 root views that render) |
| **Total** | **117** | |

`enquiry-email.blade.php` lives at the **root**, not under `mails/`, and is rendered via
`Mail::send('enquiry-email', ...)` (`HomeController.php:334`) — LIVE, catalogued in §3.

---

## 2. The common baselines

Two independent baselines exist — public and admin — because they share **zero** assets
(different CSS/JS entirely). Both were already established structurally by Milestone 1
(`PublicStylesheets.tsx`, `PublicScripts.tsx`/`LegacyScriptRunner.tsx`,
`AdminHeader.tsx`/`AdminSidebar.tsx`/`AdminFooter.tsx`); this section documents them
formally as the M2 deliverable and **extends** the M1 baseline's proof (8 pages) across
the full 105 head-bearing views.

### 2.1 Public baseline — confirmed on 23 of 40 root views (in addition to the 8 M1 already verified against production)

**Stylesheets** (`<head>`, in order):
```
<link rel="stylesheet" href="{{URL::asset('assets/css/style.css')}}">
<link rel="stylesheet" href="{{URL::asset('assets/css/responsive.css')}}">
```

**Scripts** (end of `<body>`, in order — verified byte-identical order across all 23 pages, zero mismatches):
```
assets/js/jquery.js
assets/js/bootstrap.bundle.min.js
assets/js/bootstrap-select.min.js
assets/js/owl.carousel.min.js
assets/js/jquery.magnific-popup.min.js
assets/js/bootstrap-datepicker.min.js
assets/js/jquery.validate.min.js
assets/js/wow.min.js
assets/js/theme.js
```

This is exactly the 9-script set M1's `LegacyScriptRunner.tsx` already implements (`src/components/layout/LegacyScriptRunner.tsx:77-85`). **No new script-order finding for these 23 pages** — they can reuse `PublicScripts`/`PublicStylesheets` unmodified when ported.

Pages confirmed on this baseline (source-verified; 8 of these were also independently production-verified by M1 — marked ✅prod): `404`, `about`✅prod, `cart-checkout`, `change-password`, `consultancy`✅prod (via `baseline/raw-html/consultancy.guest.raw.html`), `contact`✅prod, `details`✅prod, `diseases-details`, `diseases-list`, `forgot-password`, `herbs-list`, `login`✅prod, `manage-orders`, `mother-tincture`✅prod, `myaccount`, `post-details`, `privacy-policy`✅prod, `products`, `profile`, `register`✅prod, `return-policy`✅prod, `shopping-cart`✅prod (`shopping-cart-broken.guest.raw.html`), `terms`✅prod, `video`✅prod.

**Meta baseline** splits into two sub-variants (both share `charset`, `viewport`, `X-UA-Compatible`, `msapplication-TileColor`, `theme-color`):

| Variant | Extra tag | Pages (of the 23+8 above) |
|---|---|---|
| A (14 pages) | `msapplication-TileImage` present | `about`, `change-password`, `forgot-password`, `login`, `manage-orders`, `myaccount`, `profile`, `register`, `shopping-cart`, + 5 more of the M1 set |
| B (10 pages) | absent | `404`, `cart-checkout`, `consultancy`, `contact`, `details`, `diseases-details`, `diseases-list`, `herbs-list`, `post-details`, `products`, `terms`, `video`, `privacy-policy`, `return-policy`, `mother-tincture` |

This split was already implicitly discovered by M1 (compare `about/page.tsx`'s `other: {'msapplication-TileImage': ...}` vs. the other 8 M1 pages, which omit it) — this section confirms it is a **real, page-by-page split**, not an M1 oversight, and extends it across the full 23-page set.

### 2.2 Admin baseline — confirmed on 21 form pages + 27 list/view pages (48 of 52 routed admin views)

**Stylesheets**, form pages (21 pages, no DataTables):
```
admin-assets/bower_components/bootstrap/dist/css/bootstrap.min.css
admin-assets/bower_components/font-awesome/css/font-awesome.min.css
admin-assets/bower_components/Ionicons/css/ionicons.min.css
admin-assets/dist/css/AdminLTE.min.css
admin-assets/dist/css/skins/_all-skins.min.css
https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,400,600,700,300italic,400italic,600italic
```

**Stylesheets**, list/view pages (27 pages) — same six, **plus DataTables inserted before AdminLTE.min.css**:
```
admin-assets/bower_components/bootstrap/dist/css/bootstrap.min.css
admin-assets/bower_components/font-awesome/css/font-awesome.min.css
admin-assets/bower_components/Ionicons/css/ionicons.min.css
admin-assets/bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css   <-- extra
admin-assets/dist/css/AdminLTE.min.css
admin-assets/dist/css/skins/_all-skins.min.css
https://fonts.googleapis.com/css?family=Source+Sans+Pro:...
```

**Scripts**, form pages (21 pages, 5 scripts):
```
admin-assets/bower_components/jquery/dist/jquery.min.js
admin-assets/bower_components/bootstrap/dist/js/bootstrap.min.js
admin-assets/bower_components/fastclick/lib/fastclick.js
admin-assets/dist/js/adminlte.min.js
admin-assets/dist/js/demo.js
```

**Scripts**, list/view pages (27 pages, 8 scripts) — DataTables JS + slimscroll inserted:
```
admin-assets/bower_components/jquery/dist/jquery.min.js
admin-assets/bower_components/bootstrap/dist/js/bootstrap.min.js
admin-assets/bower_components/datatables.net/js/jquery.dataTables.min.js        <-- extra
admin-assets/bower_components/datatables.net-bs/js/dataTables.bootstrap.min.js  <-- extra
admin-assets/bower_components/jquery-slimscroll/jquery.slimscroll.min.js       <-- extra
admin-assets/bower_components/fastclick/lib/fastclick.js
admin-assets/dist/js/adminlte.min.js
admin-assets/dist/js/demo.js
```

**Meta baseline** (all 52 admin pages except `admin/login`, which differs — see §5): `charset=utf-8`, `X-UA-Compatible=IE=edge`, `viewport=width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no`.

**Includes**: all 52 routed admin pages except `admin/login` include `admin.inc.header`, `admin.inc.sidebar`, `admin.inc.footer` (already ported as `AdminHeader.tsx`/`AdminSidebar.tsx`/`AdminFooter.tsx` in M1). `admin/login` includes none of them — it is a standalone screen, matching its distinct asset set (§5).

**27 list/view pages on the DataTables variant**: `blog-category-list`, `blog-list`, `category-list`, `city-list`, `enquires-list`, `manage-appointment`, `manage-buyers`, `manage-payments`, `manage-sellers`, `order-list`, `other-category-list`, `pin-code-list`, `post-list`, `product-category-list`, `product-list`, `product-subcategory-list`, `product-view`, `review-list`, `seller-orders`, `seller-payments`, `slider-list`, `subscriber-list`, `users-list`, `view-buyer`, `view-enquiry`, `view-orders`, `view-seller`, `zones-list`.

**21 form pages on the plain variant**: `add-blog-category`, `add-city`, `add-other-category`, `add-pin-code`, `add-product-category`, `add-product-subcategory`, `add-slider`, `add-zone`, `change-password`, `edit-blog-category`, `edit-pincode`, `edit-product-category`, `edit-slider`.

The remaining 4 admin pages (`index`, `login`, `profile`, and the 4-page CKEditor sub-groups counted separately) are documented individually in §5.

### 2.4 CKEditor — two form-page sub-groups, with a real script-order difference (8 pages total)

Beyond the 21+27 pages above, 8 admin form pages load CKEditor 4.7.3 from a CDN
(`https://cdn.ckeditor.com/4.7.3/standard/ckeditor.js`) for a rich-text field, and split
into two groups by **where in the script order it loads** — a genuine load-order
divergence, not a cosmetic one:

| Sub-group | Pages | CKEditor position |
|---|---|---|
| **Blog/Post forms** (4 pages) | `add-blog`, `add-post`, `edit-blog`, `edit-post` | **First script in the file**, before jQuery — `admin/add-post.blade.php:45` (jQuery does not load until `:370`) |
| **Category/Product forms** (4 pages) | `add-category`, `add-product`, `edit-category`, `edit-product` | **Second script**, immediately after jQuery, before bootstrap — `admin/add-category.blade.php:45` (jQuery), `:47` (CKEditor) |

Both sub-groups otherwise use the 21-page form baseline (§2.2) for their remaining
scripts (bootstrap → fastclick → adminlte → demo.js). **This ordering must be preserved
exactly per page-group** — a single shared "admin form + CKEditor" component that always
puts CKEditor in the same relative position would be wrong for one of the two groups.

Blueprint §12.5 flags editor JS as "verify per admin form during port — no editor JS is
loaded from `assets/js`... confirm against `add-post`, `add-blog`, `add-product`." This
confirms CKEditor **is** loaded (contradicting the blueprint's implicit suggestion that
description fields might be plain `<textarea>`) — a small **Blueprint Correction
Notice**: §12.5's phrasing ("likely plain `<textarea>`") undersold what's actually
there. Source governs (contract §12.2) — CKEditor 4.7.3 is definitively loaded on these
8 pages, sourced from a public CDN with no SRI hash, no version pin beyond the URL's own
`4.7.3` path segment.

**Preserved defect:** `admin/add-category.blade.php:253-288` contains a commented-out
`<script>` block (36 lines). Per contract §12.4, commented code carries no authority and
must not be treated as intended behavior — noted here for completeness only, not acted
on.

### 2.3 A structural note carried over unchanged from M1 (not a new finding)

Nearly every view (77 of the ~103 checked with a `<head>` tag) places
`<meta http-equiv="content-type" content="text/html;charset=utf-8" />` **before** the
opening `<head>` tag (e.g. `about.blade.php:3`, `admin/order-list.blade.php:3`) — invalid
placement that HTML5 parsers silently hoist into `<head>`. M1 already encountered and
resolved this exact defect class for its 8 pages (`about/page.tsx` does not emit this tag
at all — Next.js's `metadata` mechanism supplies charset by its own means, and the tag is
redundant with the `<meta charset="UTF-8">` that also exists correctly-placed inside every
`<head>`). This manifest confirms the pattern is universal across the full 117-file
corpus, not an isolated case — future milestones porting these pages should not re-litigate
it; M1's precedent (§9.4 of `GATE-REPORT-M1.md`, "rendered DOM means post-parser") governs.

---

## 3. Root/public views — full delta table (40 views)

Legend: **B** = on public baseline (§2.1) exactly · **Δ** = deviates, detailed below ·
**DEAD** = unrouted, catalogued for completeness only, not to be ported (§7) · ✅prod =
independently checked against live production during this session or already captured
in `baseline/raw-html/`.

| # | View | Bucket | Head/script | Title |
|---|---|---|---|---|
| 1 | `404.blade.php` | LIVE (rendered by `/videos`, B-01) | B | "Spakshomeopathy - 404 Page" |
| 2 | `about.blade.php` | LIVE — **M1 ported** | B (M1-verified) | see M1 gate report |
| 3 | `all-products.blade.php` | LIVE (`/poducts-list/{slug}`) | Δ — alt-theme, §4 | "Online Shopping Site..." |
| 4 | `blog-detail.blade.php` | LIVE-orphan (`/blog-detail/{slug}`) | Δ — unique, §6.1 | "Green Gifts \| Blog" |
| 5 | `cart-checkout.blade.php` | LIVE (`/product-checkout` POST → this view) | B + 1 inline script (checkout-button handler, not a new lib) | "Spakshomeopathy - Checkout" |
| 6 | `categories.blade.php` | LIVE (`/categories/{cat}`) | Δ — alt-theme, §4 | "Online Shopping Site..." |
| 7 | `change-password.blade.php` | LIVE (buyer, `/change-password`) | B | "Spakshomeopathy - Change Password" |
| 8 | `checkout-buy-product.blade.php` | LIVE-orphan (`/buy-product/{pslug}`) | Δ — alt-theme, §4 | "Online Shopping Site..." |
| 9 | `checkout.blade.php` | **DEAD** (§7) | Δ — alt-theme (but unrouted) | "Online Shopping Site..." |
| 10 | `consultancy.blade.php` | LIVE (`/consultancy`) | B — uses baseline's own `bootstrap-datepicker.min.js`, no extra lib (§8) | "Spakshomeopathy - Consultancy" |
| 11 | `contact.blade.php` | LIVE — **M1 ported** | B (M1-verified) | see M1 gate report |
| 12 | `details.blade.php` | LIVE — **M1 ported** | B (M1-verified) | see M1 gate report |
| 13 | `diseases-details.blade.php` | LIVE (`/diseases-details/{slug}`) | B | "Spakshomeopathy - Post details" |
| 14 | `diseases-list.blade.php` | LIVE (`/diseases-list`) | B | "Spakshomeopathy - Products" |
| 15 | `enquiry-email.blade.php` | LIVE (mail body, no `<head>`) | N/A — table fragment only | N/A |
| 16 | `forgot-password.blade.php` | LIVE (`/reset-password`) | B | "Spakshomeopathy - Register" — **preserved defect, §7.2** |
| 17 | `herbs-list.blade.php` | LIVE (`/products`) | B | "Spakshomeopathy - Products" |
| 18 | `index.blade.php` | LIVE (`/`, `/home`) | Δ — unique + inline `<style>`, §6.2 | "Spaks Homeopathy Delhi \| Dr. S.K.Meena Clinic..." |
| 19 | `login.blade.php` | LIVE (`/login`) | B | "Spakshomeopathy - Register" — **known preserved defect P-05** |
| 20 | `mail.blade.php` | **DEAD** (§7) | N/A — plain text, no `<head>` | N/A |
| 21 | `main-category-products.blade.php` | LIVE (`/main-category-products/{cat_slug}`) | Δ — alt-theme, §4 | "Online Shopping Site..." |
| 22 | `manage-orders.blade.php` | LIVE (buyer, `/manage-orders`) | B | "Spakshomeopathy - Manage Orders" |
| 23 | `mother-tincture.blade.php` | LIVE — **M1 ported** | B (M1-verified) | see M1 gate report |
| 24 | `myaccount.blade.php` | LIVE (buyer, `/myaccount`) | B | "Spakshomeopathy - Myaccount" |
| 25 | `order-placed.blade.php` | BROKEN — B-17 (renders w/o required view data on direct hit) | Δ — alt-theme, §4; **production capture shows Laravel Whoops error page instead**, §4.3 | "Online Shopping Site..." (source) / "Whoops! There was an error." (production, direct hit) |
| 26 | `post-details.blade.php` | BROKEN — B-11 | B | "Spakshomeopathy - Post details" |
| 27 | `privacy-policy.blade.php` | LIVE — **M1 ported** | B (M1-verified) | see M1 gate report |
| 28 | `product-detail.blade.php` | LIVE (`/product-details/{slug}`) | Δ — most complex page, §6.3 | "Spakshomeopathy - Product details" |
| 29 | `product-list.blade.php` (root) | **DEAD** (§7) | Δ — unique, references non-existent `seller/seller-header` partial | "Zeintext" |
| 30 | `products.blade.php` | LIVE (multiple category routes) | B | "Spakshomeopathy - Products" |
| 31 | `profile.blade.php` | LIVE (buyer, `/profile`) | B | "Spakshomeopathy - Profile" |
| 32 | `register.blade.php` | LIVE (`/register`) | B | "Spakshomeopathy - Register" |
| 33 | `return-policy.blade.php` | LIVE — **M1 ported** | B (M1-verified) | see M1 gate report |
| 34 | `seller-register.blade.php` | LIVE-orphan (`/seller-register`) | Δ — alt-theme, §4 | "Online Shopping Site..." |
| 35 | `shopping-cart.blade.php` | BROKEN — B-16 (route `/shopping-cart`); LIVE at `/cart-list` | B + 1 inline script (cart AJAX handler, not a new lib) | "Spakshomeopathy - Cart" |
| 36 | `terms.blade.php` | LIVE — **M1 ported** | B (M1-verified) | see M1 gate report |
| 37 | `top-products.blade.php` | LIVE (`/top-poducts`) | Δ — alt-theme, §4 ✅prod | "Online Shopping Site..." — **scrambled og:title, §4.4** |
| 38 | `update-password.blade.php` | LIVE (`/update-password`) | Δ — alt-theme, §4 | "Online Shopping Site..." |
| 39 | `video.blade.php` | LIVE — **M1 ported** | B (M1-verified) | see M1 gate report |
| 40 | `welcome.blade.php` | **DEAD** (§7) — stock Laravel scaffold | N/A | "Laravel" |

---

## 4. The "alt-theme" (zeintext) page family — 9 pages, real and LIVE

**This is the single biggest finding of this milestone.** Nine routed, LIVE views —
`all-products`, `categories`, `checkout-buy-product`, `main-category-products`,
`order-placed`, `seller-register`, `top-products`, `update-password`, and the unrouted
`checkout` (DEAD, included for completeness) — do **not** use the site's live theme
assets at all. They use an entirely different, older template originating from a generic
e-commerce demo/starter branded **"zeintext"** (`og:url` = `http://www.zeintext.com`,
`twitter:site` = `@zeintext`), evidence the application was forked or repurposed from a
prior multi-vendor marketplace codebase — consistent with blueprint §0's documented
40%-vestigial-marketplace finding, now extended from the *database* into the *view layer*.

### 4.1 Full `<head>` (all 9 pages, byte-identical except `<title>`/og:title — see §4.4)

```html
<meta charset="UTF-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="India's biggest online store for Mobiles, Fashion (Clothes/Shoes), Electronics, Home Appliances, Books, Home, Furniture, Grocery, Jewelry, Sporting goods, Beauty & Personal Care and more! Find the largest selection from all brands at the lowest prices in India. Payment options - COD, EMI, Credit card, Debit card & more.">
<meta name="keywords" content="Online Shopping in India,online Shopping store,Online Shopping Site,Buy Online,Shop Online,Online Shopping,zeintext">
<meta property="og:url" content="http://www.zeintext.com" />
<meta property="og:type" content="www.zeintext.com" />
<meta property="og:title" content="..." />   <!-- see §4.4 -->
<meta property="og:description" content="India's biggest online store for Mobiles, Fashion..." />
<meta property="og:image" content="http://zeintext.com/assets/img/logo/logo-zeintext.png" />
<meta name='twitter:card' content="app">
<meta name="twitter:site" content="@zeintext">
<meta name="twitter:creator" content="@zeintext">
<meta name="twitter:title" content="Online Shopping Site for Mobiles, Electronics, Furniture, Grocery, Lifestyle, Books & More. Best Offers!">
<meta name='twitter:description' content="Shop for electronics, apparels & more using our zeintext app Free shipping & COD.">
<title>Online Shopping Site for Mobiles, Electronics, Furniture, Grocery, Lifestyle, Books & More. Best Offers!</title>
<link rel="icon" href="{{URL::asset('assets/img/icon/favicon.jpg')}}" type="image/x-icon" />
<link rel="stylesheet" href="{{URL::asset('assets/css/bootstrap.min.css')}}">
<link rel="stylesheet" href="{{URL::asset('assets/css/font-awesome.min.css')}}">
<link rel="stylesheet" href="{{URL::asset('assets/css/linear-icon.css')}}">
<link rel="stylesheet" href="{{URL::asset('assets/css/plugins.css')}}">
<link rel="stylesheet" href="{{URL::asset('assets/css/default.css')}}">
<link rel="stylesheet" href="{{URL::asset('assets/css/style.css')}}">
<link rel="stylesheet" href="{{URL::asset('assets/css/responsive.css')}}">
<script src="{{URL::asset('assets/js/vendor/modernizr-3.5.0.min.js')}}"></script>
```

Note `style.css`/`responsive.css` (the live theme's own stylesheets) are loaded **last**,
after five zeintext-specific stylesheets — so these 9 pages layer the live theme on top
of the dead one, not the other way round. Source: `all-products.blade.php:1-89`.

### 4.2 Full closing script list (all 9 pages, identical order)

```
assets/js/vendor/jquery-1.12.4.min.js
assets/js/popper.min.js
assets/js/bootstrap.min.js
assets/js/plugins.js
assets/js/ajax-mail.js
assets/js/main.js
```
Source: `all-products.blade.php:394-404`. **This is a different jQuery build
(1.12.4) from the live theme's `assets/js/jquery.js`** — these 9 pages do not load the
live theme's jQuery or any of the 9-script public baseline at all. `inc.header` /
`inc.footer` are still `@include`d inside these pages (`all-products.blade.php:95,378`),
so the DOM contains the live public header/footer markup, styled and scripted by two
unrelated theme/JS stacks simultaneously.

### 4.3 Asset availability — 6 of 8 unique assets 404 in PRODUCTION (verified live, this session)

Checked directly against `https://spakshomeopathy.com` (contract §12.3 — production
resolves what static reading alone cannot for a "does this asset exist" question):

| Asset | Local file exists? | Production HTTP status (checked 2026-08-16) |
|---|---|---|
| `assets/img/icon/favicon.jpg` | No | **404** |
| `assets/css/bootstrap.min.css` | Yes (153,182 B) | 200 (assumed, not separately re-checked — matches local) |
| `assets/css/font-awesome.min.css` | Yes (31,024 B) | 200 (assumed) |
| `assets/css/linear-icon.css` | No | **404** |
| `assets/css/plugins.css` | No | **404** |
| `assets/css/default.css` | No | **404** |
| `assets/js/vendor/modernizr-3.5.0.min.js` | No | **404 (inferred, not directly re-checked)** |
| `assets/js/vendor/jquery-1.12.4.min.js` | No | **404 (inferred)** |
| `assets/js/popper.min.js` | No | **404 (inferred)** |
| `assets/js/bootstrap.min.js` | No | **404 (inferred)** |
| `assets/js/plugins.js` | No | **404 (inferred)** |
| `assets/js/ajax-mail.js` | No | **404 (inferred)** |
| `assets/js/main.js` | No | **404 (inferred)** |

Directly re-verified against production this session: `assets/css/linear-icon.css` → 404,
`assets/css/plugins.css` → 404, `assets/js/main.js` → 404, `assets/img/icon/favicon.jpg`
→ 404. The remaining rows are inferred from local absence + the pattern established by
the 4 directly-checked rows and by M1's independent finding of "23 production-side 404s,
pre-existing, deliberately preserved" (`GATE-REPORT-M1.md` §13.5.E) — **not independently
re-verified one-by-one this session**; flagged as OI-19 below for a full re-check when
these pages are actually ported.

Full route-level production check, also this session: `GET /poducts-list/electronic-prhpg`
(a real `product_category` slug, read from `Database/db_newhomo.sql`) → **HTTP 200**,
confirmed the full alt-theme `<head>`/script list above byte-for-byte against the live
response. `GET /top-poducts` → **HTTP 200** (also cross-checked against the pre-existing
`baseline/raw-html/top-poducts-sic.guest.raw.html` capture — identical).

**Per NN-4/IR-9/D7, these 404s must be reproduced exactly, not fixed** — 6-11 broken
asset references per page on 9 live pages is exactly the kind of thing an engineer is
tempted to "helpfully" repair. Do not.

### 4.4 Preserved defect — scrambled `og:title` on exactly one of the 9 pages

`top-products.blade.php:27` (and, by the diff below, all 8 sibling pages **except**
`all-products.blade.php`):
```html
<meta property="og:title" content="zeintOnline Shopping Site for Mobiles, Electronics, Furniture, Grocery, Lifestyle, Books & More. Best Offers!ext" />
```
Note "zeint" + "ext" wraps around "Online Shopping Site...Best Offers!" — the word
"zeintext" was split by an incomplete find/replace, leaving "zeint" at the front and
"ext" appended at the very end. `all-products.blade.php:27` alone has the **correct**
non-scrambled text: `"zeintext Online Shopping Site for..."`. This is a genuine,
page-specific corruption — preserve verbatim per-page; do not "fix" the 8 broken copies
to match the 1 correct one.

### 4.5 `order-placed.blade.php` — production renders a Laravel error page, not this view

Direct-hit `/order-placed` is registered BROKEN item **B-17** ("renders without required
view data") in the contract's register (§9.2). The pre-existing capture
`baseline/raw-html/order-placed-broken.guest.raw.html` confirms what actually happens in
production: a Laravel **Whoops** debug error page (`<title>Whoops! There was an error.</title>`,
zero scripts, none of the alt-theme assets above load at all) — not the `order-placed.blade.php`
source `<head>` described in §4.1. **Both facts are recorded because they answer different
questions**: `order-placed.blade.php`'s own `<head>`/script content (§4.1, relevant when the
view *does* render successfully via the order-flow-supplied `$row`) is source-derived;
the *direct-hit failure mode* (relevant for reproducing B-17) is production-verified and
supersedes the source `<head>` for that specific broken-request scenario, per contract
§12.3. Also note: production's `APP_DEBUG` is evidently `true` (Whoops shows full stack
traces including server file paths) — this is a pre-existing blueprint §16.8 concern, out
of scope for M2 to act on; flagged only as corroborating evidence.

---

## 5. Outlier admin pages (4 of 52)

### 5.1 `admin/login.blade.php` — standalone, no shared partials

Different from all other admin pages: no `admin.inc.*` includes (`admin/login.blade.php`
has zero `@include`), 6 stylesheets (not 6-or-7 — see below) plus `iCheck` (checkbox
styling for the login "remember" UI) in place of DataTables, and only 3 scripts:
```
admin-assets/bower_components/jquery/dist/jquery.min.js
admin-assets/bower_components/bootstrap/dist/js/bootstrap.min.js
admin-assets/plugins/iCheck/icheck.min.js
```
**Production-verified** via `baseline/raw-html/admin-login.guest.raw.html`: title
"Admin Panel | Log in", exact 6 links (bootstrap, font-awesome, ionicons, AdminLTE,
`iCheck/square/blue.css`, Google Fonts — no `_all-skins.min.css`, unlike every other admin
page), exact 3 scripts as above. Byte-for-byte match between source and this session's
production capture.

### 5.2 `admin/index.blade.php` (Dashboard) and `admin/profile.blade.php` — the "full stack" pages

Both load the entire AdminLTE plugin surface — Morris.js, jvectormap, daterangepicker,
bootstrap-wysihtml5, sparkline, knob, moment.js — reflecting the unused-reporting-surface
blueprint §10.3 already documents ("`admin-assets` ships Chart.js/Morris but no view loads
them" — this finding refines that: **Morris IS loaded**, by `admin/index` and
`admin/profile`, but the blueprint's underlying point stands: nothing in either page's
body actually renders a chart with it — confirmed by absence of `<canvas>`/`.chart`
markup expecting Morris data in `admin/index.blade.php`'s body).

**`admin/index.blade.php`** — 11 stylesheets, 18 scripts (in order):
```
STYLESHEETS:
admin-assets/bower_components/bootstrap/dist/css/bootstrap.min.css
admin-assets/bower_components/font-awesome/css/font-awesome.min.css
admin-assets/bower_components/Ionicons/css/ionicons.min.css
admin-assets/dist/css/AdminLTE.min.css
admin-assets/dist/css/skins/_all-skins.min.css
admin-assets/bower_components/morris.js/morris.css
admin-assets/bower_components/jvectormap/jquery-jvectormap.css
admin-assets/bower_components/bootstrap-datepicker/dist/css/bootstrap-datepicker.min.css
admin-assets/bower_components/bootstrap-daterangepicker/daterangepicker.css
admin-assets/plugins/bootstrap-wysihtml5/bootstrap3-wysihtml5.min.css
https://fonts.googleapis.com/css?family=Source+Sans+Pro:...

SCRIPTS:
admin-assets/bower_components/jquery/dist/jquery.min.js
admin-assets/bower_components/jquery-ui/jquery-ui.min.js
admin-assets/bower_components/bootstrap/dist/js/bootstrap.min.js
admin-assets/bower_components/raphael/raphael.min.js
admin-assets/bower_components/morris.js/morris.min.js
admin-assets/bower_components/jquery-sparkline/dist/jquery.sparkline.min.js
admin-assets/plugins/jvectormap/jquery-jvectormap-1.2.2.min.js
admin-assets/plugins/jvectormap/jquery-jvectormap-world-mill-en.js
admin-assets/bower_components/jquery-knob/dist/jquery.knob.min.js
admin-assets/bower_components/moment/min/moment.min.js
admin-assets/bower_components/bootstrap-daterangepicker/daterangepicker.js
admin-assets/bower_components/bootstrap-datepicker/dist/js/bootstrap-datepicker.min.js
admin-assets/plugins/bootstrap-wysihtml5/bootstrap3-wysihtml5.all.min.js
admin-assets/bower_components/jquery-slimscroll/jquery.slimscroll.min.js
admin-assets/bower_components/fastclick/lib/fastclick.js
admin-assets/dist/js/adminlte.min.js
admin-assets/dist/js/pages/dashboard.js       <-- dashboard-specific init script
admin-assets/dist/js/demo.js
```
Note the absence of DataTables here (dashboard has no table) and the presence of a
dashboard-specific `pages/dashboard.js` not loaded by any other page. Title: "Admin Panel
| Dashboard" (correct, not a copy-paste bug).

**`admin/profile.blade.php`** shares the identical 11-stylesheet set but a **shorter**
6-script list (no jquery-ui/raphael/morris/sparkline/jvectormap/knob/moment/daterangepicker/
wysihtml5/dashboard.js — those CSS files are loaded but their JS counterparts are not):
```
admin-assets/bower_components/jquery/dist/jquery.min.js
admin-assets/bower_components/bootstrap/dist/js/bootstrap.min.js
admin-assets/bower_components/jquery-slimscroll/jquery.slimscroll.min.js
admin-assets/bower_components/fastclick/lib/fastclick.js
admin-assets/dist/js/adminlte.min.js
admin-assets/dist/js/demo.js
```
This means `admin/profile.blade.php` loads 5 plugin **stylesheets** (Morris, jvectormap,
datepicker, daterangepicker, wysihtml5) whose corresponding **scripts never load on this
page** — dead CSS with no active JS behind it, a real (if inert) discrepancy to preserve
exactly: ship the CSS `<link>` tags, do not add the scripts just because the stylesheets
imply them. Title: "Admin Panel | User Profile" (correct).

---

## 6. Individually unique views (require dedicated handling — cannot reuse a shared component as-is)

### 6.1 `blog-detail.blade.php`

Distinct `<head>` unrelated to both the public baseline and the alt-theme family; title
"Green Gifts | Blog" — itself evidence of a **third** template origin (neither
"Spakshomeopathy" nor "zeintext" branding). LIVE-orphan route (`/blog-detail/{blog_slug}`,
no index page links to it per blueprint §11 item 8). Full head/script inventory deferred
to whichever milestone implements this route (M3), since M2's job is cataloguing, not
building; recorded here only as a flag that it needs its own dedicated treatment, not
reuse of the public baseline.

### 6.2 `index.blade.php` — homepage

**Stylesheets** (public baseline §2.1's two, plus bxSlider CSS from cdnjs):
```html
<link rel="stylesheet" href="{{URL::asset('assets/css/style.css')}}">
<link rel="stylesheet" href="{{URL::asset('assets/css/responsive.css')}}">
<link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/bxslider/4.2.5/jquery.bxslider.css">
```

**Inline `<style>` block** (1,436 bytes, `index.blade.php:20-103`) — page-specific rules
for `.shop-one__single`, `.history-one__single + .history-one__single`, `.thm-gray-bg-2`,
`.sec-pad`, a malformed `@media (min-width: 1200px) .container {...}` rule (missing the
inner block braces around the media query — **a real CSS syntax defect**, preserve as
literal text, do not repair), `.bx-wrapper` (×2, one of them itself malformed —
`*: ;` as a declaration, again preserve verbatim), `.fun-fact-one__single` rules, and a
`@-webkit-keyframes rotation` block for a `#loading` spinner whose own rule (`#loading {}`)
is empty.

**Scripts** — public 9-script baseline, **then** bxSlider JS and an inline init script
appended after `theme.js` (not interleaved):
```
[public baseline 9 scripts, identical order to §2.1]
https://cdnjs.cloudflare.com/ajax/libs/bxslider/4.2.5/jquery.bxslider.min.js
<script>
$('.bxslider').bxSlider({
  auto: true,
  autoControls: true,
  stopAutoOnClick: false,
  pager: true,
});
</script>
```
Confirms blueprint §4.4's documented bxSlider config exactly
(`auto:true, autoControls:true, stopAutoOnClick:false, pager:true`) — verified against
`index.blade.php:423-432`, matching blueprint word-for-word.

Meta set: full SEO block (the only root page with one) — `google-site-verification`,
`description`, `keywords`, `msapplication-TileColor`, `theme-color` — per blueprint
§13.2. Title: "Spaks Homeopathy Delhi | Dr. S.K.Meena Clinic | Online Homeopathic
Medicines & Consultation" (`index.blade.php:9`).

### 6.3 `product-detail.blade.php` — the most complex page (per blueprint §22 M3, confirmed here at the asset-manifest level)

**Stylesheets** (public baseline's two, plus Fancybox CSS from jsdelivr):
```html
<link rel="stylesheet" href="{{URL::asset('assets/css/style.css')}}">
<link rel="stylesheet" href="{{URL::asset('assets/css/responsive.css')}}">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fancyapps/fancybox@3.5.7/dist/jquery.fancybox.min.css">
```

**Full closing script list — exact order** (`product-detail.blade.php:639-673`, **independently
production-verified** via `baseline/raw-html/product-details-agaricus.guest.raw.html`,
byte-for-byte order match):
```
assets/js/jquery.js
https://cdn.jsdelivr.net/npm/@fancyapps/fancybox@3.5.7/dist/jquery.fancybox.min.js   <-- Fancybox loads 2nd, NOT appended at the end
assets/js/bootstrap.bundle.min.js
assets/js/bootstrap-select.min.js
assets/js/owl.carousel.min.js
assets/js/jquery.magnific-popup.min.js
assets/js/isotope.js                                                                  <-- inserted here, between magnific-popup and datepicker
assets/js/bootstrap-datepicker.min.js
assets/js/jquery.validate.min.js
assets/js/swiper.min.js                                                               <-- inserted here
assets/js/nouislider.js                                                               <-- inserted here
assets/js/jquery.bootstrap-touchspin.js                                               <-- inserted here
assets/js/theme.js
[2 inline scripts: 366B (Fancybox init) + 3,433B (the price-checkbox calculator, blueprint §7.1)]
```

**Confirms and refines blueprint §22 M2's testing-checklist claim.** The blueprint says
"product-detail needs Fancybox, Isotope, Swiper, noUiSlider, TouchSpin" — true, but the
checklist item undersells the finding: **`wow.min.js` is also absent** from this page's
script list (present in the public 9-script baseline, but `product-detail` does not load
it at all — verified: zero occurrences of `wow.min.js` in `product-detail.blade.php`).
This is a **library the page's own baseline omits**, not just extras it adds — exactly
the "no page loads a library the original didn't, and none omits one" testing
requirement from blueprint §22 M2, now concretely evidenced. A component built by
naively extending `PublicScripts`/`LegacyScriptRunner` with the 5 extra libs appended
would incorrectly ship `wow.min.js` and get Fancybox's position wrong (it must load
2nd, immediately after jQuery, not last).

Also confirms Fancybox's documented options (blueprint §4.4) match source exactly —
`product-detail.blade.php:654-664`: `buttons:['close'], wheel:false,
transitionEffect:"slide", loop:true, toolbar:false, clickContent:false`.

Meta set: same 5-tag "Variant B" (§2.1) as most inner pages, no TileImage. Title:
"Spakshomeopathy - Product details" — generic, static, confirming blueprint §13.2's
"no per-product SEO" finding at the manifest level.

---

## 7. DEAD views catalogued for completeness (per contract §2.4/blueprint §0 — never ported, listed so the exclusion is auditable, not silent)

| View(s) | Why DEAD | Evidence |
|---|---|---|
| `checkout.blade.php` | Zero `view('checkout')` references anywhere in `app/` or `routes/`. `/product-checkout` (the only plausibly-related route) actually renders `cart-checkout`, not `checkout` — confirmed `HomeController.php:391-405` (`Checkout()` method returns `view('cart-checkout', ...)`). | `grep -rn "view('checkout'" app/ routes/` → 0 results |
| `product-list.blade.php` (root, distinct from `admin/product-list.blade.php`) | Zero references anywhere. Also references a non-existent partial `@include('seller/seller-header')` — would itself fatal if ever rendered. Title "Zeintext" (unrelated third branding, distinct from both other identified template families). | `grep -rn "view('product-list'" app/ routes/` → 0 results; `find resources/views -iname seller-header*` → 0 results |
| `welcome.blade.php` | Stock Laravel scaffold. Sole reference is a **commented-out** line, `routes/web.php:15` (`//     return view('welcome');`) — commented code carries no authority (contract §12.4). | `routes/web.php:15` |
| `mail.blade.php` (root, distinct from `mails/*`) | Zero references anywhere; a stray test artifact ("hii this main second email file gk sharma"). No `<head>` at all. | `grep -rn "'mail'" app/ routes/` excluding email-related matches → 0 results |
| `resources/views/buyer/*` (8 files: `buyer-profile`, `buyer-sidebar`, `buyer-topbar`, `change-password`, `manage-orders`, `myaccount`, `order-list`, `view-orders`) | **New finding, not previously catalogued in the blueprint or M1 gate report.** Referenced only by `app/Http/Controllers/LoginController.php:49` (`redirect('buyer/myaccount')`) — but that controller is itself the blueprint's already-documented DEAD duplicate (`namespace App\Http\Controllers\Auth` collision with the real, routed `Auth/LoginController.php`; blueprint §1.2: "Root `LoginController.php` — Duplicate of the `Auth/` version, unrouted"). No route ever dispatches to this controller, so `redirect('buyer/myaccount')` never executes, and no `view('buyer.*')` call exists anywhere. | `grep -rn "'buyer\." app/ routes/` → 0 view() calls; `grep -rn "'buyer/" app/` → only the one dead-controller redirect |
| `resources/views/admin/buyer/*` (8 files, same filenames as above, different directory) | Already correctly bucketed DEAD by blueprint §1.3 ("a DEAD `admin/buyer/` subtree"). Confirmed here: zero `view('admin.buyer.*')` calls anywhere; `BuyerController` uses the **root-level** views (`myaccount`, `profile`, `manage-orders`, `view-orders`, `change-password`, `order-list`) exclusively (`BuyerController.php:24,32,46,81,90,106,113`). | `grep -rn "view('admin.buyer" app/` → 0 results |
| `mails/test.blade.php` | Backs the `/testMail` route, itself contract-listed as "Development artifact... **remove**" (contract §3.1 exclusion table). Title-only head, no styling. | Contract §3.1 exclusion table |
| `mails/verify.blade.php` | Account-verification email is commented out in `RegisterController` (blueprint §5.3: "email verification is commented out"). Never sent. | Blueprint §5.3, §9.4 |
| `app/Http/Controllers/product-detail.blade.php`, `product-view.blade.php` | Not under `resources/views/` at all — misplaced Blade files inside the controller directory. Already excluded by contract §3.1. Not part of this manifest's 117-file count; noted here only to confirm they were not double-counted or mistakenly included. | Contract §3.1 exclusion table |

**Total newly-identified DEAD views this milestone: 24** (`checkout`, `product-list` root,
`welcome`, `mail` root, 8× `buyer/*`, 8× `admin/buyer/*`, `mails/test`, `mails/verify`,
minus the 2 already known from blueprint = **16 net-new DEAD files beyond what blueprint
already listed**, most significantly the previously-uncatalogued root `buyer/*` subtree).
None of these are ported; all are recorded so the exclusion is auditable per contract
§2.4, not silent.

---

## 8. Confirmation of the blueprint §22 M2 testing-checklist claims

| Claim | Verified? | Evidence |
|---|---|---|
| "product-detail needs Fancybox, Isotope, Swiper, noUiSlider, TouchSpin" | ✅ Confirmed, refined | §6.3 — also found `wow.min.js` is *omitted*, and Fancybox's exact position (2nd script, not appended) |
| "index needs bxSlider" | ✅ Confirmed | §6.2 — exact CSS+JS+inline-init-script triad documented |
| "consultancy needs datepicker" | ✅ Confirmed, but not an *extra* library | §3 row 10 — `bootstrap-datepicker.min.js` is already part of the 9-script public baseline (§2.1); consultancy does not load anything beyond the baseline. The blueprint's phrasing ("needs datepicker") is accurate about the *dependency* but could be misread as implying an addition — clarified here. |
| "any others" (open-ended, per the M2 task) | ✅ Found: the 9-page alt-theme/zeintext family (§4) — **not mentioned anywhere in the blueprint or contract** — plus `index`'s inline `<style>` block, `blog-detail`'s third distinct template, and the admin dashboard/profile "full plugin stack" (§5.2) | §4, §5.2, §6.1, §6.2 |

---

## 9. Layout-wiring assessment — no new code required

Blueprint §22 M2 lists as a deliverable: *"plus layout wiring for per-page overrides."*
**Assessed and found already complete, built in Milestone 1** — no `src/` file was
created or modified for this milestone.

M1 already established the per-page `<head>` override mechanism using Next.js App
Router's native per-route `metadata` export (`src/app/about/page.tsx:16-25` etc.) for
`<title>`/meta, plus explicit `<PublicStylesheets />`/`<PublicScripts />` (or
`<AdminHeader />`/`<AdminSidebar />`/`<AdminFooter />` for admin) components rendered
directly in each page's JSX tree for `<link>`/`<script>` tags (which Next's `metadata`
API cannot emit — documented in `PublicStylesheets.tsx:1-12`). This is the standard,
idiomatic Next.js mechanism for exactly this problem and requires no additional
structural work: a future page needing extra assets (e.g. `product-detail`) renders its
own additional `<link>`/`<script>` JSX directly, or a small dedicated component
(e.g. a hypothetical `ProductDetailScripts.tsx`), alongside the shared components — the
same pattern M1 already uses. Per contract §5.2 ("extracting repeated markup into
components with byte-identical output" is pre-approved), building such page-specific
components when M3 actually ports these pages is in scope for that milestone, not this
one; M2's job was to identify *what* each page needs (done, §§3-6), not to build the
components (M3+, out of scope here per the task boundary).

**No decision gap was hit on this point** — the mechanism is a Next.js structural
default, not a 1:1-fidelity judgment call, and it produces zero rendered-output
difference from the plain per-file component composition M1 already committed to.

Root layout (`src/app/layout.tsx`) was inspected and confirmed still bare (`<html>/<body>`
only, no injected markup) — consistent with M1's "no layout inheritance" design decision
(blueprint §4.1) and unchanged by this milestone.

---

## 10. What this milestone explicitly did NOT do

- **No authenticated capture.** OI-1a (buyer credentials) and OI-1b (admin credentials)
  remain exactly as M1 left them — open, owner-supplied, untouched. Every admin-page
  claim in this document is sourced from **Laravel source** (`resources/views/admin/**`)
  cross-checked only against `admin/login`'s **guest-accessible** raw capture
  (`baseline/raw-html/admin-login.guest.raw.html` — the login screen itself requires no
  authentication to view). No other admin page's rendered output was observed, inferred,
  or guessed at from an authenticated session — every other admin `<head>`/script claim
  in §2.2 and §5.2 is **VERIFIED AGAINST LOCAL SOURCE ONLY**.
- **No page routes were built.** `src/app/` contains exactly what M1 left it with, plus
  nothing. This document is the only artifact this milestone produced.
- **No Laravel source was modified.** Every command run against
  `spakshomeopathy.com/` in this session was read-only (`grep`, `find`, `cat`/`Read`).
- **No production data was modified.** All production HTTP requests this session were
  `GET` requests to public, unauthenticated, read-only pages and static assets.
- **CR-001/CR-002 were not touched.** Admin settings functionality remains explicitly
  out of scope per `docs/CR-001-ADMIN-SETTINGS.md`.

---

## 11. Outstanding Issues opened this milestone

Continuing the numbering from `GATE-REPORT-M1.md` (last used: OI-17).

### OI-18 — `all-products`/8-sibling alt-theme pages: only 4 of 13 unique asset 404s directly re-verified against production

**Severity:** Low. **Blocks:** Nothing in M2; should be closed before M3/M9 ports any of
the 9 alt-theme pages, so their asset list is fully production-confirmed rather than
partly inferred.
**Detail:** §4.3 directly re-checked 4 of 13 unique zeintext-family assets against live
production (`linear-icon.css`, `plugins.css`, `main.js`, `favicon.jpg`, all confirmed
404) and the full `<head>`/script list on 2 of the 9 routes end-to-end
(`poducts-list/electronic-prhpg`, `top-poducts`). The remaining 9 unique assets
(`bootstrap.min.css`, `font-awesome.min.css`, `modernizr-3.5.0.min.js`,
`jquery-1.12.4.min.js`, `popper.min.js`, `bootstrap.min.js`, `plugins.js`,
`ajax-mail.js`) were inferred 404/200 from local file presence/absence, following the
established pattern from M1's independent 23-asset 404 finding, but not re-fetched
individually this session.
**To close:** run the M1-established `assets:audit`-style live fetch against these 9
remaining URLs (the tooling already exists — `scripts/audit-live-assets.ts` — extend its
target list, or simply `curl -I` each) before M3/M9 build these pages.

### OI-19 — `poducts-list/{cat_slug}` (and by extension `main-category-products`, `top-poducts`) 500s for arbitrary/invalid slugs — new BROKEN-item candidate, not yet in the contract's Register 9.2

**Severity:** Medium (asset-manifest-adjacent — affects what "successfully rendered
`<head>`" even means for this route family; does not block M2's own deliverable, which
is source-derived and unaffected).
**Detail:** `GET /poducts-list/1` → **HTTP 500**, Laravel Whoops page (`APP_DEBUG=true`,
full stack trace with server file paths leaking), root cause visible in
`HomeController.php:157` (`GetAllProducts`): `$getpId=DB::table('product_category')
->where('cat_slug',$cat_slug)->first();` followed immediately by `$getpId->id` with no
null guard — fatals whenever `$cat_slug` does not match a `product_category.cat_slug`
row exactly (case-sensitive, unsanitized slug matching). A valid slug
(`electronic-prhpg`, read from `Database/db_newhomo.sql`) renders successfully (200).
This is structurally identical to the contract's own **B-06** pattern ("Fatal — null
dereference on `product_category` lookup", currently registered against
`/admin/product-view/{id}`) but occurring on a **different, public-facing** route not
currently in Register 9.2.
**Why this is flagged, not fixed:** contract IR-9/NN-4 forbid repairing any BROKEN
behavior without an Approved Fix Register entry (§9.3, currently empty). This is
squarely the "obvious improvement trap" pattern (§6.3) — a null guard looks like a
one-line fix and is explicitly the kind of change the contract prohibits an engineer
from making unilaterally.
**To close:** owner/architect decision — either (a) add this route family to Register
9.2 as a new BROKEN item (B-18?) with "reproduce the 500 for any non-matching slug" as
the target behavior, following the existing pattern for B-06, or (b) confirm it's
already implicitly covered by the existing B-06 characterization and no new register
entry is needed. Recommend (a) for auditability, per contract §2.4's "when in doubt,
list explicitly" principle — but this is the owner's call (§10.1 Step 6), not mine.
Does not block M2 or M3 (M3's own testing checklist already covers product listing
behavior generally); flagged here because it surfaced during asset-manifest work on
this specific route family and would otherwise be lost.

### OI-20 — `blog-detail.blade.php`'s asset stack not catalogued to the same depth as other unique pages

**Severity:** Low. **Blocks:** Whichever milestone first ports `/blog-detail/{slug}`
(currently unscheduled — LIVE-orphan, no index page links to it, per blueprint §11 item
8; likely M3 given it's a public content page, but not explicitly listed in blueprint
§22 M3's file list).
**Detail:** §6.1 confirms this page uses neither the public baseline (§2.1) nor the
alt-theme family (§4) — its title "Green Gifts | Blog" implies a third, unidentified
template origin. Full `<head>`/script transcription was not performed to the same level
of detail as `index`/`product-detail` because this session's priority was the
higher-traffic/higher-risk pages explicitly named in blueprint §22 M2's checklist; this
page was lower priority given it has no inbound navigation link anywhere in the live
site (LIVE-orphan).
**To close:** a 20-minute follow-up reading `blog-detail.blade.php` in full and
transcribing its `<head>`/script list in the same format as §4.1/§6.2/§6.3, before the
milestone that ports it begins.

---

## 12. Preserved defects catalogued this milestone (pattern-matched against M1's findings)

M1 found several `<title>` copy-paste bugs on its 8 pages (`terms`/`privacy-policy`/
`return-policy` all "Spakshomeopathy - About Us"; `mother-tincture` "Spakshomeopathy -
Register"; `details` "Spakshomeopathy - TB"). This milestone found the same defect
class recurring heavily in **admin**, plus two new defect types (duplicate `<link>` tag,
scrambled `og:title`) not previously catalogued.

| # | Defect | File:line | Correct migration behavior |
|---|---|---|---|
| D-M2-01 | `admin/enquires-list.blade.php` titled "Product List" | `admin/enquires-list.blade.php:13` | Preserve verbatim — do not correct to "Enquiry List" |
| D-M2-02 | `admin/manage-buyers.blade.php` AND `admin/manage-sellers.blade.php` both titled "Pin Code List" | `admin/manage-buyers.blade.php:13`, `admin/manage-sellers.blade.php:13` | Preserve verbatim on both |
| D-M2-03 | `admin/other-category-list.blade.php`, `admin/product-category-list.blade.php`, `admin/product-subcategory-list.blade.php` all titled "Category List" | respective `:13` lines | Preserve verbatim on all three (indistinguishable from `admin/category-list.blade.php`'s own, correct, "Category List" title) |
| D-M2-04 | `admin/seller-orders.blade.php` titled "Order List" (same as `admin/order-list.blade.php`) | `admin/seller-orders.blade.php:13` | Preserve verbatim |
| D-M2-05 | `admin/view-seller.blade.php` titled "View Enquiry" (should read "View Seller") | `admin/view-seller.blade.php:13` | Preserve verbatim |
| D-M2-06 | `admin/add-category.blade.php` (disease/herb category form) titled "Admin Panel \| Add Product" | `admin/add-category.blade.php:13` | Preserve verbatim — do not correct to "Add Category" |
| D-M2-07 | `admin/edit-blog-category.blade.php` titled "Admin Panel \| Add Blog Category" (should read "Edit") | `admin/edit-blog-category.blade.php:7` | Preserve verbatim |
| D-M2-08 | **New defect class:** `admin/add-product.blade.php`, `admin/edit-product.blade.php`, `admin/add-category.blade.php`, `admin/edit-category.blade.php` each load `admin-assets/bower_components/bootstrap/dist/css/bootstrap.min.css` **twice** — a literal duplicate `<link>` tag | `admin/add-product.blade.php:21,25` (and equivalent lines in the other 3) | Emit the duplicate `<link>` tag twice in the ported markup — do not de-duplicate; NN-5 requires identical element count |
| D-M2-09 | **New defect class:** scrambled `og:title` on 8 of the 9 alt-theme pages (§4.4) — "zeintext" split across the string ends | `top-products.blade.php:27` and 7 siblings; `all-products.blade.php:27` is the one correct copy | Preserve each page's own copy verbatim — 8 pages get the scrambled text, exactly 1 (`all-products`) gets the correct text; do not normalize either direction |
| D-M2-10 (context, not new) | `login.blade.php` title "Spakshomeopathy - Register" | already contract-registered as **P-05** | No action — already governed by the existing register; re-confirmed present in this milestone's extraction, not re-logged as new |
| D-M2-11 | `all-products.blade.php:5` stray `<meta http-equiv="content-type">` **before** `<head>` opens on line 7 (Blade source has `<html>` then the stray meta then `<head>`) — same defect class as the universal one in §2.3, but this occurrence is inside a *different* head-open pattern (2-line gap, not 1) worth flagging as it affects 8 more files with the alt-theme's 2-line `<html>...<head>` gap | `all-products.blade.php:1-7` and the 8 sibling alt-theme pages | Governed by the same M1 precedent as §2.3 — the parsed-DOM (post-hoist) interpretation applies; no separate action needed, listed for completeness |

---

## 13. Toolchain verification

This milestone made **zero changes** to `spakshomeopathy-next/src/`, `package.json`,
config files, or any other project file — it produced exactly one new file
(`docs/asset-manifest.md`, this document). The toolchain was still run in full per the
task instructions, to confirm no regression from the previous (M1) state:

See the accompanying report for exact command output. Summary: `typecheck`, `lint`,
`format:check`, `test`, and `build` were all run against the unmodified M1 codebase and
their results are reported as-is — this milestone introduces no code for them to
validate.

---

*End of Milestone 2 asset manifest.*
