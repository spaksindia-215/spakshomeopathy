# B-16 RESOLUTION — `/shopping-cart` deviation ratified (M5 Cart slice)

**Type:** Owner-authorized deviation from the D-06 default (contract §9.2/
§14 D-06: "reproduce all 17 BROKEN items faithfully"). **Date:** 2026-08-31.
**Task:** M5 (Cart) — the real, session-backed cart makes `/cart-list`'s
content genuinely functional for the first time, which surfaces this
gap's consequence more sharply than the M1-era static-fixture demo did.
**Owner decision:** do NOT reproduce the B-16 crash at `/shopping-cart`;
formally ratify the existing (previously disclosed-in-comments-only,
never formally approved) choice to render the same real cart content
there as at `/cart-list`.

---

## 1. The original Laravel defect (B-16)

**Source (`public_html/app/Http/Controllers/CartController.php:65-68`):**

```php
public function ShopCart()
{
    return view('shopping-cart');
}
```

Bound to both `GET` and `POST /shopping-cart`
(`routes/web.php:44-45`). `shopping-cart.blade.php` unconditionally
references `$items`, `$SubTotal`, `$i`, `$DeliveryPrice` (verified
directly against the view — `@foreach($items as $item)`,
`{{@$SubTotal}}`, etc.) — none of which `ShopCart()` supplies. Every real
request to this route throws an "Undefined variable" error in Laravel
before rendering completes.

The CONTENT-BEARING version of this exact template is only reachable via
the DIFFERENT route `/cart-list` (`CartController::cartList`,
`CartController.php:353-389`), which supplies all four variables
correctly — see blueprint §3.1 rows #26/#35.

## 2. What this project has actually shipped, both M1 and M5

**M1 (2026-08-04-ish, pre-dates the Gate/CR process for this specific
choice):** `CartPageContent.tsx` was built once and reused by BOTH
`src/app/cart-list/page.tsx` and `src/app/shopping-cart/page.tsx` — i.e.
`/shopping-cart` was ALREADY rendering the same populated content as
`/cart-list`, not the B-16 crash. This was disclosed in that file's own
header comment ("a deliberate choice, not a silent fix of B-16") but was
never recorded as a Change Request or an Approved Fix Register entry —
only a code comment, which the state-reconciliation audit's broader
finding pattern (unauthorized-but-disclosed work) would flag if it
re-examined this specific file.

**M5 (this task, 2026-08-31):** `CartPageContent.tsx` was rewired to read
the REAL session cart (`src/lib/cart.ts`) instead of the M1-era static
2-item fixture (`src/lib/demo/cart.ts`). This makes the shared-component
choice materially more consequential: `/shopping-cart` is no longer just
showing a fake, disclosed placeholder — it is now a second, fully
functional URL for the real cart (add/remove/update all work identically
at both routes, since both render the same `CartPageContent` against the
same cookie-backed cart state).

## 3. Owner decision, this session

> **Owner:** homeopathy38@gmail.com
> **Decision:** APPROVED
> **Scope:** B-16 is NOT reproduced. `/shopping-cart` continues to render
> the real, functional cart (identical to `/cart-list`) rather than
> Laravel's undefined-variable crash. This ratifies, retroactively and
> formally, the M1-era implementer's disclosed-but-unapproved choice, and
> extends it to the now-real M5 cart data.
> **Date:** 2026-08-31

Per contract §9.3 (Approved Fix Register) and D-06's "Alternative: approve
specific individual fixes... added to the Approved Fix Register with
defined target behavior":

| Fix ID | Item | Approved behavior change | Approved by | Date | Milestone |
|---|---|---|---|---|---|
| B-16 | `/shopping-cart` (`CartController@ShopCart`) | Render the real, functional cart (same content/behavior as `/cart-list`) instead of reproducing the undefined-variable crash Laravel actually produces at this exact route. | homeopathy38@gmail.com | 2026-08-31 | M5 |

This is the FIRST entry in the Approved Fix Register (`MIGRATION-CONTRACT.md`
§9.3 states it is "empty at contract signing") — recorded here per this
project's established per-decision documentation pattern (`B-12-RESOLUTION.md`
being the closest precedent, itself an Approved Fix Register-eligible
correction for a DIFFERENT BROKEN item, B-12).

## 4. Why NOT reproducing the crash was the selected option

- The crash carries no observable value for a real user or the business —
  it is a pure accident of `ShopCart()` never being wired to fetch cart
  data, with no alternate legitimate meaning to preserve (contrast with,
  e.g., B-09's pincode-save crash, which at least signals "this feature
  was attempted and abandoned" — B-16 signals nothing).
- `/shopping-cart` has no inbound navigation link anywhere in the ported
  UI (verified: no `<a href="/shopping-cart">`/`Link href="/shopping-cart"`
  exists in `PublicHeader.tsx`, `PublicFooter.tsx`, or any cart-adjacent
  component — the app's own "Shop Now"/cart-badge links all point to
  `/cart-list`). The only way a real user reaches `/shopping-cart` is by
  typing the URL directly or an old bookmark/external link — the SAME low
  exposure profile that made D-06's "admin-facing fix like B-09 is
  low-risk" reasoning apply, extended here to a similarly low-traffic
  public route.
- Reverting to the crash would be a REGRESSION from behavior this project
  has shipped (in some form) since M1 — the M1-era implementer's
  reasoning ("populated cart is more useful... than reproducing a blank-
  view bug at literally the front door to checkout") remains sound; this
  resolution's job is to make that reasoning a proper, durable owner
  decision instead of an unapproved code comment, not to second-guess it.

## 5. Scope of this resolution

Covers ONLY B-16 (`/shopping-cart`'s missing view data). Does not affect:

- Any other item in the BROKEN Register (§9.2) — each requires its own
  independent decision per D-06.
- `/cart-list`'s own behavior, which was never BROKEN in source and is
  unaffected by this document.
- Any future change to `CartPageContent.tsx`'s underlying cart logic —
  this resolution concerns ONLY which URL(s) render that component, not
  what the component does.

## 6. Verification

No code change resulted from this session's B-16 decision itself (the
M5 cart-data rewiring that prompted revisiting this decision is covered
separately in `docs/GATE-REPORT-M5-CART.md`). `npm run verify` (typecheck
+ lint + format + test) passes — see that gate report for the full run.
