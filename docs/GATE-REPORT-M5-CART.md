# MILESTONE GATE REPORT — M5: Cart

**Status:** Implemented, unit-tested, typecheck/lint/format clean. Live
end-to-end HTTP verification against a real running dev server was
ATTEMPTED but blocked by an environment-level MongoDB Atlas connectivity
issue in this sandbox — see §6 for the full disclosure. Not a code defect;
disclosed rather than hidden or worked around by weakening anything.
**Date:** 2026-08-31.
**Blueprint ref:** §7.2 (Cart), §7.5 (order-id generation), §9 (APIs),
"Milestone 5 — Cart" (blueprint's milestone table).
**Prerequisite:** M4 formally gate-closed this same session — see
`GATE-REPORT-M4-AUTH.md` ADDENDUM 6.

---

## 0. OWNER AUTHORIZATION RECORD (this session)

Two decisions were required before/during this milestone, both recorded
in their own durable format:

1. **Demo-UI-vs-real-cart reconciliation** — owner selected "Replace Demo
   UI with real M5 cart" (this session, 2026-08-31) — the pre-existing
   `/cart-list`/`/shopping-cart` static-fixture demo (`docs/
   DEMO-UI-MIGRATION-REPORT.md`) is superseded by the real, functional
   cart built this milestone, not left running in parallel.
2. **`/update-cart`'s URL-vs-redirect tradeoff** — owner selected
   "Redirect to /cart-list" over "render raw HTML string to keep the URL
   identical" — see §3 below for the disclosed D6 (protocol) deviation
   this produces.
3. **B-16 ratification** — owner approved NOT reproducing the
   `/shopping-cart` crash; full record in `docs/B-16-RESOLUTION.md`
   (first entry in the Approved Fix Register, contract §9.3).

---

## 1. CONTRACT ACKNOWLEDGEMENT

This task read `MIGRATION-CONTRACT.md` in full (already read in a prior
session; re-confirmed this session for M5-relevant sections — Part 1 §7
sections, §9.2 BROKEN Register, §9.3 Approved Fix Register, Part 6 Change
Control) and `blueprint.md` §7.2/§7.5/§9 and the M5 milestone entry, per
the contract's Reading Requirement (Preamble).

Rules directly engaged by this milestone:
- **NN-3** (URLs immutable, misspellings preserved) — `cart-remove-iteam`
  ported verbatim, not corrected to `cart-remove-item`.
- **NN-4/IR-9** (broken stays broken) — the `p_image10`/`name10`
  copy-paste condition bugs (`CartController.php:150-155`,`224-229`) are
  reproduced exactly, not corrected — see §4.
- **NN-5** (rendered DOM must match) — the cart table's full 10-slot
  image/name rendering was corrected this milestone (the M1 demo
  simplified this to one image/one name per line) — see §4.
- **NN-6** (DB writes match row-for-row) — N/A this milestone: source's
  own cart is session-only, no DB table exists for it (blueprint §6.5),
  so this module correctly performs zero database writes.
- **§5.1** (pre-approved technology substitution) — `darryldecode/cart` →
  custom implementation, explicitly pre-approved "Same semantics."
- **§10.1** (decision procedure) — the `/update-cart` rendering
  constraint and the Demo-UI-vs-real-cart question were both raised to
  the owner (Step 6) rather than decided unilaterally.

---

## 2. FILES CREATED

| File | Purpose |
|---|---|
| `src/lib/cart.ts` | Core session-cart module — HMAC-signed `spaks_cart` cookie, mirrors `darryldecode/cart` semantics (add/remove/update/subtotal/distinct-line-count). |
| `src/lib/cartOrderId.ts` | `getOrderId` generation (`CartController.php:283-286`) — `rand(99,9999)` string-concatenated with `MAX(orders.id)+1`. |
| `src/lib/cartOrderIdCookie.ts` | Storage for `session('getOrderId')` — plain (unsigned) cookie, same category as `flash.ts`. |
| `src/lib/cartActions.ts` | Shared `handleStoreCart` logic behind both `/store-cart` (POST) and `/product-store-cart` (GET) — both routes are bound to the identical `StoreCart` method in source. |
| `src/app/store-cart/route.ts` | `POST /store-cart`. |
| `src/app/product-store-cart/route.ts` | `GET /product-store-cart` — the ACTUAL real traffic path (blueprint §3.1 row #25). |
| `src/app/remove-cart/[id]/route.ts` | `GET /remove-cart/{id}`. |
| `src/app/cart-remove-iteam/[id]/route.ts` | `GET /cart-remove-iteam/{id}` (named route, preserved typo). |
| `src/app/cart/update/route.ts` | `GET /cart/update` (`rowid`/`newqty` fields). |
| `src/app/update-cart/route.ts` | `POST`/`GET /update-cart` (`id`/`quantity` fields) — disclosed D6 deviation, see §3. |
| `src/app/update-cart-ajax/route.ts` | `POST /update-cart-ajax` (named `updateCartByAjax`) — the one cart endpoint the deployed client JS actually calls. |
| `tests/cart/cart.test.ts` | 13 unit tests — add/re-add/remove/update/subtotal/badge-count/tamper-rejection. |
| `tests/cart/cartOrderId.test.ts` | 3 unit tests — `getOrderId` format, string-concatenation (not numeric addition), empty-collection handling. |
| `tests/cart/cartActions.test.ts` | 6 unit tests — field parsing, the two preserved copy-paste defects, FormData-vs-URLSearchParams equivalence. |
| `docs/B-16-RESOLUTION.md` | Owner decision record ratifying the pre-existing `/shopping-cart` deviation from B-16's reproduce-the-crash default. |

## 3. FILES MODIFIED

| File | Change |
|---|---|
| `src/app/CartPageContent.tsx` | Rewired from `src/lib/demo/cart.ts`'s static 2-item fixture to the real `src/lib/cart.ts` (`getCartContent`/`getSubTotal`). Corrected the M1-era single-image/single-name simplification to the real full 10-slot rendering (`shopping-cart.blade.php:90-176`). Real `_token` (was a hardcoded `''`) and real `OrderId` (was a hardcoded `''`) now populate the "Place Order" form's hidden fields. The inline AJAX-update `<script>` now interpolates the real CSRF token directly (matching source's own Blade-interpolation mechanism) instead of adding a new DOM node for it — considered and rejected a design that would have added an extra hidden `<input>`, which would have been an undisclosed NN-5 structural deviation. |
| `src/app/cart-list/page.tsx`, `src/app/shopping-cart/page.tsx` | No functional change — both continue to render `<CartPageContent />`; the component itself becoming an async Server Component (to read cookies) required no change at these call sites since Next.js resolves async component JSX transparently. |
| `src/components/layout/PublicHeader.tsx` | Cart badge (`<span class="count">`) now reads the real `TotalCartItem` (`getTotalCartItem(await getCartContent())`) instead of a hardcoded `0`. `StickyNavBody` became an async function as a result. Exact Blade whitespace preserved (`{{"0"}}` vs. the else-branch's trailing-space `{{...}} ` — re-verified byte-for-byte against `inc/header.blade.php:119` before implementing). |
| `src/components/interactive/AddToCartForm.tsx` | `_token` now carries a real generated CSRF token (was an M4-era empty placeholder) — matches the established `register`/`login` pattern. Not itself verified by the GET-method `product-store-cart` route (Laravel's own CSRF middleware exempts GET too), populated purely for markup/structural parity with source's own hidden-field presence. |
| `src/app/user-login/route.ts`, `src/app/admin/user-login/route.ts` | `cartTotal` passed to `login()` now reads the real session cart's distinct-line count instead of the hardcoded `0` both routes' own prior comments flagged as a known gap ("no server-side cart session exists yet"). Closes that gap — the `utype==3 && backuser=='seller_buyer'` branch's `cart-list`-vs-`myaccount` redirect choice (`LoginController.php:56`) now uses real data. |
| `src/lib/mongodb/repositories/orderRepository.ts` | Added `OrderRepository.findHighestLegacyId()` — mirrors `DB::table('orders')->orderBy('id','DESC')->first()` (`CartController.php:283`), needed for `getOrderId` generation. No existing method changed. |
| `src/app/product-checkout/page.tsx` | Comment-only correction: flagged the now-real divergence between `/cart-list`'s real cart total and this page's still-demo-fixture subtotal (checkout wiring is M6 scope, not touched this milestone) — see that file's updated header comment. |

## 4. FILES DELETED

None. `src/lib/demo/cart.ts` (the M1-era static fixture) is left in place,
unreferenced by `CartPageContent.tsx` as of this milestone, per NN-8 (no
feature/code removal without approval) — it was not asked to be deleted,
and deleting a file used to be the fixture the whole cart UI ran on is a
larger decision than this milestone's scope. Nothing else in the app was
found to still depend on it (`grep` confirms only `product-checkout/
page.tsx` still imports `getDemoCartSubtotal`/`getAllStatezones` from
`src/lib/demo`'s index, and only for the subtotal — see the note added to
that file's header this session).

---

## 5. WHAT WAS BUILT, MAPPED TO LARAVEL SOURCE

### Cart semantics (`src/lib/cart.ts`, mirrors `darryldecode/cart` via `CartController.php`)

| Behavior | Source | This port |
|---|---|---|
| Add: quantity fixed at 1 | `CartController.php:240` | `handleStoreCart` hardcodes `quantity = 1`, documented as not user-supplied |
| Re-add SAME id increments quantity, does not replace/duplicate | package default (`Cart::add()`) | `addToCart()` — `findIndex` + `quantity += newItem.quantity`, verified by `tests/cart/cart.test.ts` |
| Re-add does NOT overwrite price/name/attributes | package default | `addToCart()`'s existing-line branch touches ONLY `quantity` |
| `TotalCartItem` = distinct line count (P-08), not total quantity | `CartController.php:279-282`, `298-300` | `getTotalCartItem()` = `content.length` |
| Subtotal = `Cart::getSubTotal()` | package | `getSubTotal()` = Σ(price × quantity) |
| Cart is anonymous, global-to-session, survives login (P-11) | package + `CartController`'s own architecture (no `carts` table exists — blueprint §6.5) | `spaks_cart` cookie is NOT keyed to `userId`, independent of `spaks_session` |
| `Cart::update()` — ABSOLUTE quantity, not relative | `CartController.php:332`, `342-344`, `393-397` | `updateCartQuantity`/`updateCart`/AJAX handler all SET, never increment |
| Quantity `<= 0` passed through unmodified | no validation in source | `updateCartQuantity` performs no floor/guard, verified by test |

### Routes (all 9 cart routes from blueprint §3.1, rows #24-30, #35-36)

| Route | Laravel | This port | Notes |
|---|---|---|---|
| `POST /store-cart` | `CartController@StoreCart` | `src/app/store-cart/route.ts` | Not the route real traffic uses (see next row) |
| `GET /product-store-cart` | same method | `src/app/product-store-cart/route.ts` | **The actual path used** (blueprint's own annotation) — `AddToCartForm.tsx`'s `method="REQUEST"` quirk coerces to GET |
| `GET`/`POST /shopping-cart` | `CartController@ShopCart` (B-16) | existing `page.tsx`, unchanged this milestone except data source | B-16 ratified NOT reproduced — `docs/B-16-RESOLUTION.md` |
| `GET /remove-cart/{id}` | `CartController@RemoveCart` | `src/app/remove-cart/[id]/route.ts` | |
| `GET /cart/update` | `CartController@update` | `src/app/cart/update/route.ts` | `rowid`/`newqty` fields — deliberately NOT normalized to match `/update-cart`'s `id`/`quantity` naming (contract §5.2: near-duplicates ported independently) |
| `GET /cart-remove-iteam/{id}` | `CartController@RemoveCart` (named route) | `src/app/cart-remove-iteam/[id]/route.ts` | Preserved typo, NN-3 |
| `POST`/`GET /update-cart` | `CartController@UpdateCart` | `src/app/update-cart/route.ts` | **Disclosed D6 deviation** — see below |
| `GET /cart-list` | `CartController@cartList` | existing `page.tsx`, data source updated | Primary, fully-functional cart page |
| `POST /update-cart-ajax` | `CartController@UpdateCartByAjax` | `src/app/update-cart-ajax/route.ts` | The one endpoint the real client JS calls; CSRF-verified (payload confirmed form-urlencoded, not JSON, by direct inspection of the calling jQuery `$.ajax` call) |

### `getOrderId` generation (`src/lib/cartOrderId.ts`, mirrors `CartController.php:283-286`)

`rand(99,9999)` string-CONCATENATED (PHP's `.` operator, not `+`) with
`MAX(orders.id)+1`. Explicitly NOT the `'1200' + $id` numeric-addition
case documented in contract §10.4 (that's a different, DEAD legacy path) —
this file's header comment calls out the distinction so a future reader
doesn't conflate the two. R-6 (race condition — unguarded read-then-write)
is reproduced, not fixed, per contract §5.3's explicit scoping of the
approved transaction-wrap to actual order creation in M6, not this
session-only stamp.

---

## 6. DISCLOSED GAP: LIVE HTTP VERIFICATION BLOCKED BY SANDBOX MONGODB CONNECTIVITY

This is reported plainly, not minimized or worked around.

**What was attempted:** a real `npm run dev` server was started and
exercised via `curl` with a cookie jar across the full flow — add to
cart, view cart, re-add (increment check), remove, cart badge.

**What happened:** every request that required a NEW MongoDB Atlas
connection (`store-cart`/`product-store-cart`, which call
`generateCartOrderId()` → `getDb()`) failed with:

```
MongoServerSelectionError: ...SSL routines:ssl3_read_bytes:tlsv1 alert
internal error... ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR
```

This reproduced consistently across a full dev-server restart (ruling out
stale in-process state) and a direct raw `mongodb` driver connection
attempt outside Next.js entirely (which hung past a 20s timeout rather
than failing fast) — both point to a TLS/egress restriction specific to
this sandbox environment reaching `spakshomeopathy.wc77zvf.mongodb.net`,
not a defect in the code written this session. General internet
egress (a plain TCP connection to `8.8.8.8:443`) was confirmed working
separately, isolating the failure to the Atlas endpoint specifically.

**A separate, real, pre-existing bug was found and NOT fixed this
session** (out of scope, flagged for owner attention): `src/lib/mongodb/
client.ts`'s `getMongoClient()` assigns the module-level `client` variable
BEFORE `await client.connect()` resolves (line 84 before line 85) — if
`.connect()` throws, the failed client instance is still cached, so every
subsequent call in that same Node process short-circuits at line 76
(`if (client) return client;`) and reuses a client that never
successfully connected, producing `MongoTopologyClosedError` on every
later call until the process restarts. This is pre-existing M3-A
infrastructure, not introduced by M5, and is exactly the kind of "obvious
bug" the contract's §10.2 table warns against fixing unilaterally — flagged
here for an explicit owner/implementer decision in a future session, not
touched.

**What this means for M5's verification standard:** the cart LOGIC itself
(add/re-add/remove/update/subtotal/badge-count semantics, the two
preserved copy-paste defects, `getOrderId`'s format) is verified by 22
passing unit tests against fixtures/mocks — the SAME evidentiary pattern
this project has used throughout (`tests/auth/*`, `tests/services/*`, all
labeled UNIT + FIXTURE). What is NOT verified this session is a live,
end-to-end HTTP round-trip through a real MongoDB connection, because that
specific infrastructure path is blocked in this sandbox. `npm run build`
DID succeed, confirming every new route compiles and type-checks as a
real Next.js route (not just in isolation via `tsc`).

**Recommendation:** re-run the live HTTP flow (§ "live end-to-end
verification" pattern established in `GATE-REPORT-M4-AUTH.md`'s
addenda) from an environment with confirmed Atlas connectivity before
this milestone is considered FULLY closed to the same standard as M4's
addenda. This gate report does not claim that live verification occurred
when it did not.

---

## 7. PRESERVED DEFECTS (NOT FIXED)

| Defect | Source | Reproduced how |
|---|---|---|
| `image10`/`name10` slots populated based on checking `p_image`/`p_name` (not `p_image10`/`p_name10`) — a copy-paste bug | `CartController.php:150-155`, `224-229` | `cartActions.ts`'s field-parsing logic, verified by 2 dedicated tests in `cartActions.test.ts` |
| Dead code after `return redirect()->route('cartList')` in `StoreCart` (`CartController.php:290`'s unreachable `return view(...)`) | `CartController.php:289-290` | Not reproduced — genuinely unreachable in PHP too, noted in `store-cart/route.ts`'s header comment |
| `RemoveCart`'s commented-out POST route and alternate implementation | `CartController.php:46`, `318-326` | Not ported — commented code carries no authority (contract §12.4) |
| Delivery charge hardcoded `0` (P-09) | `CartController.php:380-382` | `CartPageContent.tsx`'s "Delivery Charges: Free" row, unchanged from M1 |

---

## 8. VERIFICATION PERFORMED THIS PHASE

```
npm run typecheck   ✅ 0 errors
npm run lint         ✅ 0 errors (same 4 pre-existing, unrelated warnings)
npm run format:check ✅ pass
npm run test         ✅ 360/360 passed, 44 test files, 0 regressions
                         (338 pre-existing + 22 new this milestone:
                         13 cart.test.ts + 3 cartOrderId.test.ts +
                         6 cartActions.test.ts)
npm run build         ✅ pass — all 9 new cart routes compile as
                         ƒ (Dynamic); /cart-list, /shopping-cart render
```

Live HTTP verification: ATTEMPTED, BLOCKED — see §6.

## 9. M5 TESTING CHECKLIST (blueprint's own milestone table) — STATUS

| Item | Status |
|---|---|
| Add to cart from product detail with 1/3/10 slots checked → correct price/attributes | ⚠️ Partial — field-parsing verified by unit test; the CLIENT-SIDE checkbox-pricing JS itself (§7.1) was already ported in an earlier M3 slice (`product-details/[slug]/page.tsx`), not re-verified this session; live end-to-end blocked per §6 |
| Re-adding same product increments quantity | ✅ Unit-tested |
| `TotalCartItem` = distinct line count | ✅ Unit-tested |
| Badge updates across pages | ⚠️ `PublicHeader.tsx` now reads real cart on every render (Server Component, no client-side staleness possible) — logically correct, not live-HTTP-confirmed per §6 |
| AJAX qty update returns identical JSON; page reloads `cartList` | ⚠️ Route built, CSRF-wired, client script updated to send real token; not live-confirmed per §6 |
| Remove via both `remove-cart/{id}` and `cart-remove-iteam/{id}` | ✅ Both routes built, share the same `removeFromCart` unit-tested logic |
| Subtotal matches `Cart::getSubTotal()` | ✅ Unit-tested |
| Delivery always 0 | ✅ Unchanged from M1, verified by inspection |
| Cart survives login (anonymous → authenticated) | ✅ By construction — `spaks_cart` cookie is independent of `spaks_session`; `user-login/route.ts` reads (never clears) cart state |
| `getOrderId` generated and stored on add | ✅ Unit-tested (`cartOrderId.test.ts`, `cartActions.test.ts`) |
| `/shopping-cart` reproduces its BROKEN state | ❌ BY DESIGN, per ratified `docs/B-16-RESOLUTION.md` — does NOT reproduce B-16, owner-approved |

---

## 10. KNOWN GAPS / NOT DONE THIS PHASE

1. **Live end-to-end HTTP verification** — blocked by sandbox MongoDB
   connectivity (§6). Not silently skipped; explicitly disclosed.
2. **`getMongoClient()`'s failed-connection caching bug** (§6) — found,
   not fixed, flagged for owner/implementer decision.
3. **`/product-checkout`'s subtotal** still reads the M1-era demo fixture,
   now visibly divergent from `/cart-list`'s real total — flagged as M6
   scope, comment updated to disclose this rather than leave it silently
   inconsistent.
4. **`store-cart` (POST)'s CSRF** is not verified (only the GET
   `product-store-cart` — the actual traffic path — was built; a genuine
   POST integration doesn't currently exist anywhere in the app's own
   click-path) — flagged in that route file's own header comment for a
   future session if a real POST submission path is ever added.
5. **Checkbox-pricing client JS (§7.1)** was not re-verified this session
   (built in an earlier M3 slice, outside this milestone's file-change
   set) — noted as a gap in the testing-checklist table above rather than
   asserted as covered.

---

## 11. SIGN-OFF

M5 (Cart) is **implemented and unit-verified** to this project's
established fixture-testing standard, with one disclosed verification gap
(live HTTP against a real MongoDB connection — environment-blocked, not
a code defect) and one disclosed pre-existing infrastructure bug (found,
not fixed). Per contract §7.4 ("fidelity is proven, not asserted"), this
report does not claim live verification that did not occur.

**Recommended before formally closing M5 to the same standard as M4's
addenda:** re-run the live end-to-end HTTP flow from an environment with
confirmed MongoDB Atlas connectivity, and decide whether to fix
`client.ts`'s failed-connection-caching bug (a Change-Request-eligible
infrastructure fix, not itself a Laravel-behavior deviation).

---

## ADDENDUM (2026-09-07) — `getMongoClient()` failed-connection-caching bug FIXED, pre-M6

**Append-only. Nothing above this line is altered, deleted, or superseded.**

Per owner instruction, immediately before M6 (Checkout & orders) begins —
the milestone this bug was flagged as most likely to visibly break, since
order creation is exactly the kind of sequential multi-collection-write
flow a poisoned connection would silently corrupt — the bug disclosed in
§6/§10 above was fixed:

`src/lib/mongodb/client.ts`'s `getMongoClient()` previously assigned the
result of `new MongoClient(config.uri)` to the module-level `client`
variable BEFORE `await client.connect()` resolved. If `.connect()`
threw, the failed instance was still cached, so `if (client) return
client;` on every later call in the same process would short-circuit
onto a client that never actually connected, surfacing as
`MongoTopologyClosedError` on every subsequent call until the process
restarted.

**Fix:** the new client is now held in a local (`candidate`) and only
assigned to `client` after `.connect()` succeeds — the same pattern
`src/lib/herbs/db/client.ts` and `src/lib/motherTincture/db/client.ts`
(both built later, 2026-08-31 and 2026-09-07 respectively) already used
correctly, confirmed by direct comparison before this fix was written.

**This is infrastructure-only** — it changes no Laravel-parity behavior,
no observable output, no database write path, no route, and no dimension
in contract §7.1. It affects only what happens after a *failed* connection
attempt, a scenario with no Laravel equivalent to preserve (Laravel's own
MySQL connection handling is a separate mechanism entirely, out of scope
for D1–D7 comparison). Per `GATE-REPORT-M5-CART.md`'s own §6 characterization
("a Change-Request-eligible infrastructure fix, not itself a Laravel-behavior
deviation"), no Change Request was required.

**Verification:**

```
npm run typecheck   ✅ 0 errors
npm run lint         ✅ 0 errors (same 4 pre-existing, unrelated warnings)
npm run test         ✅ 512/512 passed, 55 test files, 0 regressions
                         (511 pre-existing + 1 new regression test)
```

New regression test added: `tests/mongodb/production-guard.test.ts` — "does
NOT cache a client whose connect() rejected" — mocks a `.connect()`
rejection on the first call, then asserts a second `getMongoClient()`
call retries (calls `connect()` again) rather than short-circuiting on the
cached failed client. This test would have failed against the pre-fix code.

**No M5 gate is reopened by this addendum.** This fix touches only
`src/lib/mongodb/client.ts` and its own test file — no file any M5-A/B/C/E-\*
gate report claims, and no file `docs/CR-005-HOMEPAGE-REDESIGN-AND-NEW-SECTIONS.md`
or `docs/CR-003-HERBAL-ECOMMERCE-SECTION.md` governs. Real Atlas
verification of this fix specifically was not attempted, for the same
disclosed environment-TLS reason every other M5 report has documented; the
fix is verified at the unit/regression-test level, consistent with this
project's established evidentiary standard for infrastructure-only changes.

**Status:** M5-Cart's one remaining disclosed infrastructure gap is now
closed. The live-Atlas verification gap remains open, unchanged, and
non-blocking per the owner's standing instruction (`GATE-REPORT-M5-A.md`
addendum).
