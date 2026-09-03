# B-12 RESOLUTION — `view-order` correction (M4 buyer-orders slice)

**Type:** Owner-authorized defect correction. **Date:** 2026-08-22.
**Task:** "M4 — BUYER ORDERS SLICE / B-12 DECISION." **Owner decision:**
do NOT reproduce the known crash; correct it against the actual migrated
MongoDB data model (DR-01 Option B: `orders`/`orderProducts`/`payments`
as three separate collections).

---

## 1. Original Laravel defect (B-12), and a second defect found this session

### 1a. The originally-catalogued defect: `orders.pid` does not exist

**Source (`public_html/app/Http/Controllers/BuyerController.php:85-91`):**

```php
public function ViewOrder($orderId)
{
 $getOrder=DB::table('orders')
  ->join('products','products.id','orders.pid')
  ->where('orders.id','=',$orderId)->first();
  return view('view-orders',['getOrder'=>$getOrder]);
}
```

`orders.pid` is not a column in the source schema — re-verified directly
this session against `schemas/order.ts` and the original
`Database/db_newhomo.sql` `CREATE TABLE orders` statement. The real
product-reference column on `orders` is `ProductId` (mapped to
`orderSchema.productId` in this port). Every real request to
`GET view-order/{orderId}` throws a MySQL "unknown column" error at the
database layer before any view is ever rendered.

### 1b. Additionally discovered this session: the target view doesn't exist either

`ViewOrder` returns `view('view-orders', ...)`. Laravel's `view()` helper
resolves a bare name against `config/view.php`'s `paths` array, which is
the unmodified default (`resource_path('views')` only — verified by
reading that file directly this session). A bare `view('view-orders')`
call therefore resolves to `resources/views/view-orders.blade.php`.

**That file does not exist.** A repo-wide search finds only:

```
resources/views/buyer/view-orders.blade.php
resources/views/admin/view-orders.blade.php
resources/views/admin/buyer/view-orders.blade.php
```

None of these paths is reachable by a bare `view('view-orders')` call
under the standard, unmodified view-resolution config. This means
`/view-order/{orderId}` is broken on **two independent axes** — even if
the `orders.pid` join somehow succeeded, the subsequent
`view('view-orders')` call would still throw a
`Illuminate\View\ViewNotFoundException`. Either failure alone makes every
real request to this route fail; the route has never worked, on either
axis, as far as this migration's evidence shows.

**`buyer/view-orders.blade.php` is not usable as a fidelity reference
either.** It was read in full this session: it renders a completely
different theme family ("Zeintext," `seller.seller-topbar`/
`seller.seller-sidebar` includes — the alt-theme also seen in
`/update-password`'s page, not the "cart-section" theme every other real
buyer page in this port uses), and its field references
(`$getOrder->orderId`, `p_name`, `hsn_code`, `price`, `order_notes`,
`orderDate`, `deliveryDate`, `orderStatus`) do not match what
`ViewOrder`'s own (broken) query would even produce (`orders.*` +
`products.*` via the attempted join, not this field set). It is orphaned,
dead code from an unrelated UI iteration — not "the intended view under a
different path." Not used as a source of truth for this correction.

---

## 2. Why reproducing the crash was rejected

Per owner instruction this session (and consistent with this project's
prior M4-PREP-phase reasoning, `src/lib/services/orderService.ts`'s
original header comment): B-12 is a **runtime failure**, not a
fidelity-relevant difference in what data looks like or how it's
calculated. There is no "broken output" to preserve — only a route that
has never successfully returned anything to compare against, on either
of its two independent failure axes. Reproducing "always throw" would
not preserve any observable behavior a real user or a future maintainer
could meaningfully depend on; it would only make the migrated route
permanently useless. The owner's explicit decision this session
(**"Do NOT reproduce the known crash… correct B-12 by implementing the
intended order lookup"**) formalizes what the M4-PREP phase had already
concluded informally.

---

## 3. Old (broken) lookup behavior

| Step | Laravel |
|---|---|
| 1 | `orders.id = $orderId` (a route param bound directly to the ORDERS table's own row primary key) |
| 2 | `JOIN products ON products.id = orders.pid` — **fails**: `pid` doesn't exist |
| 3 | (never reached) `view('view-orders', ...)` — **would also fail**: view file doesn't exist |
| 4 | No ownership check anywhere in the method |
| 5 | No `orderProducts`/`payments` data included at all — the (broken) query only ever touches `orders` + `products` |

---

## 4. Corrected lookup behavior (this session)

### 4a. Key mapping decision: `orderId` param → GroupId, not `orders.legacyId`

Source's route param is literally `orders.id` (this port's
`orders.legacyId`). This correction keeps the **same URL segment name**
(`/view-order/[orderId]`) for URL-shape continuity, but treats the
param's **value** as the order's **GroupId** — the schema's own
documented "TRUE order-linkage key" (`schemas/order.ts` header:
"`★ GroupId` is the TRUE order-linkage key, not any collection's own
`legacyId`/`_id`"), not `orders.legacyId`.

**Reasoning:** `orders.legacyId` alone is not useful without also
resolving its GroupId to find the associated `orderProducts`/`payments`
rows — B-12's own broken join was already attempting (however
incorrectly) to pull in `products` data, implying the actual intent was
"show this order's product(s)," which is fundamentally a GroupId-keyed
operation in this schema (one order = one GroupId = N `orderProducts`
lines = N `payments` rows, per `getOrderByGroupId`'s pre-existing header
comment, unmodified this session). Using GroupId directly — rather than
looking up `orders.legacyId` only to immediately re-derive its GroupId —
is the more direct implementation of the same underlying intent. **This
is not a data-model redesign**: the correction still reads from the same
three collections (`orders`, `orderProducts`, `payments`), still uses the
same GroupId-keyed reconstruction pattern (`getOrderByGroupId`) every
other order-reconstruction function in this codebase already used before
this session (`getBuyerOrderView`, built M4-PREP, unmodified).

### 4b. MongoDB mapping

| Old Laravel attempt | Corrected Next.js implementation |
|---|---|
| `DB::table('orders')->join('products','products.id','orders.pid')->where('orders.id','=',$orderId)->first()` | `getBuyerOrderDetail(db, groupId, buyerId)` (`src/lib/services/orderService.ts`) → `getOwnedOrderByGroupId(db, groupId, buyerId)` (`src/lib/mongodb/repositories/orderRepository.ts`) → three parallel queries: `orders.findOne({groupId})`, `orderProducts.find({groupId})`, `payments.find({gid: groupId})` — the exact same DR-01 Option B multi-query pattern `getOrderByGroupId` already established, reused unmodified |
| (broken `products` join) | `ProductRepository.findByLegacyIds()` ($in batch fetch) against each line's `productId`, joined in application code — added this session |
| (no ownership check) | `orderProducts.buyerId === buyerId` checked for EVERY line before any data is returned — added this session, see §6 |
| `view('view-orders')` (nonexistent file) | `src/app/view-order/[orderId]/page.tsx` — a real page, built this session, showing order header + line items (with joined product name/slug) + payment records |

### 4c. Fields shown

No Laravel view exists to mirror field-for-field (§1b). The corrected
page shows exactly what the three collections actually carry: order
header (GroupId, transaction id, status, total price, order/delivery
date, pay mode), each `orderProducts` line (product name/slug via the
join, quantity, sell price, total price, status), and associated
`payments` records (amount, pay mode, pay status, pay date). No fields
beyond what these three collections actually store were invented.

---

## 5. Correct order-listing behavior (`/manage-orders`) — built alongside the same slice

Not itself part of B-12, but built in the same session as its
prerequisite/companion (the M4-PREP phase's `getBuyerOrderGroupIds` had
explicitly deferred the product-join + sort piece — see that function's
own original header note, unmodified). Source
(`BuyerController.php:71-82`):

```php
$uid=Auth::user()->id;
DB::table('orderproducts')
  ->join('products','orderproducts.ProductId','products.id')
  ->join('orders','orders.GroupId','orderproducts.GroupId')
  ->select('orderproducts.*','products.*','orderproducts.id as OrderPid','orders.qr_transection_id')
  ->where('orderproducts.BuyerId',$uid)
  ->orderBy('orderproducts.id','DESC')
  ->paginate(20);
```

`getBuyerManageOrdersView()` (`orderService.ts`) reproduces this as:
`getOrderGroupIdsForBuyer` (now DESC-ordered by the line's own
`legacyId`, matching `orderproducts.id DESC` — this session closed that
previously-deferred gap) → per-GroupId `getOrderByGroupId` →
`ProductRepository.findByLegacyIds` batch join. **Pagination
(`->paginate(20)`) is NOT implemented** — a read-only aggregation against
real `spaks_dev` data this session confirmed no real buyer account has
more than 11 order lines, so a 20-per-page cutoff is never reached by
any real account today; flagged, not silently assumed irrelevant
forever.

---

## 6. Ownership check — a deliberate, owner-authorized addition beyond source

**Neither `ViewOrder` nor `CancelOrder` performs any ownership check in
source**, verified directly this session:

- `ViewOrder($orderId)` queries by `orders.id` alone — no `WHERE` clause
  tying the result to the authenticated user in any way.
- `CancelOrder(Request $req)` decrypts `GroupId` from the request and
  updates `orderproducts`/`orders`/`payments` by `GroupId` alone — again,
  no ownership check anywhere in the method body.

On real Laravel, **any authenticated buyer who obtains another buyer's
`orderId` (ViewOrder) or encrypted `cncl_id` (CancelOrder) could view or
cancel that other buyer's order.** This is a genuine, pre-existing
authorization gap in source, not introduced by this migration.

The M4 buyer-orders-slice task explicitly requires: "verify the requested
order belongs to the current buyer" (`/view-order`), "verify ownership
before cancellation" (`/cancel-order`), and lists "buyer A cannot view
buyer B's order" / "buyer A cannot cancel buyer B's order" as mandatory
security tests. This is an **explicit owner instruction to close a real
gap**, not a silent, unauthorized deviation from source. It is
implemented via `orderProducts.buyerId` (the same field `ManageOrders`
itself already filters buyer ownership by in source — not a field this
correction invented for the purpose) in:

- `getOwnedOrderByGroupId(db, groupId, buyerId)` — returns `null` (not
  the order) if the buyer doesn't own it.
- `cancelOwnedOrder(db, groupId, buyerId)` — returns `false` (no write
  performed) if the buyer doesn't own it.

Both are deliberately indistinguishable, from the caller's perspective,
between "order doesn't exist" and "order exists but isn't yours" — no
enumeration surface is introduced by this correction.

---

## 7. Cancellation status value — re-verified, not assumed

`orderSchema.ts`'s own pre-existing header comment (P-03) warns that
admin cancellation writes inconsistent status values across the three
collections (5 to `orders`/`orderProducts`, 4 to `payments`). Re-verified
directly this session against BOTH controllers:

| Controller | orders/orderProducts | payments |
|---|---|---|
| `BuyerController::CancelOrder` (this slice's scope) | **4** | **4** |
| `AdminController` cancel (NOT this slice's scope, `AdminController.php:1352/1355`) | 5 | 4 |

**The buyer cancel path has NO cross-collection inconsistency** — all
three collections receive `4` uniformly. P-03's documented inconsistency
belongs to the separate ADMIN cancel path, which this slice does not
touch. `cancelOwnedOrder` writes `4` to `orders`, `orderProducts`, AND
`payments` — confirmed correct against source, not assumed from the
schema comment's framing (which describes the admin path).

Also re-verified: source performs **no** "already cancelled/completed"
guard — `CancelOrder` unconditionally overwrites `OrderStatus`/
`orderStatus` regardless of the row's prior value. `cancelOwnedOrder`
preserves this exactly — no additional status-transition guard was
added.

---

## 8. `cncl_id` token — encryption mechanism, not byte-compatible with Laravel

Source uses `encrypt($row->GroupId)` / `decrypt($req->cncl_id)` —
Laravel's app-wide `Illuminate\Encryption\Encrypter` (AES-256-CBC + HMAC,
a Laravel-proprietary base64 JSON envelope, keyed by `APP_KEY`).
`src/lib/auth/orderToken.ts` (new this session) implements the
**equivalent security property** (opaque + tamper-evident) using
AES-256-GCM keyed by the existing `SESSION_SECRET` (no new secret
introduced), NOT byte-compatible with Laravel's cipher — see that
module's own header for the full reasoning (no cross-system decode is
ever required, since no Laravel-produced ciphertext is ever decrypted by
this Next.js app and vice versa; same "distinct mechanism, same outcome"
precedent `session.ts` already established for the session cookie).

A missing/invalid/tampered `cncl_id` is rejected cleanly (redirect with a
flash message) rather than reproducing Laravel's own `APP_DEBUG=true`
stack-trace crash on `decrypt()` failure (re-verified: `APP_DEBUG=true`
in `public_html/.env`) — the crash itself carries no fidelity-relevant
behavior worth preserving, same reasoning already applied to B-12 itself.

---

## 9. Tests proving the correction

### Unit + fixture (mocked/seeded fake `Db`, no real MongoDB connection)

- `tests/mongodb/orderOwnership.test.ts` (9 tests) — `getOwnedOrderByGroupId`
  and `cancelOwnedOrder` ownership enforcement, `getOrderGroupIdsForBuyer`
  DESC-ordering and dedup-by-newest-line.
- `tests/services/orderService.test.ts` (12 tests, extended this
  session) — `getBuyerManageOrdersView` product-join + buyer-filtering,
  `getBuyerOrderDetail` ownership enforcement + product-join tolerance
  for a missing product, `cancelBuyerOrder` ownership enforcement.
- `tests/auth/orderToken.test.ts` (6 tests) — round-trip, opacity
  (GroupId not visible in ciphertext), non-determinism (different token
  each call), tamper rejection, garbage-input rejection, wrong-key
  rejection.
- `tests/auth/routeProtection.test.ts` (+3 tests this session) —
  `/manage-orders`, `/view-order/[orderId]` (page-level guard),
  `/cancel-order` (route.ts guards itself independently) all call
  `requireBuyerSession()`.

### Live, against REAL `spaks_dev` data (`npm run orders:verify-live`, `scripts/m4-buyer-orders-live-verify.ts`)

Read-only against two real buyers with real order history (buyerId 102:
11 lines/8 GroupIds; buyerId 19: 3 lines/3 GroupIds — confirmed by a
read-only aggregation this session):

1. `getBuyerManageOrdersView(102)` → 11 real rows returned.
2. `getBuyerOrderDetail` — buyer 102 views their own real order → found,
   correct GroupId/lines/payments.
3. `getBuyerOrderDetail` — buyer 19 attempts buyer 102's real order →
   **rejected (`null`)**.
4. `getBuyerManageOrdersView(19)` → zero overlap with buyer 102's
   GroupIds.

Mutation, against a **synthetic, clearly-out-of-range throwaway order**
(GroupId/legacyId/buyerId = 90000001–90000002, chosen far outside real
data's range — confirmed real `spaks_dev` order legacyIds top out in the
low hundreds), inserted → exercised → deleted in the same run:

5. Wrong buyer attempts cancel → **rejected**, `orderStatus` unchanged.
6. Correct owner cancels → succeeds, `orderStatus` → 4 in all three
   collections.
7. Throwaway documents deleted — `spaks_dev` confirmed left in its
   original state (real buyer 102/19 data never touched by the mutation
   part).

### Live HTTP, against the built app (`npm run build && npm run start`)

| # | Scenario | Result |
|---|---|---|
| 1 | Unauthenticated → `/manage-orders` | 307 → `/login` |
| 2 | Unauthenticated → `/view-order/14` | 307 → `/login` |
| 3 | Unauthenticated → `/cancel-order?cncl_id=x` | 307 → `/login` |
| 4 | Real buyer 102 → `/manage-orders` | 200 |
| 5 | Real buyer 102 → `/view-order/14` (their own real order) | 200 |
| 6 | Buyer 19 → `/view-order/14` (buyer 102's order) | **404** |
| 7 | Buyer 102 → `/view-order/999999` (nonexistent) | **404** |
| 8 | Buyer 102 → `/view-order/notanumber` (invalid, non-numeric) | **404** |
| 9 | Wrong buyer → real `cancel-order` request against a throwaway order | 303, flash "Order not found.", status unchanged |
| 10 | Correct owner → real `cancel-order` request | 303, flash "Order cancelled successfully!!" (exact source text), status → 4 |
| 11 | Invalid/tampered `cncl_id` | 303, flash "Invalid or expired cancel request." |
| 12 | Missing `cncl_id` | 303, same clean rejection |

All 12 scenarios passed as required.

---

## 10. Remaining uncertainty / known limitations

1. **No product match for some real order lines is EXPECTED, not a bug**
   — confirmed this session: `spaks_dev.products` holds 397 documents
   (max `legacyId` 427), a curated development subset, not the full
   production catalog (consistent with this migration's own prior
   precedent — `admin/home`'s dashboard already documented "Demo shows
   the CURATED count, not the real production total"). A real order line
   referencing a `productId` outside that curated set (e.g. `productId`
   715, confirmed absent) correctly renders `product: null` rather than
   throwing — this is the intended tolerant behavior, not a defect
   introduced this session.
2. **Pagination** (source's `->paginate(20)`) is not implemented — flagged
   in §5, not silently dropped; no real account currently needs it.
3. **`$errors` validation bag** — unrelated to this slice, unchanged,
   carried forward from prior M4 phases.
4. **DR-05, rate limiting, DR-04 index name, seller registration** — all
   explicitly out of this slice's boundary per the task's STRICT
   BOUNDARY list; untouched.
5. **The exact original `orders.id`-keyed semantics of `{orderId}` are
   not preserved** — §4a's GroupId-based reinterpretation is a
   documented, deliberate choice, not an oversight, but a future reviewer
   who wanted byte-identical URL-parameter semantics to the (broken)
   original would need to revisit this specific decision. No other
   Laravel route or view ever linked to `view-order/{orderId}` with a
   real `orders.id` value to compare against (confirmed:
   `manage-orders.blade.php` has no such link anywhere), so there is no
   existing "real" URL whose semantics this could contradict.

---

*End of B-12 Resolution record.*
