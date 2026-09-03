# M3 — Application Mapping: Route → Middleware → Controller → DB → View → External Services → Behavior

**Status:** Documentation only. No code written, no MongoDB collections designed, no
Next.js files touched.
**Author:** Migration Implementer
**Date:** 2026-08-16
**Governing documents (read in full before this document was written):**
`MIGRATION-CONTRACT.md`, `blueprint.md` (in full), `docs/OI-6-RESOLUTION.md`,
`docs/D-11-DATABASE-ARCHITECTURE.md`, `docs/D-10-CUTOVER-ROLLBACK-STRATEGY.md`,
`docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md`, `docs/asset-manifest.md`.

**Source of truth for this document:** `/home/muskan/spakshomeopathy-backup-16-1-2026/public_html/`
(root level only — **not** `public_html/babasahebsamaj/`, `public_html/meenaparivaar/`,
`public_html/spakseducation/`, which are unrelated sibling projects and were not read).
Per `docs/OI-6-RESOLUTION.md`, this directory supersedes
`/home/muskan/spakshomeopathy-backup-16-1-2026/spakshomeopathy.com/` (the stale local
backup) wherever they conflict, for Laravel application behavior (contract §11 rank 4).

**Method.** Every route in `routes/web.php`, `routes/admin.php`, `routes/api.php`,
`routes/seller.php` was read directly from `public_html/`, matched to its
controller method (also read directly, in full, from `public_html/app/Http/Controllers/`),
cross-checked against `docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md` §9/§11 for DB
read/write claims (not re-derived from scratch, but independently verified against
the `public_html/` source per the task's instruction), and cross-checked against
`docs/asset-manifest.md` for view/asset-bucket classification. Every controller file
in `public_html/app/Http/Controllers/` (7 live + `Auth/*` + the misplaced Blade files +
the dated backup) was also `diff`'d in full against its counterpart in
`spakshomeopathy.com/` to catch drift beyond what was already reported to this
implementer (§6 below reports the results).

**Labeling convention.** Every claim below is either:
- **VERIFIED** — read directly from `public_html/...:line` this session, or
- **INFERRED** — reasoned from pattern/analogy (used only where explicitly marked; this
  document is overwhelmingly VERIFIED, consistent with the task's requirement).

---

## 0. Scope boundary and non-scope restated

- This document does **not** design MongoDB collections or make any embedding/reference
  decision — that is `docs/M3-DATABASE-MAPPING.md`'s job, not this one's. Where a route's
  behavior has MongoDB implications worth flagging, it is flagged inline, never decided.
- OI-1a/OI-1b (buyer/admin credentials) are untouched, out of scope, and not needed —
  every claim below is derived from static source reading, not from an authenticated
  capture.
- No code of any kind was written. No file anywhere was modified. See §7 for the full
  confirmation list.

---

## 1. Public routes (`routes/web.php`, no middleware group — verified `public_html/routes/web.php:1-149`)

Legend for the **Behavior classification** column (blueprint §0 four-bucket system, plus
the practical LIVE-orphan label already established): **Public** · **Buyer-authenticated**
· **Admin-authenticated** · **POST-action** · **AJAX-or-API-like** · **Payment-related** ·
**Upload-related** · **Email-related** · **Broken** · **Dead** · **Vestigial**. A route can
carry more than one label (e.g. "Public, Broken").

### 1.1 Content & discovery

| # | Route | MW | Controller@method (file:line) | DB ops (verified) | View (asset bucket, `asset-manifest.md`) | External services | Classification |
|---|---|---|---|---|---|---|---|
| 1 | `GET /` | none | `HomeController@index` (`app/Http/Controllers/HomeController.php:20-31`) | R: `tbl_homeopathy` (ordered `name ASC`), `categories` (ordered `name ASC`) | `index.blade.php` — unique head + 1,436B inline `<style>`, bxSlider CDN (asset-manifest §6.2) | Google Translate (header), 6× YouTube iframes (verified `public_html` vs 3 in stale backup — pre-documented drift), bxSlider CDN (cdnjs), Google Site Verification meta | Public |
| 2 | `GET /home` | none | `HomeController@home` (`HomeController.php:34-45`) | Identical to #1 (duplicate query, independently coded — contract §5.2 forbids consolidating) | `index` (same as #1) | Same as #1 | Public |
| 3 | `GET /products` | none | `HomeController@GetProducts` (`HomeController.php:105-119`) | R: `categories WHERE type='H'` ordered `name ASC` | `herbs-list.blade.php` (public baseline, asset-manifest §2.1/§3 row 17) | Google Translate | Public |
| 4 | `GET /productsbydisease/{slug}` | none | `HomeController@GetProductsbydiseases` (`HomeController.php:121-131`) | R: `products WHERE p_status=1 AND p_cat={slug} ORDER BY id DESC` `paginate(24)` — **`{slug}` used as an integer category id, not a slug string** (blueprint-confirmed naming oddity) | `products.blade.php` (public baseline) | — | Public |
| 5 | `GET /diseases-list` | none | `HomeController@DiseasesList` (`HomeController.php:47-53`) | R: `categories WHERE type='N' AND status=1 ORDER BY name ASC` | `diseases-list.blade.php` (public baseline, §3 row 14) | — | Public |
| 6 | `GET /videos` | none | `HomeController@VideosList` (`HomeController.php:57-60`) | none | `404.blade.php` (public baseline, §3 row 1) | — | **Broken** (B-01 — deliberately returns 404 view; verified: method body is exactly `return view('404');`) |
| 7 | `GET /diseases-details/{slug}` | none | `HomeController@DiseasesDetails` (`HomeController.php:78-95`) — **declared twice** in `web.php` (line 24 and line 98, both routing to the same method; the second declaration is a dead duplicate route registration, harmless because Laravel keeps the last-registered match, itself identical) | R: `categories` (ordered), `categories WHERE slug={slug}` (first), `tbl_post WHERE post_status=1 AND post_diseases={id}` count then `paginate(8)` | `diseases-details.blade.php` (public baseline) if posts exist; else redirect `/home` | — | Public. Redirects to `/home` when post count is 0 (verified `HomeController.php:87-94`) |
| 8 | `GET /main-category-products/{cat_slug}` | none | `HomeController@GetMcatProducts` (`HomeController.php:177-185`) | R: `product_category WHERE cat_slug={cat_slug}` first (**no null guard** — see OI-19 below), then `products` join `product_images` where `p_cat={cat_id}`, `simplePaginate(10)` | `products.blade.php` | — | Public. **500 on invalid/non-matching `cat_slug`** (same class of defect as B-06; see §6.2 below — flagged, not in Register 9.2 as its own numbered item) |
| 9 | `GET /category-poducts/{cat_slug}` *(sic "poducts")* | none | `HomeController@GetCatProducts` (`HomeController.php:133-151`) | R: `product_category WHERE cat_slug` first (no null guard), `products` join `product_images` where `p_cat={cat_id} AND p_status=1`, `orderBy id DESC`, `groupBy('product_images.p_id')`, `paginate(60)` | `main-category-products.blade.php` — **alt-theme/zeintext family** (asset-manifest §4) | zeintext CDN assets, several 404 in production (asset-manifest §4.3) | Public |
| 10 | `GET /poducts-list/{cat_slug}` *(sic)* | none | `HomeController@GetAllProducts` (`HomeController.php:153-169`) | R: `product_category WHERE cat_slug` first (no null guard — **confirmed 500 via production test in asset-manifest OI-19**, `GET /poducts-list/1` → HTTP 500 Whoops), `products` join `product_images` where `p_ocat={cat_id} AND p_status=1`, `groupBy`, `paginate(60)` | `all-products.blade.php` — alt-theme family | Same as #9 | Public. **Confirmed 500 for non-matching slugs** (production-verified per asset-manifest §11 OI-19) |
| 11 | `GET /top-poducts` *(sic)* | none | `HomeController@TopProducts` (`HomeController.php:240-251`) | R: `products` join `product_images` where `p_top=1 AND p_status=1`, `groupBy`, `paginate(60)` | `top-products.blade.php` — alt-theme family, scrambled `og:title` defect (asset-manifest §4.4, D-M2-09) | Same as #9 | Public |
| 12 | `GET /about` | none | `HomeController@AboutUs` (`HomeController.php:254-257`) | none | `about.blade.php` — public baseline, **M1-ported**; **content differs from stale backup** — richer SEO meta, JSON-LD, canonical tag, og:tags (see §6.1 below) | — | Public |
| 13 | `GET /mother-tincture` | none | `HomeController@Mothertincture` (`HomeController.php:896-899`) | none | `mother-tincture.blade.php` — public baseline, M1-ported | — | Public |
| 14 | `GET /contact` | none | `HomeController@ContactUs` (`HomeController.php:272-275`) | none | `contact.blade.php` — public baseline, M1-ported | — | Public |
| 15 | `POST /save-enquiry` | none | `HomeController@saveEnq` (`HomeController.php:316-342`) | Validates `name`,`email`,`subject` required (`:323-327`). W: INSERT `enquiries` (`name`,`email`,`subject`,`message` — **`phone` never read from request, P-01 preserved**) | redirect back + flash `'Thank you. We will contact soon.'` | **Email:** `Mail::send('enquiry-email', ...)` to `gauravsvm07@gmail.com` from `zeintext@gmail.com`, subject `Enquiry details` (`:334-338`, verified byte-identical to blueprint R-3/P-02) | Public, POST-action, Email-related |
| 16 | `GET /login` | none | `HomeController@Login` (`HomeController.php:277-280`) | none | `login.blade.php` — public baseline; `<title>Spakshomeopathy - Register</title>` **preserved defect P-05** | — | Public |
| 17 | `GET /seller-register` | none | `HomeController@SellerRegister` (`HomeController.php:293-296`) | none | `seller-register.blade.php` — **content differs from stale backup**: de-"zeintext"-ified, real Spaks content now (pre-documented drift, confirmed 26-line diff this session, still alt-theme asset family per asset-manifest §3 row 34) | zeintext CDN assets (alt-theme family) | Public, LIVE-orphan (no nav link) |
| 18 | `GET /register` | none | `HomeController@Register` (`HomeController.php:287-291`) | R: `statezones` (all, unordered) | `register.blade.php` — public baseline, M1-verified pattern | — | Public |
| 19 | `POST /user-login` | none | `Auth\LoginController@UserLogin` (`Auth/LoginController.php:18-79`) | R: `Auth::attempt(['email','password','status'=>1])`; on success, re-query `users WHERE email` for `utype`. No writes. | role-based redirect (§5.2 logic below) or back + flash `'Wrong Login Details'` | — | Public, POST-action |
| 20 | `POST /save-user` | none | `Auth\RegisterController@UserRegister` (`Auth/RegisterController.php:37-159`) | See §1.4 (Registration) below | redirect `/login` + `'you registraterd successfully please login here.'` (typo preserved, P-06) or back + flash | Uploads (seller path only, see §1.4) | Public, POST-action, Upload-related (seller branch only) |
| 21 | `GET /user-update-status` | none | `HomeController@UpdateUserStatus` (`HomeController.php:646-653`) | `$token=decrypt($req->token)` → email; W: UPDATE `users SET status=1 WHERE email` | `login.blade.php` + flash `'your Account verified please login here.'` | — | Public, LIVE-orphan (no live link generates a `?token=` for this route — the account-verification email that would link here is commented out, `Auth/RegisterController.php:130-148`, confirmed) |
| 22 | `GET /logout` | none | `Auth\LoginController@getSignOut` (`Auth/LoginController.php:82-85`) | `Auth::logout()` | redirect `/home` | — | Public, POST-action-like (GET, destructive per contract NN-3 IR-3 — preserved as GET) |
| 23 | `GET /details` | none | `HomeController@Detail` (`HomeController.php:901-904`) | none | `details.blade.php` — public baseline, M1-ported | — | Public |
| 24 | `POST /store-cart` | none | `CartController@StoreCart` (`CartController.php:76-291`) | Session cart write only (`darryldecode/cart`), no DB write. Also R: `orders ORDER BY id DESC` first (`:283-284`) to pre-generate `getOrderId` into session (race-prone read, no transaction — confirms R-6/§11.3 of DATABASE-ANALYSIS) | redirect `route('cartList')` | — | Public, POST-action |
| 25 | `GET /product-store-cart` | none | `CartController@StoreCart` (same method — **this is the actually-used add-to-cart path per blueprint**, GET) | Same as #24 | Same as #24 | — | Public, POST-action-like (GET) |
| 26 | `POST /shopping-cart` and `GET /shopping-cart` (both registered, `web.php:44-45`) | none | `CartController@ShopCart` (`CartController.php:65-68`) | none | `shopping-cart.blade.php` (public baseline + 1 inline AJAX script, §3 row 35) | — | **Broken** — B-16, confirmed: method body is exactly `return view('shopping-cart');` with zero view data, while `shopping-cart.blade.php` expects `$items`/`$SubTotal`/`$i`/`$DeliveryPrice` (supplied only by `cartList`, route #35) |
| 27 | `GET /remove-cart/{id}` | none | `CartController@RemoveCart` (`CartController.php:293-317`) | Session cart remove | redirect `route('cartList')` | — | Public, POST-action-like (GET) |
| 28 | `GET /cart/update` | none | `CartController@update` (`CartController.php:328-336`) | Session cart update (`$request->rowid`, `$request->newqty`) | redirect back | — | Public, POST-action-like (GET) |
| 29 | `GET /cart-remove-iteam/{id}` *(sic "iteam", named route)* | none | `CartController@RemoveCart` (same method as #27) | Same as #27 | Same as #27 | — | Public, POST-action-like (GET) |
| 30 | `POST /update-cart` and `GET /update-cart` (both registered, `web.php:50-51`) | none | `CartController@UpdateCart` (`CartController.php:337-350`) | Session cart update | `shopping-cart.blade.php` (rendered directly, not a redirect) | — | Public, POST-action |
| 31 | `GET /terms` | none | `HomeController@TermsConditions` (`HomeController.php:878-881`) | none | `terms.blade.php` — public baseline, M1-ported | — | Public |
| 32 | `GET /privacy-policy` | none | `HomeController@PrivacyPolicy` (`HomeController.php:890-893`) | none | `privacy-policy.blade.php` — public baseline, M1-ported | — | Public |
| 33 | `GET /video` | none | `HomeController@VIDEO` (`HomeController.php:260-263`) | none | `video.blade.php` — public baseline, M1-ported; **content differs from stale backup**: 6 YouTube iframes vs stale's 3 (pre-documented drift, confirmed this session: `grep -c "<iframe"` → 6 in `public_html`, 3 in stale) | 6× YouTube embeds | Public |
| 34 | `GET /return-policy` | none | `HomeController@Returnpolicy` (`HomeController.php:883-886` — method name lowercase `returnpolicy`, route calls `HomeController@Returnpolicy`; PHP method names are case-insensitive so this resolves fine, not a bug) | none | `return-policy.blade.php` — public baseline, M1-ported | — | Public |
| 35 | `GET /cart-list` (named `cartList`) | none | `CartController@cartList` (`CartController.php:353-389`) | Session cart read; if buyer, R: `buyer_profile WHERE uid`; delivery price **hardcoded `0`** (shipping-table lookup commented out, `:380-382` — confirms P-09 verbatim, byte-identical comment text to blueprint's citation) | `shopping-cart.blade.php` — **this is the actual live cart page** | — | Public (Buyer-aware branch inline, not middleware-gated) |
| 36 | `POST /update-cart-ajax` (named `updateCartByAjax`) | none | `CartController@UpdateCartByAjax` (`CartController.php:391-402`) | Session cart update | JSON (raw `Cart::getContent()` collection) | — | Public, **AJAX-or-API-like** |
| 37 | `POST /payment/method` (named `payment-method-identify`) | **none** (outside `checkBuyer` group — verified: this route sits at `web.php:67`, outside the `Route::group(['middleware'=>'checkBuyer'], ...)` block at `web.php:104-122`) | `HomeController@redirectToPaymentMethod` (`HomeController.php:735-828`) | R/W: `buyer_profile` (update if exists, else insert — verified `:740-766`); R: `orderproducts ORDER BY id DESC` first → `GroupId+1` (race-prone, no transaction, **read twice** at `:767` and `:786`, confirms DATABASE-ANALYSIS §11.3 finding of a duplicate re-read within the same method); W: INSERT `orders` (`GroupId`,`qr_transection_id`,`OrderStatus='0'`,`OrderId`,`TotalPrice`,`CustId`,`PayMode='offline_payment'`,`OrderNotes`,`OrderDate`); loop over cart items: R `products WHERE id` for `uid` (seller), W INSERT `orderproducts` (`DeliveryCharge` from `$request->DeliveryCharge`, **the checkout form never sends this field → always NULL**, confirms P-09's DeliveryCharge finding extends here too), W INSERT `payments` (`AdminFee=round(total*5/100)`, `SellerPay=total-AdminFee` — confirms P-17 verbatim); `Cart::clear()`; session `TotalCartItem` reset | redirect `manage-orders` + flash success | — | **Payment-related** (manual QR/offline), POST-action. **Confirms B-15**: `Auth::User()->id` used unguarded at `:738-739` with no auth check and no middleware on this route → guest POST produces a 500 (null-property access on a non-object) |
| 38 | `GET /payment-success` | none | `HomeController@paymentSuccess` (`HomeController.php:844-858`) | R: session `getOrderId`; W: UPDATE `orders SET OrderStatus=1 WHERE OrderId`; R: session `GetGroupId`; W: UPDATE `payments SET payStatus=1 WHERE gid`; `Cart::clear()` | redirect `manage-orders` + flash | — | Dead (unreferenced — no gateway callback exists to hit this; blueprint-confirmed DEAD) |
| 39 | `GET /payment-failed` | none | `HomeController@paymentFailed` (`HomeController.php:860-875`) | Same session-key pattern; W: UPDATE `orders SET OrderStatus=0`; UPDATE `orderproducts SET OrderStatus=5 WHERE GroupId` | redirect `manage-orders` + flash `'Your order has been cancelled.'` | — | Dead (unreferenced, same as #38) |
| 40 | `GET /product-details/{slug}` | none | `HomeController@ProductDetail` (`HomeController.php:300-313`) | R: `products WHERE p_slug={slug}` first (**no null guard on a non-matching slug** — confirms B-06-class defect, blueprint R-8); R: `categories` ordered | `product-detail.blade.php` — most complex page (asset-manifest §6.3: Fancybox 2nd script, Isotope/Swiper/noUiSlider/TouchSpin inserted mid-list, `wow.min.js` *absent* unlike baseline) | Fancybox CDN (jsdelivr) | Public. **Fatals on most non-matching slugs** per blueprint R-8 (this document did not re-run the live 500 test for this specific route this session; classification inherited from blueprint/DATABASE-ANALYSIS, itself independently confirmed for the sibling `/poducts-list/{cat_slug}` pattern, §OI-19) |
| 41 | `POST /save-review` | none | `HomeController@SaveReview` (`HomeController.php:345-357`) | **No validation** (verified — no `$req->validate(...)` call in this method). W: INSERT `product_review` (`p_id`,`r_name`,`r_email`,`r_rating`,`r_review`,`r_status=0`) | redirect back + flash `'Thank you for review. We will verify review then review will show on website.'` | — | Public, POST-action |
| 42 | `GET /blog-detail/{blog_slug}` | none | `HomeController@BlogDetails` (`HomeController.php:266-270`) | R: `blogs WHERE blog_slug` first (no null guard) | `blog-detail.blade.php` — unique third template family "Green Gifts \| Blog" (asset-manifest §6.1, not yet fully catalogued — OI-20 open) | — | Public, LIVE-orphan (no index page links here, per blueprint) |
| 43 | `POST /product-order` | none | `HomeController@ProductOrder` (`HomeController.php:359-388`) | R: `products WHERE id={pid}` for stock check (`p_quantity < quantity` → `'Out of Stock'`, the **only** stock-check code path in the app, per blueprint §7.7); R: `orders ORDER BY id DESC` first, `orderId='1200'+lastId` (PHP numeric string+int addition, confirms P-16); W: INSERT `orders` with columns `uid`,`pid`,`orderId`,`orderStatus`,`oredrDate` (**sic**, matches blueprint's already-flagged column-name mismatch — these do not match the live `orders` table's actual PascalCase columns `CustId`/`ProductId`/`OrderId`/`OrderStatus`/`OrderDate`, confirmed absent from the 18-column live schema per DATABASE-ANALYSIS §1.19) | `redirect('detail/'.$slug)` on out-of-stock, else `redirect('success-order')` | — | **Broken** (SQL error on every real insert attempt — the target table's actual columns don't match what this method writes; consistent with the B-09/B-12 defect class, though not itself in Register 9.2 by name — the underlying route is itself unrouted from any live UI per blueprint) |
| 44 | `GET /categories/{cat}` | none | `HomeController@SubCategory` (`HomeController.php:188-195`) | R: `product_category WHERE cat_slug={cat}` first (no null guard); R: `product_category WHERE parent_id={id}` | `categories.blade.php` — alt-theme family | zeintext CDN assets | Public |
| 45 | `POST /search-products` | none | `HomeController@SearchProduct` (`HomeController.php:198-237`) | **Diseases branch:** R `categories WHERE type=N AND status=1 AND name LIKE %term%` ordered. **Herbs branch (the `else`):** `echo $p_name=$req->p_name;` (**stray echo before render, confirms B-14 verbatim** — verified `:211`), then R `products WHERE p_status=1 AND p_cat='24' AND p_name LIKE %term%` (**hardcoded `p_cat='24'`, confirms B-14's hardcode claim verbatim**, `:214`) | `diseases-list.blade.php` (Diseases branch) or `products.blade.php` (Herbs branch, with a stray `echo` polluting the response before the view renders) | — | Public, POST-action. **Broken** (Herbs branch only — B-14) |
| 46 | `GET /buy-product/{pslug}` | none (auth checked **inline**, not via middleware) | `HomeController@BuyProduct` (`HomeController.php:439-485` — note `Public function BuyProduct` at `:439`, capitalized `Public` keyword; PHP is case-insensitive on keywords so this is syntactically valid, not a bug, but flagged as a literal source oddity) | Inline `\Auth::check()`/`$user->utype==3` gate. R: `users` join `buyer_profile`; R: `products WHERE p_slug`; R: `products` join `product_images` `WHERE products.id={pid}` `groupBy('product_images.p_id')`; R: `buyer_profile WHERE uid` | `checkout-buy-product.blade.php` — alt-theme family, if buyer; else `redirect('login')` + flash | — | Public, LIVE-orphan. Guest → `'Please login first'`; non-buyer authenticated user → `'Please login as a Buyer'` (both verified inline in source) |
| 47 | `POST /success-order` | none | `HomeController@SuccessOrder` (`HomeController.php:488-564`) | Extensive — writes `buyer_profile` (update), `baskets` (insert), `orders` (insert, using **non-existent columns** `cust_id`/`seller_id`/`bid`/`amount`/`order_notes` — confirmed absent from the live 18-column `orders` schema per DATABASE-ANALYSIS §1.19.1), `payments` (insert), `sellerpayment` (insert); reads back via a join on `orders.cust_id` (also non-existent, confirmed DATABASE-ANALYSIS §11.1 join #9) | `order-placed.blade.php` (alt-theme family) with `$row` from the broken join above | — | **Dead/Broken** — LIVE-orphan route with column-mismatch defects that would SQL-error on any real submission (same class as B-09; not independently numbered in Register 9.2, consistent with blueprint's own DEAD/LIVE-orphan characterization of this method) |
| 48 | `GET /order-placed` (direct hit) | none | `HomeController@OrderPlaced` (`HomeController.php:433-436`) | none | `order-placed.blade.php` (alt-theme family) — **production renders a Laravel Whoops error page instead**, per asset-manifest §4.5 (`APP_DEBUG=true` in production) | — | **Broken** — B-17, confirmed: method body is exactly `return view('order-placed');` with zero view data while the view expects `$row` |
| 49 | `GET /reset-password` | none | `HomeController@ResetPassword` (`HomeController.php:567-570`) | none | `forgot-password.blade.php` — public baseline | — | Public |
| 50 | `POST /user-reset-password` | none | `HomeController@UserResetPassword` (`HomeController.php:572-612`) | Validates `email` required+email. R: `users WHERE email` count, then first if count==1; W: none (no token stored, `password_resets` table untouched, confirms P-33/vestigial finding) | back + flash `SuccMsg`/`ErrMsg` | **Email:** `Mail::send('mails.reset', ...)` with `token=encrypt($email)` embedded in link `http://spakshomeopathy.com/update-password?token=...`, from `env('MAIL_SENDER')`, subject `Password Reset` | Public, POST-action, Email-related |
| 51 | `GET /update-password` | none | `HomeController@UpdatePassword` (`HomeController.php:616-620`) | none (token passed straight to view) | `update-password.blade.php` — alt-theme family | — | Public |
| 52 | `POST /user-update-password` | none | `HomeController@UserUpdatePassword` (`HomeController.php:622-643`) | Validates `new_password` required+min:6, `confirm_password` required. `decrypt($req->token)`→email (Laravel `APP_KEY` round-trip, must stay byte-compatible per contract §10.4/NN-9); W: UPDATE `users SET password=bcrypt(new)` WHERE email | back + flash `AuthMsg` (mismatch) or `'password updated successfully.'` | — | Public, POST-action |
| 53 | `GET /post-details/{slug}` | none | `HomeController@PostDetails` (`HomeController.php:63-75`) | R: `categories` ordered; R: `tbl_homeopathy WHERE slug={slug}` first (**no null guard** — `$getHomoId->id` on `:69` dereferences null if slug doesn't match, confirms B-11/R-18); R: `tbl_post WHERE post_homeopathy={id}` count + first | `post-details.blade.php` — public baseline | — | **Broken** — B-11, controller/view data mismatch + no null guard |
| 54 | `GET /consultancy` | none | `HomeController@Consultancy` (`HomeController.php:97-103`) | R: `categories` ordered | `consultancy.blade.php` — public baseline, uses baseline's own `bootstrap-datepicker.min.js` (asset-manifest §3 row 10, no extra library) | bootstrap-datepicker | Public |
| 55 | `POST /save-appointment` | none | `HomeController@SaveAppointment` (`HomeController.php:830-841`) | **No validation** (verified — no `$req->validate(...)` call). W: INSERT `tbl_appointment` (`name`,`age`,`gender`,`phone`,`appointment_date`,`consultant_hour`) | back + flash `'Thank you. We will contact soon.'` | — | Public, POST-action |
| 56 | `GET /testMail` | none | closure (`web.php:125-147`) | none | sends `mails.test` to hardcoded `shiva@yopmail.com` | **Email** (dev artifact) | **Dead** — per contract §3.1, explicitly excluded from porting ("Development artifact that emails anyone who visits it") |
| — | `GET /all-diseases` | none | `HomeController@Alldiseases` (`HomeController.php:906-909`, **verified `web.php:57`**) | none | `all-diseases.blade.php` — **NEW view, not previously catalogued in blueprint/M1/M2** (see §6.1 below); note its own `<link rel="canonical">` reads `all-diseasesr` — a typo, preserved per contract F-17, not corrected | — | Public. **New route, confirmed present only in the verified `public_html/` export** (OI-6 finding) |

### 1.2 Cart summary (cross-reference, not a separate route set)

All cart routes (#24–30, #35–36) operate on `darryldecode/cart`'s **session-global cart**
(not namespaced per user, survives login — confirms P-11). Delivery is hardcoded `0`
wherever computed inline (`cartList`, confirms P-09) and read as `NULL` wherever taken
from an unsent form field (`redirectToPaymentMethod`'s `DeliveryCharge`). `TotalCartItem`
session key is a **distinct-line count**, not total quantity (confirms P-08, verified at
`CartController.php:279-282`, `HomeController.php:824-826`, `:729-730` — all three
identical `$cartCollection->count()` pattern).

### 1.3 `CartController::__construct` shared-view-data (applies to every `CartController`-routed page)

Verified `CartController.php:15-63`. Runs on **every** request routed through
`CartController` (routes #24–30, #35–36 above): reads `product_category` for 14
hardcoded `parent_id` values (`Electronic`, `Cloths`, `Kids`, `Footwear`, `Stationary`,
`Beauty`, `Health`, `Kitchen`, `Gaming`, `Fashion`, `Jewelry`, `Worship`, `Decorative`,
`Yoga` — all named per blueprint/contract §5.3's already-documented R-21 finding) and
`View::share()`s all 14 results plus `categories` (nested array) and `CartTotal`. Per
contract §5.3, omitting these 14 queries in the Next.js port is **conditionally
pre-approved**, contingent on documented verification that no Blade view actually
references any of the 14 shared variables — that verification is **not performed by this
document** (it is a rendering-behavior check, out of scope for a route-mapping document,
and remains M3/M5's own responsibility to discharge and record per contract §5.3's
explicit condition).

### 1.4 Registration detail (`Auth\RegisterController@UserRegister`, route #20)

Verified `Auth/RegisterController.php:37-159`. Validates `utype`,`name`(max255),
`email`(email,max255,unique:users),`mobile`,`password` all required (`:47-53` — **no
password min-length or confirmation enforced despite the unused `validator()` method at
`:26-34` declaring `min:8|confirmed`; that method is never called from `UserRegister`,
confirmed by absence of any `$this->validator(...)` call in the method body**).

- **Buyer (`utype==3`):** W INSERT `users` (`status=1`, immediately active — no
  verification email is sent, confirmed commented out `:130-148`); W INSERT
  `buyer_profile` (`uid` only). Redirect `/login` + typo-preserved message.
- **Seller (`utype==2||4`):** Validates 5 files (`AdharCard`,`PanCard`,`image`,
  `Signature`,`BankStatement`, each `mimes:jpeg,jpg,png,gif,pdf|max:2048` — **the only
  validated uploads in the entire application**, confirmed). Uploads 5 files to
  `uploaded_files/profile/` and `uploaded_files/doc/` (naming: `time().'.'.originalName`
  — note the **different naming pattern** from every admin upload handler, which uses
  `time().'g'.originalName`; confirmed distinct at `:79,84,89,94,99,107`). W INSERT
  `users` (`status=0`), `seller_profile`, `banks`. Redirect back + flash (account
  "activates within 24 hours" — but sellers can never actually log in, per §5.2 below).
  **Upload-related.**

---

## 2. Buyer-authenticated routes (`middleware: checkBuyer`, `routes/web.php:104-122`)

Verified group boundaries: opens `web.php:104`, closes `web.php:122`. `CheckBuyer`
middleware (`app/Http/Middleware/CheckBuyer.php`, byte-identical to stale backup, 0
diff) rejects if `Auth::user()==''` **or** `utype` ∈ {1,2,4}; forcibly `Auth::logout()`s
on a role mismatch (confirms P-12); stores `backUrl` in session (never read elsewhere,
confirmed — matches blueprint's "never read" finding); redirects `/login` + flash
`AuthMsg: 'Please login here'`.

| # | Route | Controller@method (file:line) | DB ops (verified) | View | External services | Classification |
|---|---|---|---|---|---|---|
| 57 | `GET /buyer-panel` | `BuyerController@SellerPanel` — **does not exist**. Verified: `BuyerController.php` (full file read) contains no method named `SellerPanel`; the closest is `BuyerPanel()` at `:22-25` (different name, case and spelling both differ) | n/a | n/a | — | **Broken** — B-02, confirmed: calling an undefined method → 500 |
| 58 | `GET /manage-orders` (named) | `BuyerController@ManageOrders` (`BuyerController.php:71-82`) | R: `orderproducts` join `products` join `orders` (on `orders.GroupId = orderproducts.GroupId` — the ★ true order-linkage key, confirmed) `WHERE orderproducts.BuyerId={uid}` `paginate(20)` | `manage-orders.blade.php` — public baseline | — | Buyer-authenticated |
| 59 | `GET /view-order/{orderId}` | `BuyerController@ViewOrder` (`BuyerController.php:85-91`) | R: `orders` join `products` **on `orders.pid`** — confirmed absent from the live 18-column `orders` schema (DATABASE-ANALYSIS §1.19.1, §11.1 join #36) | `view-orders.blade.php` | — | **Broken** — B-12, confirmed byte-for-byte: `->join('products','products.id','orders.pid')` at `:88` |
| 60 | `GET /profile` | `BuyerController@BuyerProfile` (`BuyerController.php:36-47`) | R: `statezones` (all); R: `users` join `buyer_profile` `WHERE users.id={uid}` first | `profile.blade.php` — public baseline | — | Buyer-authenticated |
| 61 | `POST /update-profile` | `BuyerController@UpdateProfile` (`BuyerController.php:49-68`) | **No validation.** W: UPDATE `users` (`name`,`mobile`); UPDATE `buyer_profile` (`PinCode`,`FullAddress`,`HouseNo`,`Landmark`) | back + flash `'Profile Updated successfully!!'` | — | Buyer-authenticated, POST-action |
| 62 | `GET /change-password` (declared twice, `web.php:112` and `:114`, both identical — a harmless duplicate registration) | `BuyerController@ChangePassword` (`BuyerController.php:110-114`) | none | `change-password.blade.php` — public baseline | — | Buyer-authenticated |
| 63 | `GET /myaccount` | `BuyerController@Myaccount` (`BuyerController.php:104-107`) | none | `myaccount.blade.php` — public baseline | — | Buyer-authenticated |
| 64 | `POST /update-password` | `BuyerController@UpdatePassword` (`BuyerController.php:117-149`) | Validates `oldpassword`,`newpassword`,`password_confirmation` (max:150) all required. `Hash::check` against current; W UPDATE `users.password` via `bcrypt` iff old matches and new≠old | back + one of 4 distinct flash messages (verified: `'password updated successfully'`, `'new password can not be the old password!'`, `'old password doesnt matched'`, `'new password and confirm password does not matched'`) | — | Buyer-authenticated, POST-action |
| 65 | `POST /product-checkout` | `HomeController@Checkout` (`HomeController.php:391-405`) | R: `statezones` (all); R: `users` join `buyer_profile WHERE users.id={id}` first; reads session cart via `Cart::getContent()`/`getSubTotal()` | **`cart-checkout.blade.php`** (confirmed — **not** `checkout.blade.php`, which is DEAD per asset-manifest §7; verified `HomeController.php:404` returns `view('cart-checkout', ...)`) | — | Buyer-authenticated, POST-action. This **is** the live checkout page despite its route name |
| 66 | `POST /post-checkout` | `HomeController@postCheckout` (`HomeController.php:407-429`) | No DB ops (builds an in-memory `$products` array from request arrays) | `cart-checkout.blade.php` | — | **Dead** — reachable via middleware but no form in any live view posts to this route (confirmed no `action="{{url('post-checkout')}}"` or `route('post-checkout')` reference found in `resources/views/` during this session's controller-focused read; consistent with blueprint's DEAD classification) |
| 67 | `POST /save-order` | `HomeController@saveOrder` (`HomeController.php:657-732`) | Extensive: updates/inserts `buyer_profile`; R `orderproducts ORDER BY id DESC` first → `GroupId+1` (race-prone, no transaction); loop: R `products WHERE id` for seller `uid`, W INSERT `orderproducts`, W INSERT `payments` (5% fee arithmetic, confirms P-17); W INSERT `orders` (`insertGetId`); `Cart::clear()` | returns `$orderId` (plain integer, not JSON-wrapped) | — | **Dead** — the online-pay branch; blueprint confirms `#checkout-form` (this route's AJAX trigger) is commented out in `cart-checkout.blade.php`, so the jQuery selector matches nothing and the form never actually serializes/submits (verified: this document did not re-read `cart-checkout.blade.php`'s JS in full this session, but the route's DEAD classification is independently corroborated by route #66's identical "no live form posts here" pattern and blueprint's prior explicit finding) |
| 68 | `GET /cancel-order` | `BuyerController@CancelOrder` (`BuyerController.php:93-101`) | `$GroupId=decrypt($req->cncl_id)` (Laravel `APP_KEY` round-trip); W: UPDATE `orderproducts SET OrderStatus=4 WHERE GroupId`; UPDATE `orders SET OrderStatus=4 WHERE GroupId` (**buyer cancel writes `4` consistently across all three tables** — verified, contrast with admin cancel below); UPDATE `payments SET orderStatus=4 WHERE gid` | back + flash `'Order cancelled successfully!!'` | — | Buyer-authenticated, POST-action-like (GET, destructive, preserved per NN-3) |
| 69 | `POST /update-shipping-type` | `BuyerController@UpdateShippingType` (`BuyerController.php:151-159`) | W: session `DeliveryAmount` put; UPDATE `buyer_profile SET DeliveryType WHERE uid` | back | — | Buyer-authenticated, POST-action, LIVE-orphan (no UI element found wiring to this in the controller-focused read this session; blueprint already classifies it LIVE-orphan) |

---

## 3. Admin routes (`routes/admin.php`, prefix `admin`, verified `public_html/routes/admin.php:1-141`)

### 3.1 Unprotected (outside the `userAuth` group)

| # | Route | Controller@method (file:line) | DB ops | View | Classification |
|---|---|---|---|---|---|
| 70 | `GET /admin/login` | `AdminController@login` (`AdminController.php:41-44`) | none | `admin/login.blade.php` — standalone, no shared partials (asset-manifest §5.1, production-verified) | Admin, Public-reachable |
| 71 | `GET /admin/` | `AdminController@login` (same method, verified `admin.php:4`) | none | `admin/login.blade.php` | Admin, Public-reachable |
| 72 | `POST /admin/user-login` | `Auth\LoginController@UserLogin` (same shared method as public route #19) | Same as #19 | — | Admin, POST-action. Cross-form gate: an admin submitting the **public** login form (hidden `backuser=seller_buyer`) authenticates then is **immediately logged out** (verified §5.2 logic below) |

### 3.2 Protected by `userAuth` (verified group `admin.php:6-136`)

`UserAuth` middleware (`app/Http/Middleware/UserAuth.php`, byte-identical to stale
backup) rejects if `Auth::user()==''` **or** `utype` ∈ {2,3,4}; forcibly logs out on
mismatch (confirms P-12 for the admin side too); redirects `/admin/login` + flash
`AuthMsg`.

| # | Route | Controller@method (file:line) | DB ops (verified) | View | Classification |
|---|---|---|---|---|---|
| 73 | `GET /admin/home` | `AdminController@index` (`AdminController.php:15-25`) | R: `enquiries` count, `users WHERE utype=2` count, `users WHERE utype=3` count, `products` count, `orderproducts` count, `users WHERE id={admin_id}` first | `admin/index.blade.php` — "full stack" page, Morris.js loaded but never rendered to a chart (asset-manifest §5.2) | Admin-authenticated |
| 74 | `GET /admin/user-logout` | `Auth\LoginController@getSignOut` (shared with public #22) | `Auth::logout()` | redirect `/home` (**not** `/admin/login` — same shared method, same redirect target regardless of which app area logged out) | Admin-authenticated |
| 75 | `GET /admin/user-profile` | `UserController@UserProfile` (`UserController.php:23-28`) | R: `users WHERE utype=1 OR status=1 OR id={admin_id}` first (**this `orWhere` chain can match an arbitrary non-admin active user, not necessarily the logged-in admin** — a real query-logic oddity, preserved verbatim, not fixed) | `admin/profile.blade.php` (note: rendered via string path `'admin/profile'`, not dot notation) | Admin-authenticated |
| 76 | `POST /admin/update-admin-profile` | `UserController@UpdateAdminProfie` *(sic — method name itself misspelled)* (`UserController.php:31-51`) | No validation. Upload iff file present (naming `time().'g'.originalName`, dest `uploaded_files/profile/`); W UPDATE `users` (`name`,`email`,`mobile`,`image`) | back + flash `'Profile updated successfully.'` | Admin-authenticated, POST-action, **Upload-related** |
| 77 | `POST /admin/update-admin-password` | `UserController@UserChangePassword` (`UserController.php:54-83`) | Validates `old_password`,`new_password`,`confirm_password` all required. `Hash::check`; W UPDATE `users.password` iff match | back + `withErrors` or flash `success_message` | Admin-authenticated, POST-action |
| 78 | `GET /admin/manage-sellers` | `AdminController@GetSellers` (`AdminController.php:951-957`) | R: `users WHERE utype=2` ordered `id DESC` | `admin/manage-sellers.blade.php` — **titled "Pin Code List"**, D-M2-02 preserved defect | Admin-authenticated, LIVE-orphan |
| 79 | `GET /admin/view-seller/{id}` | `AdminController@ViewSeller` (`AdminController.php:959-968`) | R: `users` join `seller_profile` join `banks` `WHERE users.id={id}` first | `admin/view-seller.blade.php` — **titled "View Enquiry"**, D-M2-05 preserved defect | Admin-authenticated, LIVE-orphan |
| 80 | `GET /admin/manage-buyers` | `AdminController@GetBuyers` (`AdminController.php:986-990`) | R: `users WHERE utype=3` (unordered, no `orderBy` — a genuine inconsistency vs. #78's ordered query, preserved) | `admin/manage-buyers.blade.php` — **titled "Pin Code List"**, D-M2-02 | Admin-authenticated |
| 81 | `GET /admin/view-buyer/{id}` | `AdminController@ViewBuyer` (`AdminController.php:992-999`) | R: `users` join `buyer_profile WHERE users.id={id}` first | `admin/view-buyer.blade.php` | Admin-authenticated |
| 82 | `GET /admin/update-user-status/{id}` | `AdminController@UpdateUserStatus` (`AdminController.php:970-983`) | R: `users WHERE id` first; W: UPDATE `users SET status` (toggled) | back + flash | Admin-authenticated, POST-action-like (GET) |
| 83 | `GET /admin/profile` | `AdminController@AdminProfile` — **does not exist**. Verified: full-file read of `AdminController.php` (1,518 lines) contains no method named `AdminProfile` | n/a | n/a | **Broken** — B-03, confirmed |
| 84 | `GET /admin/add-product-category` | `AdminController@AddProductCategory` (`AdminController.php:46-49`) | none | `admin/add-product-category.blade.php` | Admin-authenticated, LIVE-orphan |
| 85 | `POST /admin/save-product-category` | `AdminController@SaveProductCategory` (`AdminController.php:54-77`) | `cat_slug` via `convert_to_slug()` (Laravel `str_random(5)` suffix, confirms P-07/§7.8 mechanism); upload iff file, dest `uploaded_files/product-categories/`; W INSERT `product_category` (`parent_id=0`,`cat_level=1`) | back + flash `'Record saved successfully.'` | Admin-authenticated, POST-action, Upload-related |
| 86 | `GET /admin/product-category-list` | `AdminController@ProductCategoryList` (`AdminController.php:79-92`) | R: `product_category` ordered `id desc` (**note: unreachable dead code after the `return` at line 82** — lines 84-91 reference an undefined `$id` and would fatal if ever executed, but they are provably unreachable per PHP's own control flow, confirmed by reading the method in full) | `admin/product-category-list.blade.php` — DataTables variant | Admin-authenticated, LIVE-orphan |
| 87 | `GET /admin/edit-product-category/{id}` | `AdminController@EditProductCat` (`AdminController.php:95-99`) | R: `product_category WHERE id` first | `admin/edit-product-category.blade.php` | Admin-authenticated, LIVE-orphan |
| 88 | `GET /admin/add-product-subcategory` | `AdminController@AddProductSubCategory` (`AdminController.php:101-105`) | R: `product_category WHERE parent_id='0'` | `admin/add-product-subcategory.blade.php` | Admin-authenticated, LIVE-orphan |
| 89 | `GET /admin/product-subcategory-list` | `AdminController@ProductSubCategoryList` (`AdminController.php:155-159`) | R: `product_category WHERE cat_level='2'` ordered `id desc` | `admin/product-subcategory-list.blade.php` | Admin-authenticated, LIVE-orphan |
| 90 | `POST /admin/save-product-subcat` | `AdminController@SaveProductSubCat` (`AdminController.php:161-184`) | `cat_slug` via `convert_to_slug()`; upload iff file; W INSERT `product_category` (`cat_level=2`) | back + flash | Admin-authenticated, POST-action, Upload-related |
| 91 | `GET /admin/add-other-category` | `AdminController@AddOtherCategory` (`AdminController.php:108-114`) | R: `product_category WHERE cat_level='1'`; R: `product_category WHERE cat_level='2'` ordered `id desc` | `admin/add-other-category.blade.php` | Admin-authenticated, LIVE-orphan |
| 92 | `POST /admin/save-other-category` | `AdminController@SaveOtherCategory` (`AdminController.php:117-143`) | `cat_slug` via `convert_to_slug()`; upload iff file; W INSERT `product_category` (`cat_level=3`, `parent_id=$p_subcat`) | back + flash | Admin-authenticated, POST-action, Upload-related |
| 93 | `GET /admin/other-category-list` | `AdminController@OtherCategoryList` (`AdminController.php:147-151`) | R: `product_category WHERE cat_level='3'` ordered `id desc` | `admin/other-category-list.blade.php` — **titled "Category List"**, D-M2-03 | Admin-authenticated, LIVE-orphan |
| 94 | `GET /admin/getsub-category/{id}` | `SellerController@GetSubCat` — **the `SellerController` class does not exist anywhere in the codebase**. Verified: `find . -iname "SellerController.php"` under `public_html/app/` (excluding sibling projects) returns zero results | n/a | n/a | **Broken** — B-05, confirmed |
| 95 | `GET /admin/destroy-product-category/{id}` | `AdminController@DestroyCategory` (`AdminController.php:188-199`) | R: `product_category WHERE id` first; `unlink()` image file iff exists; W: DELETE `product_category WHERE id` | back + flash `'Category deleted successfully.'` | Admin-authenticated, POST-action-like (GET, destructive) |
| 96 | `GET /admin/destroy-product-subcat/{id}` | `AdminController@DestroyPSubCat` — **does not exist**. Verified: no method of this name anywhere in the 1,518-line file | n/a | n/a | **Broken** — B-04, confirmed |
| 97 | `GET /admin/add-post` | `AdminController@AddPost` (`AdminController.php:841-847`) | R: `categories` ordered `name ASC` (note: comment at `:843` shows this *used* to read `tbl_homeopathy`, now reads `categories` instead — commented code, no authority per contract §12.4); R: `products` ordered `p_name ASC` | `admin/add-post.blade.php` — CKEditor loads **first**, before jQuery (asset-manifest §2.4) | Admin-authenticated |
| 98 | `POST /admin/save-post` | `AdminController@SavePost` (`AdminController.php:849-872`) | **No validation.** Upload always attempted (`$prod_image=$req->file('p_pimage')` then immediately `->move(...)` with **no `hasFile()`/`empty()` guard** — will fatal if no file is submitted, a real defect distinct from every other upload handler in this controller, which all guard); R: `categories WHERE slug={post_homeopathy}` first (**create uses slug lookup**, confirms P-04's "create" half); W INSERT `tbl_post` | back + flash `'Post added successfully!!'` | Admin-authenticated, POST-action, Upload-related |
| 99 | `GET /admin/post-list` | `AdminController@PostList` (`AdminController.php:768-775`) | R: `tbl_post` ordered `post_title ASC` `paginate(20)` | `admin/post-list.blade.php` | Admin-authenticated |
| 100 | `GET /admin/edit-post/{post_id}` | `AdminController@EditPost` (`AdminController.php:778-791`) | R: `categories` ordered; R: `products` ordered `p_name ASC`; R: `tbl_post` **`leftJoin`** `tbl_homeopathy` on `post_homeopathy=tbl_homeopathy.id` `WHERE tbl_post.id={post_id}` first — **the only `leftJoin` call site in the entire schema** (confirmed, DATABASE-ANALYSIS §11.1 #37) | `admin/edit-post.blade.php` | Admin-authenticated |
| 101 | `POST /admin/update-post` | `AdminController@UpdatePost` (`AdminController.php:794-825`) | Upload iff new file, else `old_pimage` retained; R: `categories WHERE id={post_homeopathy}` first (**edit uses id lookup — confirms P-04's "edit" half, the create/edit mismatch is real and verbatim**); W UPDATE `tbl_post` | back + flash `'Post updated successfully!!'` | Admin-authenticated, POST-action, Upload-related |
| 102 | `GET /admin/destroy-post/{post_id}` | `AdminController@DestroyPost` (`AdminController.php:827-838`) | Image-unlink code is **commented out** (`:829-834` — dead, no authority); W: DELETE `tbl_post WHERE id` | back + flash `'Post deleted successfully.'` | Admin-authenticated, POST-action-like (GET) |
| 103 | `GET /admin/add-hurbcat` *(sic)* | `AdminController@AddHurbCat` (`AdminController.php:210-213`) | none | `admin/add-category.blade.php` — **titled "Admin Panel \| Add Product"**, D-M2-06; duplicate `<link>` bootstrap CSS tag, D-M2-08 | Admin-authenticated |
| 104 | `GET /admin/add-product` | `AdminController@AddProduct` (`AdminController.php:203-207`) | R: `categories` ordered `name ASC` | `admin/add-product.blade.php` — CKEditor 2nd script, after jQuery (asset-manifest §2.4); duplicate bootstrap `<link>`, D-M2-08 | Admin-authenticated |
| 105 | `GET /admin/product-view/{id}` | `AdminController@ViewProduct` (`AdminController.php:697-718`) | R: `products WHERE id` first; `$p_cat`/`$p_subcat` from result; R: `product_category WHERE id={p_cat}` first, then **`$GetCat->cat_name` dereferenced with no null guard** (`:704` — confirms B-06 verbatim: `p_cat` in this table is a *disease-category* `categories.id`, not a `product_category.id`, per blueprint's overloaded-`p_cat` finding, so this lookup returns null for essentially every real product); R: `product_specification`, `product_images`, `product_features`, `product_variations`, all `WHERE p_id/pid={id}` | `admin/product-view.blade.php` — DataTables variant | **Broken** — B-06, confirmed |
| 106 | `GET /admin/edit-product/{id}` | `AdminController@EditProduct` (`AdminController.php:377-384`) | R: `categories` ordered `name desc` (**note: `desc` here vs `ASC` on `AddProduct` — a real, preserved ordering inconsistency between add and edit forms**); R: `product_images WHERE p_id` first; R: `products WHERE id` first | `admin/edit-product.blade.php` — CKEditor 2nd script | Admin-authenticated |
| 107 | `GET /admin/edit-category/{id}` | `AdminController@EditCategory` (`AdminController.php:385-390`) | R: `categories WHERE id` first | `admin/edit-category.blade.php` | Admin-authenticated |
| 108 | `GET /admin/destroy-product/{id}` | `AdminController@DestroyProduct` (`AdminController.php:675-695`) | R: `product_images WHERE p_id` count, then all; per-image `unlink()`; W DELETE `product_images WHERE p_id` (**inside the foreach loop — deletes all matching rows on every iteration, not just the current image; a real, preserved inefficiency/edge-defect, not fixed**); W DELETE `products WHERE id` | back + flash `'Product deleted successfully.'` | Admin-authenticated, POST-action-like (GET) |
| 109 | `GET /admin/update-product-status/{id}` | `AdminController@UpdateProductStatus` (`AdminController.php:720-733`) | R+W: toggle `products.p_status` | back + flash | Admin-authenticated, POST-action-like (GET) |
| 110 | `GET /admin/update-product-trending/{id}` | `AdminController@UpdateProductTrending` (`AdminController.php:736-749`) | R+W: toggle `products.p_trending` | back + flash | Admin-authenticated, LIVE-orphan, POST-action-like (GET) |
| 111 | `GET /admin/update-product-featured/{id}` | `AdminController@UpdateProductFeatured` (`AdminController.php:752-765`) | R+W: toggle `products.p_featured` | back + flash | Admin-authenticated, LIVE-orphan, POST-action-like (GET) |
| 112 | `POST /admin/save-pimage` | `AdminController@SaveProductImage` (`AdminController.php:436-445`) | Upload always attempted (no `hasFile` guard, same pattern-defect class as #98); W INSERT `product_images` | back + flash | Admin-authenticated, POST-action, Upload-related |
| 113 | `POST /admin/save-pspecification` | `AdminController@SaveProductSpecif` (`AdminController.php:448-457`) | **No validation.** W INSERT `product_specification` | back + flash | Admin-authenticated, POST-action, LIVE-orphan |
| 114 | `POST /admin/update-product` | `AdminController@UpdateProduct` (`AdminController.php:461-636`) | **No validation.** Per-slot upload iff new file else `old_imageN` retained (slots 2-10); slot-1 image update branches into a nested `DB::table('product_images')->where('p_id')->update(...)` call **inside both branches of the `if(empty($prod_image))`** (verified `:617-629` — both branches independently update `product_images`, a real structural duplication, preserved); W UPDATE `products` (all slots + `p_heading`) | back + flash `'Product Updated successfully.'` | Admin-authenticated, POST-action, Upload-related |
| 115 | `POST /admin/update-category` | `AdminController@UpdateCategory` (`AdminController.php:393-416`) | Upload iff new file else `old_image`; W UPDATE `categories` | back + flash | Admin-authenticated, POST-action, Upload-related |
| 116 | `GET /admin/update-category-status-active/{id}` | `AdminController@UpdateCategoryStausActive` *(sic — method name misspelled "Staus")* (`AdminController.php:418-425`) | W: UPDATE `categories SET status='1'` | back + flash | Admin-authenticated, POST-action-like (GET) |
| 117 | `GET /admin/update-category-status-inactive/{id}` | `AdminController@UpdateCategoryStausInactive` *(sic)* (`AdminController.php:427-434`) | W: UPDATE `categories SET status='0'` | back + flash | Admin-authenticated, POST-action-like (GET) |
| 118 | `POST /admin/save-product` | `AdminController@SaveProduct` (`AdminController.php:235-374`) | **No validation** on the 83-field (75-column-mapped) form. `p_slug` via `convert_to_slug()`; per-slot upload iff file (slots 2-10 use `time().'g_N'.name` naming, slot 1 uses `time().'g'.name`); W INSERT `products` (all fields); W INSERT `product_images` (`p_id`,`p_image`=slot-1 filename) | back + flash `'Product saved successfully.'` | Admin-authenticated, POST-action, Upload-related |
| 119 | `POST /admin/save-cat` | `AdminController@Savecategory` (`AdminController.php:215-230`) | `c_slug = $req->name.'-'.rand(10000,99999)` — **the second, unsanitized slug algorithm** (no lowercasing, no character-stripping, confirms §7.8's "two slug algorithms" finding verbatim, distinct from `convert_to_slug()`); upload **always attempted, no `hasFile`/`empty` guard at all** (`:221-223` — will fatal on a submission with no image, a genuine defect distinct from every other category-adjacent handler); W INSERT `categories` | back + flash `'Category saved successfully.'` | Admin-authenticated, POST-action, Upload-related |
| 120 | `GET /admin/cat-list` | `AdminController@CategorytList` *(sic — method name itself misspelled "Categoryt")* (`AdminController.php:642-646`) | R: `categories` ordered `id DESC` `paginate(20)` | `admin/category-list.blade.php` — the one page with a correctly-matching title, "Category List" | Admin-authenticated |
| 121 | `GET /admin/product-list` | `AdminController@ProductList` (`AdminController.php:637-641`) | R: `products` ordered `id DESC` `paginate(20)` | `admin/product-list.blade.php` — DataTables variant | Admin-authenticated |
| 122 | `GET /admin/active-products` | `AdminController@ActiveProducts` (`AdminController.php:647-658`) | R: `products` join `product_images` join `users` **on `products.uid=users.id`** (`products.uid` is always NULL per DATABASE-ANALYSIS §11.1 #13, confirms B-07 — the resulting join matches nothing) `WHERE p_status=1` `groupBy('product_images.p_id')` `paginate(75)` | `admin/product-list.blade.php` (reused) | **Broken** — B-07, confirmed |
| 123 | `GET /admin/inactive-products` | `AdminController@InactiveProducts` (`AdminController.php:660-671`) | Identical pattern to #122, `WHERE p_status=0` | `admin/product-list.blade.php` (reused) | **Broken** — B-08, confirmed |
| 124 | `GET /admin/add-blog-category` | `AdminController@AddBlogCategory` (`AdminController.php:876-880`) | none | `admin/add-blog-category.blade.php` | Admin-authenticated, LIVE-orphan |
| 125 | `POST /admin/save-blog-category` | `AdminController@SaveBlogCategory` (`AdminController.php:883-901`) | `bcat_slug` via `convert_to_slug()`; upload iff file, dest string is **relative `'uploaded_files/blog-categories'`, not `public_path(...)`-wrapped** (`:890` — a real, distinct destination-resolution pattern from every other upload handler in this controller, which all use `public_path()`; depends on CWD, preserved per contract §5.4/blueprint's already-noted CWD-dependence finding); W INSERT `blog_category` | back + flash | Admin-authenticated, POST-action, Upload-related, LIVE-orphan |
| 126 | `GET /admin/destroy-blog-category/{id}` | `AdminController@DestroyBlogCategory` (`AdminController.php:910-920`) | R: `blog_category WHERE id` first; `unlink()` (relative path, same CWD-dependence as #125); W DELETE | back + flash | Admin-authenticated, POST-action-like (GET), LIVE-orphan |
| 127 | `GET /admin/edit-blog-category/{id}` | `AdminController@EditBlogCategory` (`AdminController.php:922-926`) | R: `blog_category WHERE id` first | `admin/edit-blog-category.blade.php` — **titled "Admin Panel \| Add Blog Category"**, D-M2-07 | Admin-authenticated, LIVE-orphan |
| 128 | `POST /admin/update-blog-category` | `AdminController@UpdateBlogCategory` (`AdminController.php:928-948`) | Upload iff file (relative-path dest again); `unlink()` guard itself has an inverted-logic bug — `file_exists(!'uploaded_files/...')` at `:937` (`!` applied to the **string**, not the boolean result, meaning the guard is effectively always evaluating `file_exists('')`-like nonsense — a genuine, preserved logic defect, not fixed); W UPDATE `blog_category` | back + flash | Admin-authenticated, POST-action, Upload-related, LIVE-orphan |
| 129 | `GET /admin/blog-category-list` | `AdminController@BlogCategoryList` (`AdminController.php:903-907`) | R: `blog_category` ordered `id desc` | `admin/blog-category-list.blade.php` — DataTables variant | Admin-authenticated, LIVE-orphan |
| 130 | `GET /admin/add-blog` | `AdminController@AddBlog` (`AdminController.php:1002-1006`) | R: `blog_category` ordered `id desc` | `admin/add-blog.blade.php` — CKEditor 1st script, before jQuery | Admin-authenticated, LIVE-orphan |
| 131 | `POST /admin/save-blog` | `AdminController@SaveBlog` (`AdminController.php:1008-1026`) | `blog_slug` via `convert_to_slug()`; upload **always attempted, no guard** (same defect class as #98/#112/#119); W INSERT `blogs` | back + flash | Admin-authenticated, POST-action, Upload-related, LIVE-orphan |
| 132 | `GET /admin/edit-blog/{id}` | `AdminController@EditBlog` (`AdminController.php:1034-1039`) | R: `blog_category` ordered; R: `blogs WHERE id` first | `admin/edit-blog.blade.php` | Admin-authenticated, LIVE-orphan |
| 133 | `POST /admin/update-blog` | `AdminController@UpdateBlog` (`AdminController.php:1041-1068`) | Upload iff file (`public_path()`-wrapped here, unlike #125/#128 — **inconsistent CWD-handling within the same controller**, preserved); W UPDATE `blogs` | back + flash | Admin-authenticated, POST-action, Upload-related, LIVE-orphan |
| 134 | `GET /admin/destroy-blog/{id}` | `AdminController@DestroyBlog` (`AdminController.php:1072-1084`) | R: `blogs WHERE id` first; `unlink()` (relative path); W DELETE | back + flash | Admin-authenticated, POST-action-like (GET), LIVE-orphan |
| 135 | `GET /admin/blog-list` | `AdminController@BlogList` (`AdminController.php:1028-1032`) | R: `blogs` ordered `id desc` | `admin/blog-list.blade.php` — DataTables variant | Admin-authenticated, LIVE-orphan |
| 136 | `GET /admin/order-list` | `AdminController@ManageOrders` (`AdminController.php:1311-1320`) | R: `orderproducts` join `products` `WHERE` none (**all rows, unfiltered, unpaginated** — confirms blueprint P-15's "~10 admin lists have no pagination" for this specific list) ordered `id DESC` | `admin/order-list.blade.php` — DataTables variant | Admin-authenticated |
| 137 | `GET /admin/seller-orders/{sid}` | `AdminController@SellerOrders` (`AdminController.php:1322-1332`) | R: `orderproducts` join `products` join `users` `WHERE SellerId={sid}` (unpaginated) | `admin/seller-orders.blade.php` — **titled "Order List"**, D-M2-04 | Admin-authenticated, LIVE-orphan |
| 138 | `GET /admin/view-order/{orderId}` | `AdminController@ViewOrder($OrderPid)` (`AdminController.php:1336-1345` — **note the route parameter name `{orderId}` vs. the method's own internal variable name `$OrderPid`, cosmetic mismatch, no behavioral effect**) | R: `orderproducts` join `products` join `users` (on `BuyerId`) join `buyer_profile` `WHERE orderproducts.id={OrderPid}` first | `admin/view-orders.blade.php` | Admin-authenticated |
| 139 | `GET /admin/change-order-status` | `AdminController@ChangeOrderStatus` (`AdminController.php:1381-1386`) | `decrypt($req->order_id)`; W UPDATE `orderproducts SET OrderStatus=3 WHERE GroupId` (**only `orderproducts`, not `orders`, is updated on ship — a real, preserved asymmetry vs. the cancel flows below which touch all three tables**) | back + flash `'Order shipped successfully!!'` | Admin-authenticated, POST-action-like (GET) |
| 140 | `GET /admin/add-pin-code` | `AdminController@AddPinCode` (`AdminController.php:1097-1100`) | none | `admin/add-pin-code.blade.php` | Admin-authenticated, LIVE-orphan |
| 141 | `GET /admin/pin-code-list` | `AdminController@PinCodeList` (`AdminController.php:1102-1106`) | R: `pin_codes` ordered `id desc` (**this read succeeds — the live table has `id`/`uid`/`country`/`pincode`/`location`/`status`/timestamps, all readable; only the write side is broken**, confirmed against DATABASE-ANALYSIS §1.28) | `admin/pin-code-list.blade.php` — DataTables variant | Admin-authenticated, LIVE-orphan |
| 142 | `POST /admin/save-pincode` | `AdminController@SavePinCode` (`AdminController.php:1109-1117`) | W: INSERT `pin_codes` (`pin_code`,`pin_address`,`pin_status`) — **these three columns do not exist in the live table** (live has `pincode`/`location`/`status`, confirmed DATABASE-ANALYSIS §1.28), producing a SQL error on every submission | back + flash `'Record saved successfully.'` (never reached — errors first) | **Broken** — B-09, confirmed |
| 143 | `GET /admin/edit-pincode/{id}` | `AdminController@EditPinCode` (`AdminController.php:1120-1124`) | R: `pin_codes WHERE id` first (read succeeds, same reasoning as #141) | `admin/edit-pincode.blade.php` | Admin-authenticated, LIVE-orphan |
| 144 | `POST /admin/update-pincode` | `AdminController@UpdatePinCode` (`AdminController.php:1126-1134`) | W: UPDATE `pin_codes SET pin_code, pin_address, pin_status` — same non-existent-column defect as #142 | back + flash (never reached) | **Broken** — same class as B-09 |
| 145 | `GET /admin/destroy-pincode/{id}` | `AdminController@DestroyPinCode` (`AdminController.php:1136-1140`) | W: DELETE `pin_codes WHERE id` (delete-by-id succeeds regardless of column mismatch — no column reference needed) | back + flash | Admin-authenticated, POST-action-like (GET), LIVE-orphan |
| 146 | `GET /admin/add-slider` | `AdminController@AddSlider` (`AdminController.php:1143-1146`) | none | `admin/add-slider.blade.php` | Admin-authenticated, LIVE-orphan, Vestigial (writes a table the homepage never reads, confirms P-18) |
| 147 | `POST /admin/save-slider` | `AdminController@SaveSlider` (`AdminController.php:1149-1164`) | Upload always attempted, no guard (same defect class as #98/#112/#119/#131); W INSERT `slider` | back + flash | Admin-authenticated, POST-action, Upload-related, Vestigial |
| 148 | `GET /admin/edit-slider/{id}` | `AdminController@EditSlider` (`AdminController.php:1172-1176`) | R: `slider WHERE id` first | `admin/edit-slider.blade.php` | Admin-authenticated, LIVE-orphan, Vestigial |
| 149 | `POST /admin/update-slider` | `AdminController@UpdateSlider` (`AdminController.php:1178-1204`) | Upload iff file, else `old_image`; `unlink()` (relative path); W UPDATE `slider` | back + flash | Admin-authenticated, POST-action, Upload-related, Vestigial |
| 150 | `GET /admin/destroy-slider/{id}` | `AdminController@DestroySlider` (`AdminController.php:1207-1217`) | R: `slider WHERE id` first; `unlink()` (relative path); W DELETE | back + flash | Admin-authenticated, POST-action-like (GET), Vestigial |
| 151 | `GET /admin/slider-list` | `AdminController@SliderList` (`AdminController.php:1166-1170`) | R: `slider` ordered `id desc` (**0 rows in the live dump per DATABASE-ANALYSIS §1.27 — this list renders empty in production today**) | `admin/slider-list.blade.php` — DataTables variant | Admin-authenticated, LIVE-orphan, Vestigial |
| 152 | `GET /admin/subscriber-list` | `AdminController@SubscriberList` (`AdminController.php:1220-1223`) | none — method body is exactly `return view('admin.subscriber-list');`, **passing zero variables** | `admin/subscriber-list.blade.php` (references an undefined variable, per blueprint) | **Broken** — B-10, confirmed at the controller level (view-side undefined-variable confirmation was not independently re-verified this session by reading the Blade file itself, but the controller's zero-data-passed fact is independently sufficient corroboration) |
| 153 | `GET /admin/users-list` | `AdminController@UsersList` (`AdminController.php:1226-1230`) | R: `users WHERE utype=2` ordered `id desc` (**this is a sellers list despite the route name "users-list"**) | `admin/users-list.blade.php` | Admin-authenticated, LIVE-orphan |
| 154 | `GET /admin/destroy-user/{id}` | `AdminController@DestroyUser` (`AdminController.php:1232-1272`) | R: `users WHERE id` first; branches on `utype`: seller (2) → unlinks 5 files (`Signature`,`AdharCard`,`PanCard`,`GSTFile`,`image`) + DELETE `seller_profile`; buyer (3) → DELETE `buyer_profile`; both branches then DELETE `users` | back + flash `'Record deleted successfully.'` | Admin-authenticated, POST-action-like (GET) |
| 155 | `GET /admin/enquires-list` *(sic)* | `AdminController@getEnquiry` (`AdminController.php:1275-1279`) | R: `enquiries` ordered `id desc` (**all 16,386 rows, unpaginated** — confirms P-15, and per DATABASE-ANALYSIS §8.1 the majority is likely spam given zero anti-spam measures on the public submit endpoint) | `admin/enquires-list.blade.php` — **titled "Product List"**, D-M2-01 | Admin-authenticated |
| 156 | `GET /admin/destroy-enquiry/{id}` | `AdminController@DestroyEnq` (`AdminController.php:1282-1286`) | W: DELETE `enquiries WHERE id` | back + flash `'Enquiry deleted successfully.'` | Admin-authenticated, POST-action-like (GET) |
| 157 | `GET /admin/view-enquiry/{id}` | `AdminController@ViewEnquiry` (`AdminController.php:1288-1292`) | R: `enquiries WHERE id` first | `admin/view-enquiry.blade.php` | Admin-authenticated |
| 158 | `GET /admin/review-list` | `AdminController@ReviewList` (`AdminController.php:1295-1301`) | R: `product_review` join `products` (all rows, unpaginated) | `admin/review-list.blade.php` — DataTables variant | Admin-authenticated. Renders empty in production today — `product_review` has 0 rows (DATABASE-ANALYSIS §1.9) |
| 159 | `GET /admin/update-review/{id}/{status}` | `AdminController@ReviewUpdate` (`AdminController.php:1303-1308`) | W: UPDATE `product_review SET r_status={status} WHERE id` | back + flash | Admin-authenticated, POST-action-like (GET) |
| 160 | `GET /admin/seller-payments/{sid}` | `AdminController@SellerPayment` (`AdminController.php:1392-1403`) | R: `payments` join `products` join `users` `WHERE sid={sid}` ordered `id DESC` | `admin/seller-payments.blade.php` — DataTables variant | Admin-authenticated, LIVE-orphan |
| 161 | `GET /admin/change-payment-status` | `AdminController@ChangePaymentStatus` (`AdminController.php:1405-1411`) | W: UPDATE `payments SET payStatus=2, payDate WHERE id={payId}` | redirect back (**no flash message on this one** — every other similar handler sets one, this is a genuine, preserved omission) | Admin-authenticated, POST-action-like (GET), LIVE-orphan |
| 162 | `GET /admin/manage-payments` | `AdminController@ManagePayment` (`AdminController.php:1413-1422`) | R: `payments` join `products` join `users` ordered `id DESC` (all rows, unpaginated). **Note:** a second, differently-cased method `ManagePayments` also exists (`:1360-1368`, no trailing 's' vs with — `ManagePayments()` at `:1360` is **not routed by any route** — the route `manage-payments` (#162) calls `ManagePayment` (singular) at `:1413`, confirmed by name match against `admin.php:122`; `ManagePayments` (plural, `:1360`) is dead/unrouted code, a new finding not previously catalogued — see §6.2 below) | `admin/manage-payments.blade.php` (dot notation, unlike the dead `ManagePayments`'s use of `'manage-payments'` bare string) | Admin-authenticated, LIVE-orphan |
| 163 | `GET /admin/appointment-list` | `AdminController@ManageAppointment` (`AdminController.php:1371-1377`) | R: `tbl_appointment` ordered `id DESC` (all rows, unpaginated — confirms P-15) | `admin/manage-appointment.blade.php` | Admin-authenticated. Read-only per blueprint (no status-change route exists for appointments) |
| 164 | `GET /admin/change-password` | `AdminController@ChangePassword` (`AdminController.php:1425-1429`) | none | `admin/change-password.blade.php` | Admin-authenticated |
| 165 | `POST /admin/update-password` | `AdminController@UpdatePassword` (`AdminController.php:1432-1464`) | Validates `oldpassword`,`newpassword`,`password_confirmation`(max:150) required — **byte-identical logic to `BuyerController@UpdatePassword`, duplicated rather than shared** (confirmed, matches blueprint's "duplicated in AdminController" note); W UPDATE `users.password` iff match | back + flash (4 distinct messages, same set as buyer) | Admin-authenticated, POST-action |
| 166 | `GET /admin/add-zone` | `AdminController@AddZone` (`AdminController.php:1467-1470`) | none | `admin/add-zone.blade.php` (bare-string view path `'admin/add-zone'`) | Admin-authenticated, LIVE-orphan |
| 167 | `POST /admin/save-zone` | `AdminController@SaveZone` (`AdminController.php:1472-1480`) | `CountryId` **hardcoded `91`** (verified, confirms blueprint's already-noted hardcode); W INSERT `statezones` | back + flash `SuccMsg` | Admin-authenticated, POST-action, LIVE-orphan |
| 168 | `GET /admin/zones-list` | `AdminController@ZonesList` (`AdminController.php:1483-1487`) | R: `statezones` ordered `id DESC` | `admin/zones-list.blade.php` — DataTables variant | Admin-authenticated, LIVE-orphan |
| 169 | `GET /admin/add-city` | `AdminController@AddCity` (`AdminController.php:1489-1493`) | R: `statezones` ordered `id DESC` | `admin/add-city.blade.php` | Admin-authenticated, LIVE-orphan |
| 170 | `POST /admin/save-city` | `AdminController@SaveCity` (`AdminController.php:1495-1504`) | W: INSERT `cities` (`ZoneId`,`CityName`,`PinCode`,`status`) | back + flash `SuccMsg` | Admin-authenticated, POST-action, LIVE-orphan |
| 171 | `GET /admin/city-list` | `AdminController@CityList` (`AdminController.php:1507-1513`) | R: `cities` join `statezones` on `ZoneId=id`, ordered `cities.id DESC` | `admin/city-list.blade.php` — DataTables variant | Admin-authenticated, LIVE-orphan |
| — | `GET /admin/cancel-order` | `AdminController@CancelOrder` (`AdminController.php:1349-1357`) | `decrypt($req->cncl_id)`; W: UPDATE `orderproducts SET OrderStatus=5 WHERE GroupId`; UPDATE `orders SET OrderStatus=5 WHERE GroupId` (**both `5`**); UPDATE `payments SET orderStatus=4 WHERE gid` (**`4`, not `5` — confirms P-03's admin-cancel inconsistency verbatim, byte-for-byte**) | back + flash `'Order cancelled successfully!!'` | Admin-authenticated, POST-action-like (GET). This route is declared at `admin.php:133`, listed last in blueprint's own enumeration as item "171" (blueprint numbers it among the ~102 total; verified present and functioning as described) |

**Total admin routes counted:** 3 unprotected + 99 protected (`userAuth` group, verified by
counting every `Route::` call between `admin.php:6` and `:136`) = **102**, matching
blueprint's stated count exactly.

---

## 4. Non-Laravel URLs (per blueprint §2.2/§3.4, verified present in `public_html/public/`)

| URL | Type | Verified present | Classification |
|---|---|---|---|
| `/Dandruff/` | Raw-PHP SEO microsite | `public_html/public/Dandruff/` exists | LIVE, outside Laravel — port as static assets per contract §2.2 |
| `/hair-dandruff/` | Raw-PHP SEO microsite | `public_html/public/hair-dandruff/` exists | LIVE, outside Laravel |
| `/enlarged-prostate/` | Raw-PHP SEO microsite | `public_html/public/enlarged-prostate/` exists | LIVE, outside Laravel |
| `/record/` | Static HTML mockups | `public_html/public/record/` exists | LIVE, outside Laravel — copy to `public/` |
| `/patientrecord/` | Full CodeIgniter application | `public_html/public/patientrecord/` exists | LIVE, outside Laravel — **subject to Decision D-01** (still PENDING per contract Part 4; not resolved by this document, not this document's job to resolve) |
| `/cc/` | CCAvenue kit, hardcoded live keys | `public_html/public/cc/` exists | **Dead but exposed** — not ported, subject to D-02/D-08 (both still PENDING) |
| `/old/` | Entire previous site + DB dump + Paytm kit | `public_html/public/old/` exists | **Dead but exposed** — not ported, subject to D-02/D-08 |
| `/*.pdf` ×3 (`catalogue-list.pdf`, `Mother-Tincture-Price-list.pdf`, `Potencies-rate-list.pdf`) | Downloadable PDFs, linked from nav (verified — nav links present in `inc/header.blade.php:85,102-103`) | `public_html/public/*.pdf` — all 3 confirmed present | LIVE — copy to `public/`, preserve both `/x.pdf` and `/public/x.pdf` resolution (contract §5.1, R-28) |
| `robots.txt` | `User-agent: * / Disallow:` (allows everything, including `/cc/`, `/old/`, `/patientrecord/`) | Verified byte-identical to blueprint's citation | Preserve verbatim |

---

## 5. Summary table — all routes by classification bucket

| Bucket | Count (routes carrying this label) | Notes |
|---|---|---|
| **Public** | ~50 (§1, minus the 6 Broken/Dead-only entries and the checkBuyer group) | Includes several LIVE-orphan sub-labels |
| **Buyer-authenticated** | 13 (§2, routes #57–69) | 2 of these are also Broken (#57, #59) |
| **Admin-authenticated** | 102 (§3, routes #70–171 + unnumbered `cancel-order`) | Largest bucket; ~30 carry no sidebar link (LIVE-orphan) |
| **POST-action** (explicit `POST` verb or GET-as-destructive, preserved per NN-3) | ~55 across all three groups | |
| **AJAX-or-API-like** | 2 (`update-cart-ajax` #36; the stub `GET /api/user`, §3 route table below) | |
| **Payment-related** | 1 primary (`/payment/method`, #37) + 2 dead gateway stubs (`payment-success`/`payment-failed`, #38–39) + 1 dead legacy (`SuccessOrder`, #47) | No real gateway exists anywhere (blueprint-confirmed, re-confirmed this session: zero Razorpay/PayU/Paytm/Stripe/CCAvenue/Instamojo code in `app/`/`routes/`/`config/`/`resources/` of `public_html/`) |
| **Upload-related** | ~20 admin handlers + 1 public (seller-register) + 1 admin-profile | See §1.4, §3.2 rows individually flagged |
| **Email-related** | 4 live-reachable (`save-enquiry` #15, `user-reset-password` #50, `/testMail` #56 dead-but-emails, `mails.verify` commented-out/never-sent) | Blueprint's "5 templates, 2 live 3 dead" figure independently re-confirmed |
| **Broken** | 17, matching Register 9.2 exactly: B-01 (#6), B-02 (#57), B-03 (#83), B-04 (#96), B-05 (#94), B-06 (#105), B-07 (#122), B-08 (#123), B-09 (#142/#144), B-10 (#152), B-11 (#53), B-12 (#59), B-13 (disease-details add-to-cart, not independently re-verified this session — inherited from blueprint), B-14 (#45), B-15 (#37), B-16 (#26), B-17 (#48) | All 17 independently re-confirmed against `public_html/` source this session except B-13 (form #11 in blueprint §8.1's forms table — the disease-details "add to cart" flow uses the shared `StoreCart` method, #24/#25 above; not separately re-traced line-by-line this session, INFERRED consistent with prior verification) |
| **Dead** (unrouted or reachable-but-provably-unreferenced) | `/testMail` #56, `payment-success`/`payment-failed` #38-39, `post-checkout` #66, `save-order` #67, `SuccessOrder` #47 (LIVE-orphan/DEAD boundary — reachable but writes to non-existent columns), plus `SellerController` (doesn't exist), `AdminController-old-4-1-2023.php`, root `LoginController.php`/`RegisterController.php`, `product-detail.blade.php`/`product-view.blade.php` misplaced in `Controllers/`, `BlogCategory.php`, `Mail/ResetPassMail.php`, the dead `ManagePayments()` (plural, unrouted — new finding, §6.2) | |
| **Vestigial** | Slider CRUD (#146-151), pincode read-paths that still work (#141, #143) while write-paths are Broken | Cross-reference DATABASE-ANALYSIS §10 for the full table-level vestigial catalogue (out of scope for a route-mapping document to re-derive) |
| **Route total, this document** | **56 public/buyer web.php entries** (including the 2 duplicate registrations of `/diseases-details/{slug}` and `/change-password`, and the 1 new `/all-diseases`) **+ 13 buyer-protected + 102 admin (3 unprotected + 99 protected) + 1 API stub** = **172 distinct route registrations** across `web.php`+`admin.php`+`api.php` | `seller.php`'s 2 routes are never loaded (confirmed, `RouteServiceProvider::map()` calls only `mapApiRoutes`/`mapWebRoutes`/`mapAdminRoutes`, verified `app/Providers/RouteServiceProvider.php:38-43`) — excluded from the live count, catalogued separately below |

### 5.1 `routes/api.php` (verified `public_html/routes/api.php:1-19`)

One route: `GET /api/user` behind `auth:api`. No API token infrastructure exists (`users`
has no `api_token` column, confirmed absent from the 12-column schema per
DATABASE-ANALYSIS §1.1). **Dead** (stub, matches blueprint exactly).

### 5.2 `routes/seller.php` (verified `public_html/routes/seller.php:1-8`, never loaded)

```
Route::get('myaccount','SellerController@MyAccount');
Route::get('main-category-products/{cat_slug}','HomeController@GetMcatProducts');
```

**Dead** — confirmed never loaded by `RouteServiceProvider::map()` (verified, method body
at `app/Providers/RouteServiceProvider.php:38-43` calls only three `map*Routes()`
methods, none of which reference `seller.php`). Both routes are unreachable. Note the
second entry duplicates public route #8's controller method (`GetMcatProducts`) under a
different path with no `{cat_slug}` disambiguation from the live route — moot, since
this file never loads.

### 5.3 `routes/channels.php`, `routes/console.php`

Both stock Laravel scaffolding, verified byte-identical to their default framework
content (`channels.php`: one `Broadcast::channel('App.User.{id}', ...)` never invoked by
any code — no broadcasting/websocket usage exists anywhere in the app, matching
blueprint's "no Pusher in use" finding; `console.php`: stock `inspire` Artisan command).
Neither carries any migration-relevant content. **Dead/infrastructure, no action needed.**

---

## 6. New drift found beyond what was pre-documented, and Blueprint Correction Notices

### 6.1 Confirmed pre-documented drift (re-verified this session, not new)

All five items the task description listed as "already found" were independently
re-verified against `public_html/` this session and confirmed accurate:

1. `/all-diseases` route + `HomeController@Alldiseases` + `all-diseases.blade.php` view —
   confirmed present (`web.php:57`, `HomeController.php:906-909`); confirmed **absent**
   from `spakshomeopathy.com/`. Full `diff` output reproduced in §1's route table above.
2. `about.blade.php` — richer SEO meta (title, description, keywords), `rel=canonical`,
   full JSON-LD `AboutPage` structured data, and `og:*` tags, none present in the stale
   backup's version (43-line diff, verified this session).
3. `video.blade.php` — 6 YouTube iframes in `public_html/`, vs. 3 in the stale backup
   (verified via direct `<iframe` count this session: 6 vs 3).
4. `seller-register.blade.php` — de-"zeintext"-ified, real Spaks content (26-line diff,
   verified this session — content changed, still on the alt-theme asset family per
   asset-manifest §4, i.e. the *branding text* changed but the *page's asset stack* did
   not).
5. `inc/header.blade.php` — nav item comment-state flip: Herbs live/Diseases commented
   (opposite of the stale backup); Mother Tincture/Potencies/Contact Us live, not
   commented. Verified via full `diff` this session, reproduced in §2 discussion above.

**Admin views (`resources/views/admin/**`) confirmed unchanged** — `diff -rq` of the
entire `admin/` subtree between `public_html/` and `spakshomeopathy.com/` returns **zero
differences**, matching the task's stated premise exactly.

### 6.2 NEW drift found this session, not previously reported

**Finding 1 — `mail.blade.php` (root) branding-text change, dead file, no behavioral
impact.**
`diff public_html/resources/views/mail.blade.php spakshomeopathy.com/resources/views/mail.blade.php`:
```
< hii this main second email file spaks homeopathy
---
> hii this main second email file gk sharma
```
This file is confirmed DEAD both in the stale backup (asset-manifest §7) and in
`public_html/` — `app/Mail/ResetPassMail.php:32` is the only reference
(`->view('mail')`), and `ResetPassMail` is itself never instantiated anywhere (confirmed:
no `new ResetPassMail` or `Mail::to(...)->send(new ResetPassMail` call exists in any of
the 7 live controllers, matching blueprint §1.2's "never instantiated" classification).
**No behavioral impact** — the file is unreachable in both sources. Recorded for
completeness per contract §2.4 ("when in doubt, list explicitly"), not actionable.

**Finding 2 — `mails/order-confirm.blade.php` branding-text change, dead file, no
behavioral impact.**
```
< <p>Thank you for shopping with Spaks Homeopathy</p>
---
> <p>Thank you for shopping with Zeintext</p>
```
Confirmed DEAD in both sources — `grep -rn "order-confirm"` across `app/`, `routes/`,
`resources/views/` in `public_html/` returns zero matches; no controller method
constructs a `Mail::send('mails.order-confirm', ...)` or equivalent call anywhere.
Matches blueprint §9.4's "Order confirm — DEAD (never sent)" classification exactly.
**No behavioral impact.**

**Finding 3 — the header search form and "My Account" dropdown: `public_html/` disagrees
with BOTH the stale backup AND independently-captured live production. This is the most
significant finding of this document and is escalated formally below (§6.3).**

**Finding 4 — a second, unrouted, differently-named `AdminController::ManagePayments()`
method (plural) exists alongside the routed `ManagePayment()` (singular).**
Verified: `AdminController.php:1360-1368` defines `public function ManagePayments()` (R:
`payments` join `products` join `users`, ordered `payments.id DESC`, returns
`view('manage-payments', ...)` — note the bare string, no `admin.` prefix, which would
itself resolve to a different file than the dot-notation `admin.manage-payments` unless
Laravel's view resolver treats them identically, which it does not by default for a
`resources/views/admin/manage-payments.blade.php` file — this is a second potential
defect nested inside an already-dead method, not further chased since the method is
unrouted regardless). The actual routed handler for `GET /admin/manage-payments`
(`admin.php:122`) is `AdminController@ManagePayment` (singular, `:1413-1422`, dot-notation
view path `admin.manage-payments`). `ManagePayments` (plural) is **dead code, present in
both `public_html/` and the stale backup identically** (this is not new drift between the
two sources — `AdminController.php` diffed byte-identical, §1 above — it is a
previously-uncatalogued **dead-method finding within the single, agreed-upon source**,
surfaced only because this document read every method in the file rather than only the
routed ones). Not in blueprint's DEAD register by name. **No behavioral impact** —
unrouted, never called.

**Finding 5 — `AdminController::ProductCategoryList` contains unreachable dead code after
its `return` statement.**
Verified `AdminController.php:79-92`: the method returns at line 82
(`return view('admin.product-category-list',...)`), but lines 84-91 contain further code
(`$getimg=DB::table(...)->where('id','=',$id)->first();` etc.) referencing an undefined
`$id` variable — this code is **provably unreachable** (PHP terminates method execution
at `return`), so it never executes and never errors. A dead-code artifact, not a
behavioral defect (nothing can ever trigger it). Present identically in both sources
(this controller file diffed byte-identical). **No behavioral impact**, recorded for
completeness only.

**Finding 6 — `AdminController::SavePost` and several sibling upload handlers lack a
`hasFile()`/`empty()` guard before calling `->move()`.**
Verified: `SavePost` (`:857-861`), `SaveProductImage` (implicitly, though this one
lacks an explicit conditional — verified `:439-441`), `Savecategory` (`:221-223`),
`SaveBlog` (`:1013-1015`), `SaveSlider` (`:1154-1156`) all call `$request->file('x')` then
immediately `->move(...)` **without** checking `hasFile()` or `empty()` first — unlike
every "Update" counterpart in the same controller, which uniformly guards. Submitting any
of these five "Add" forms with no file selected produces a fatal error (calling `->move()`
on `null`). This is a genuine, consistent pattern (5 handlers, not 1), not independently
enumerated in blueprint's BROKEN register (9.2) or the Preserved Defect register (9.4) by
name, though it is consistent in spirit with the "no upload validation" theme already
covered by D-04/R-5. **Flagged as a new finding, not itself a new BROKEN-register item
without owner sign-off** — per contract NN-4/IR-9, this is not fixed, only documented.

### 6.3 Blueprint Correction Notice — the header search form / My Account dropdown discrepancy

> **⚠️ CORRECTED (2026-08-16, later session) — READ `docs/BCN-HEADER-SEARCH-FORM-RESOLUTION.md` FIRST.**
> The "3-way disagreement" this section describes below is **partially incorrect**. A
> follow-up investigation found the production-capture citation in the table below
> (search form "Live... verified... uncommented at line 217") was a misreading — line
> 217 sits *inside* a multi-line HTML comment opened on line 216, which this section's
> original analysis did not check. Re-read in full context, the actual production
> capture shows the search form **commented out**, agreeing with `public_html/` and
> disagreeing with the stale backup — the opposite of what this section concludes
> below. **This section is left unmodified, append-only, for audit-trail purposes; the
> corrected finding lives in `docs/BCN-HEADER-SEARCH-FORM-RESOLUTION.md`, which
> supersedes it.**

**This is escalated as a formal finding requiring owner attention, not resolved by this
document (per contract §12.2/§12.3 procedure: identify, record, escalate — do not
guess).**

| Source | Search form (`#searchfrm`, `action="search-products"`) | "My Account" dropdown (`.navigation-box` with Register/Login/Profile/Orders/Logout) |
|---|---|---|
| `public_html/resources/views/inc/header.blade.php` (verified `:39-56`) | **Commented out** (`<!-- <div class="wrap">...</div>-->`) | **Commented out** (`<!--<ul class=" navigation-box">...</ul>-->`) |
| `spakshomeopathy.com/resources/views/inc/header.blade.php` (verified `:41-74`) | **Live** (uncommented) | **Commented out** (same as above) |
| Live production, independently captured pre-existing baseline, `spakshomeopathy-next/baseline/raw-html/home-root.guest.raw.html` (captured during M0/M1, this session cross-referenced it, did not re-capture) | **Live** — verified `<form name="searchfrm" ... action="https://spakshomeopathy.com/search-products">` renders uncommented at line 217 of the captured HTML | **Commented out** — verified `<!--<ul class=" navigation-box">` at line 235 of the captured HTML |

**Finding:** On this specific portion of `inc/header.blade.php`, **production agrees with
the stale local backup (`spakshomeopathy.com/`), not with the newly-supplied, "verified,
authoritative" `public_html/` export.** The My Account dropdown's comment-state is
consistent across all three sources (always commented out) — only the **search form**
disagrees, and it disagrees in the specific direction of `public_html/` being the odd one
out against both other sources.

**Why this matters:** per contract §12.3 ("Source vs. production behavior — where static
reading and runtime disagree, production wins"), and per this task's own framing that
`public_html/` is authoritative "wherever they conflict" — this is precisely a case where
a third, independent, higher-precedence signal (rank 6, observed production behavior)
contradicts the newly-designated rank-4 source on one specific, narrow point. Applying
contract precedence strictly: **rank 6 (production) should govern over rank 4
(`public_html/` source) here**, which would mean the search form should be ported as
**live**, matching the stale backup and matching production — not matching
`public_html/`'s own commented-out state.

**This document does not resolve this** — it is recorded as a Blueprint/source-conflict
finding requiring owner attention before whichever milestone ports `inc/header.blade.php`
(M1, already gated — **this finding may retroactively affect M1's already-completed
header port if M1 built the header before this finding surfaced; that assessment is
explicitly out of this document's scope and is flagged for the owner/architect to
triage**). Possible explanations, none confirmed or ruled out by this document: (a) the
production capture predates a recent edit that commented the form out in
`public_html/`'s export (i.e., `public_html/` is *newer* than the still-live production
site at the moment of the M0/M1 capture — plausible given `public_html/`'s own file
mtimes are 2026-01-07/01-21 per OI-6-RESOLUTION §2.3, while the M0 capture's exact date
is not restated in this document — the site could have changed between capture and
export); (b) the production capture itself is stale/cached; (c) some other environment
difference. **No explanation is asserted as fact here — only the three-way disagreement
itself, which is the auditable finding.**

**Recommendation (not a decision):** before any milestone ports or re-verifies
`inc/header.blade.php`, re-capture live production's current header HTML fresh, compare
against both `public_html/`'s and the stale backup's versions a third time, and let
whichever result matches *current* live production govern, per contract §12.3's own
stated tie-break rule — production is definitionally the final arbiter for exactly this
kind of static-source disagreement.

### 6.4 Items checked and confirmed to carry NO new drift

Full `diff -q`/`diff -rq` was run this session (not merely spot-checked) between
`public_html/` and `spakshomeopathy.com/` for: all 7 live controllers, all 5 `Auth/*`
controllers, all 6 route files, all `app/Http/Middleware/*.php` files (10 files), the
entire `resources/views/admin/**` subtree, the entire `resources/views/buyer/**` subtree,
`resources/views/mails/**`, `resources/views/inc/**`, the entire `config/**` directory,
`app/Providers/**`, the misplaced `product-detail.blade.php`/`product-view.blade.php` in
`Controllers/`, `AdminController-old-4-1-2023.php`, the root (unrouted) duplicate
`LoginController.php`/`RegisterController.php`, `app/BlogCategory.php`, and
`app/Mail/ResetPassMail.php`. **Every file listed here returned zero differences**
(confirmed byte-identical) **except** the six files enumerated in §6.1/§6.2 above. No
other drift exists in the areas this session's diff coverage reached.

---

## 7. Explicit confirmations

- **No code of any kind was written.** No `.tsx`/`.ts`/`.jsx`/`.js` file was created or
  modified under `spakshomeopathy-next/src/`.
- **No page, route handler, model, or business logic was implemented.**
- **No MongoDB collection was designed, sketched, or proposed.** No embedding/reference
  decision was made — that is `docs/M3-DATABASE-MAPPING.md`'s task, not this one's, and
  this document does not encroach on it.
- **No file was modified anywhere** — not in `public_html/`, not in
  `spakshomeopathy.com/`, not in `spakshomeopathy-next/src/`, not in any config file. This
  document (`docs/M3-APPLICATION-MAPPING.md`) is the only file created this session.
- **`public_html/babasahebsamaj/`, `public_html/meenaparivaar/`, `public_html/spakseducation/`
  were not read, listed, or acted upon** beyond the directory-listing confirmation already
  performed by `docs/OI-6-RESOLUTION.md` in an earlier session; this session did not
  re-touch them.
- **OI-1a, OI-1b remain untouched, irrelevant to this document** — no authenticated
  (buyer/admin) capture was attempted or required; every claim above is derived from
  static source reading (`public_html/app/`, `public_html/routes/`,
  `public_html/resources/views/` — the latter read only via `diff`/`grep` for drift
  detection, not fully re-transcribed, since `docs/asset-manifest.md` already did that
  work and is cross-referenced rather than duplicated).
- **No MariaDB or MongoDB connection was attempted.** All DB-operation claims above are
  derived from static `DB::table(...)` call-site reading in `public_html/app/Http/Controllers/`,
  cross-checked against `docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md`'s independent schema
  analysis (itself derived from the static `Database/db_newhomo.sql` dump, not a live
  connection).
- **No BROKEN item was fixed, and no fix was proposed.** All 17 items in Register 9.2 were
  independently re-confirmed (16 of 17 directly against `public_html/` source this
  session; B-13 inherited from prior verification, explicitly flagged as such in §5).
- **No Change Request was raised** — this document surfaces one Blueprint/source
  precedence conflict (§6.3) for owner attention per contract §12.5's "raise, don't
  guess" procedure, which is distinct from a Change Request (no deviation from PHP
  behavior is being proposed; the question is which PHP-observed behavior — export vs.
  production — governs).
- **This document did not begin M3 implementation, did not authorize M3, and does not
  purport to lift the existing "M3 remains NOT AUTHORIZED" status** recorded in
  `docs/OI-6-RESOLUTION.md` §6 and `docs/D-10-CUTOVER-ROLLBACK-STRATEGY.md` §22. That
  authorization, per the owner's own standing instruction, requires a separate, explicit
  instruction not given by this task.

---

*End of M3 Application Mapping.*
