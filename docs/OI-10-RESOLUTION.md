# OI-10 RESOLUTION REPORT — jQuery Interoperability Architecture

**Issue:** OI-10 — React hydration reverts `theme.js` DOM mutations
**Status:** ✅ **RESOLVED**
**Date:** 2026-08-10
**Author:** Migration Implementer
**Authorization:** Owner — "OI-10 ARCHITECTURAL DECISION — APPROVED", 2026-08-10
**Contract version:** 1.0
**Scope:** OI-10 only. **Milestone 2 was NOT begun.**

---

## 1. ROOT CAUSE

### 1.1 What `theme.js` actually is

`public/assets/js/theme.js` (494 lines) is a **single bare IIFE**:

```js
(function($) {
    "use strict";
    if ($('.wow').length)          { new WOW({...}).init(); }
    if ($('.accrodion-grp').length){ ... }
    if ($('.stricky').length)      { $('.stricky').addClass('original').clone(true)
                                       .insertAfter('.stricky')
                                       .addClass('stricked-menu').removeClass('original'); }
    if ($('.recent-products__carousel').length) { $(...).owlCarousel({...}); }
    ...
})(jQuery);
```

Two properties matter:

1. **No `$(document).ready()` wrapper.** It executes the instant the browser
   parses its `<script>` tag — verified: `grep` finds exactly one `(function($)`
   at line 1 and one `})(jQuery)` at line 495, with no `ready`/`load` handler.
2. **Every widget is guarded by a presence check** (`if ($('.x').length)`).
   If the DOM node is absent at parse time the widget silently never initializes.

Laravel places these scripts at the very end of `<body>` (identical order in
every Blade view, e.g. `resources/views/details.blade.php:605-613`), so the
markup always exists, and nothing subsequently touches it.

### 1.2 The actual failure — NOT what the issue title said

OI-10 was recorded as "hydration reverts `theme.js`'s DOM mutation", which is
directionally right but omits the decisive detail: **jQuery was succeeding.**
Instrumented timeline on `/details` (MutationObserver installed before parse):

```
[247ms]  observer installed (readyState=loading)
[627ms]  ADDED   <NAV class="...stricky">        ← jQuery clone succeeded
[628ms]  ADDED   <DIV class="owl-stage-outer">   ← Owl initialized
[699ms]  --- DOMContentLoaded ---   stricked=1 owlLoaded=1   ✅ MATCHES PRODUCTION
[955ms]  REMOVE  <DIV class="item"> from .recent-products__carousel   ×15
[1148ms] --- load ---               stricked=0 owlLoaded=0   ❌ REVERTED
```

At `DOMContentLoaded` the local DOM was **identical to production**. React
hydration then ran at ~955ms, walked the server-rendered tree, found DOM that
no longer matched its virtual DOM — because Owl had **relocated the `.item`
nodes** into its generated `.owl-stage-outer` wrapper and `theme.js` had
**inserted a `.stricked-menu` clone** — and restored the server's markup,
raising **React error #418** (hydration mismatch).

### 1.3 Root cause, precisely stated

> **A DOM-ownership conflict, not a timing failure.** Both React and jQuery
> claimed the same nodes. jQuery mutated them first; React hydrated second and,
> being authoritative over its own tree, reverted every mutation.

Scripts were never in the wrong order and the markup was never missing. This
distinction determines the fix: reordering scripts or waiting for `ready` would
change nothing, because the reversion happens *after* jQuery has already
succeeded.

---

## 2. ARCHITECTURE CHOSEN

**Run the legacy stack after hydration has completed, then never contradict it.**

```
Server render  →  React hydrates  →  hydration completes
                                          ↓
                                  legacy scripts injected in Laravel order
                                          ↓
                                  jQuery takes ownership permanently
```

React renders the markup and settles; jQuery then mutates it. Because every
page in scope is a **static server component** with no state, no changing
props, and no client-side re-render path, React never re-walks that subtree —
so the mutations stand permanently. (requirements 12, 13)

### Why this is the smallest possible solution

| Alternative | Rejected because |
|---|---|
| Reimplement widgets in React | **Forbidden by F-23** |
| `suppressHydrationWarning` | Explicitly forbidden (req. 16); also only hides the symptom — React still reverts the DOM |
| `dangerouslySetInnerHTML` for widget markup | Removes markup from React's control, but breaks DOM parity and is a far larger change |
| Make widget containers client components | Larger blast radius; still re-renders and re-conflicts |
| Patch `theme.js` to re-init after hydration | **Modifies plugin source** (req. 8); fragile |

The chosen fix changes **no markup, no plugin source, and no widget behavior** —
only *when* the existing scripts run.

---

## 3. FILES CHANGED

| File | Change |
|---|---|
| `src/components/layout/LegacyScriptRunner.tsx` | **NEW** — the interop layer (client component); ~150 lines, mostly the documented rationale |
| `src/components/layout/PublicScripts.tsx` | Nine inline `<script>` tags replaced with `<LegacyScriptRunner />`; visible markup (`.scroll-to-top`) unchanged |

**Nothing else was touched.** Verified:

- Plugin sources byte-identical to the Laravel originals (`cmp`):
  `theme.js`, `owl.carousel.min.js`, `wow.min.js`, `jquery.magnific-popup.min.js` — **all IDENTICAL** (req. 8)
- Laravel source tree: **zero files modified**
- Asset integrity: **2,860 / 2,860 PASSED**

---

## 4. INITIALIZATION ORDER

### 4.1 Original (Laravel)

From `resources/views/*.blade.php` — identical across every view in scope:

```
1. jquery.js                     6. bootstrap-datepicker.min.js
2. bootstrap.bundle.min.js       7. jquery.validate.min.js
3. bootstrap-select.min.js       8. wow.min.js
4. owl.carousel.min.js           9. theme.js   ← initializes everything
5. jquery.magnific-popup.min.js
```

Executed synchronously at parse time, at the end of `<body>`.

### 4.2 Current (Next.js, after this fix)

**The same nine scripts, in the same order**, injected sequentially with
`async = false` to guarantee execution order (req. 3). The only change is
the trigger point: after `useEffect` + two `requestAnimationFrame`s, which
guarantees React's hydration commit has been painted.

`theme.js` still runs last, still initializes every widget itself, still
executes as a bare IIFE. Its internals were not touched.

### 4.3 Network effect: none

Same nine requests, same URLs, same order — **verified 25/25 legacy assets
matched on both `/contact` and `/details`, zero missing, zero extra**. Only
their timing differs, which is not an observable the contract constrains.

---

## 5. jQuery-OWNED DOM

After the handoff, these nodes are jQuery's and React must never touch them:

| Node / mutation | Created by |
|---|---|
| `.stricked-menu` — the cloned sticky `<nav>` | `theme.js:193` |
| `.stricky-fixed` class toggled on scroll | `theme.js:467-471` |
| `.owl-stage-outer`, `.owl-stage`, `.owl-item` wrappers | Owl Carousel |
| Relocation of `.item` children into `.owl-item` | Owl Carousel |
| `.owl-nav`, `.owl-dots` controls | Owl Carousel |
| `.owl-loaded`, `.owl-drag` classes on the container | Owl Carousel |
| `animated` class on `.wow` elements | WOW.js |
| Magnific Popup overlay/wrapper (on open) | Magnific Popup |
| Accordion show/hide state | `theme.js:15-40` |

---

## 6. React-OWNED DOM

Everything server-rendered, up to the moment the effect runs: the full page
markup — `.page-wrapper`, header, `.stricky` **original** nav, footer, all
content sections, and the `.item` nodes **as authored** (before Owl relocates
them).

**The boundary:** React owns the markup *as authored*; jQuery owns *the
mutations it makes to that markup*. The handoff is one-way and happens exactly
once per page load. React never re-renders these subtrees — they are static
server components (no `useState`, no client-side data fetching, no prop
changes).

---

## 7. VERIFICATION RESULTS

### 7.1 Build & static checks (requirements 1-5)

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ PASS |
| `npm run lint` | ✅ PASS |
| `npm run format:check` | ✅ PASS |
| `npm run test` (vitest) | ✅ PASS — 7/7 |
| `npm run build` | ✅ PASS — clean, 10 static routes |
| `npm run assets:verify` | ✅ **2,860 / 2,860 INTEGRITY PASSED** |

### 7.2 Page-height parity vs live production (1440×900)

| Page | Before OI-10 fix | **After** |
|---|---|---|
| about | −20 → 0 (assets) | **0** ✅ |
| contact | 0 | **0** ✅ |
| terms | 0 | **0** ✅ |
| privacy-policy | 0 | **0** ✅ |
| return-policy | 0 | **0** ✅ |
| mother-tincture | 0 | **0** ✅ |
| videos | 0 | **0** ✅ |
| video | 0 | **0** ✅ |
| **details** | **−259** | **0** ✅ |

**ALL 9 PAGES: EXACT HEIGHT PARITY.** `/details` — the page OI-10 broke —
went from −259px to **0**.

### 7.3 Widget behavior parity (`/details`)

| Measure | PROD | LOCAL |
|---|---|---|
| `.stricked-menu` present | 1 | **1** ✅ |
| `.stricky-fixed` at scrollTop=0 | 0 | **0** ✅ |
| `.stricky-fixed` at scrollTop=600 | 1 | **1** ✅ |
| `.owl-loaded` | 1 | **1** ✅ |
| `.owl-item` generated | 27 | **27** ✅ |
| `.owl-nav` + `.owl-dots` | 2 | **2** ✅ |
| `magnificPopup` registered | true | **true** ✅ |
| `WOW` available | true | **true** ✅ |

Sticky navigation, Owl Carousel, WOW and Magnific Popup all behave identically.

### 7.4 Console output (requirement 10)

| Page set | PROD errors | LOCAL errors |
|---|---|---|
| All 9 pages | 0 | **0** ✅ |

**React error #418 is gone.** No hydration warnings, no new errors, and none
suppressed — `suppressHydrationWarning` appears nowhere in the codebase.

### 7.5 Network requests (requirement 11)

| Page | Legacy assets PROD | LOCAL | Missing | Extra |
|---|---|---|---|---|
| /contact | 25 | 25 | **0** ✅ | **0** ✅ |
| /details | 25 | 25 | **0** ✅ | **0** ✅ |

### 7.6 Idempotency (requirements 6, 7)

| Check | Result |
|---|---|
| `<script>` tags after load | 9 (exactly one each) ✅ |
| `.stricked-menu` after reload | **1** — no duplicate nav ✅ |
| `.owl-loaded` after reload | **1** — single init ✅ |
| Page height stable across reload | 1881 → 1881 ✅ |
| Guard flag set | `data-legacy-scripts-installed` present ✅ |
| Duplicate-injection attempt | Blocked by both flag **and** `script[src]` check ✅ |
| Cross-page navigation (`/about` → `/details`) | 9 scripts, 1 clone, 1 owl, **0 console errors** ✅ |

Two independent guards: a document-level flag (survives StrictMode's
double-invoked effects and Fast Refresh remounts) and a per-URL
`document.querySelector('script[src=...]')` check.

### 7.7 Playwright screenshots — 9 failures, cause identified, **NOT OI-10**

`npx playwright test m1-screenshots --project=chromium-desktop` → **9 failed.**
Investigated rather than accepted:

**My initial assumption was wrong.** I expected the M0 baseline to be stale
(captured 2026-08-04, before the asset re-sourcing). It is not: re-capturing
`/about` from live production today produced a file **byte-identical** to the
Aug-4 baseline. Production has not changed. The failures are a **real local
difference**.

Pixel analysis of `/about`: same dimensions (1440×1855), **0.67% of pixels
differ** — under the configured 1% tolerance, but concentrated in four
horizontal bands. Visual inspection shows identical content and styling,
**shifted horizontally**:

| Nav item | PROD x | LOCAL x | Δ |
|---|---|---|---|
| Home | 300 | 318 | +18 |
| About Us | 381 | 396 | +15 |
| Herbs | 487 | 502 | +15 |
| Diseases Catalogue | 568 | 580 | +12 |
| Contact Us | 1106 | 1106 | **0** |

A drift that shrinks to zero at the last item is the signature of **missing
inter-element whitespace** — JSX strips the newlines between `<li>` elements
that HTML renders as significant spaces. This is the **same class of defect
already found and fixed for `/contact` in M1 §13.1 C**, now surfacing in the
shared header/footer.

**Proof it is unrelated to OI-10:** the identical 18px offset reproduces with
**JavaScript disabled**, where no plugin runs at all:

```
PROD   JS-OFF: Home x=300, About Us x=381, Herbs x=487
LOCAL  JS-OFF: Home x=318, About Us x=396, Herbs x=502
```

A pure server-rendered markup/CSS defect. It predates this work, is not caused
by it, and is **out of scope** for OI-10 — raised as **OI-13** rather than
fixed, per NN-2 and the instruction not to widen scope.

---

## 8. REMAINING LIMITATIONS

1. **OI-13 (new) — JSX whitespace in shared header/footer.** Nav and footer
   links sit up to 18px right of production. Server-side markup defect,
   independent of OI-10, blocks V-02 screenshot parity. **Fix is a separate
   task** (M1 gate work). Same root cause as the already-fixed §13.1 C.

2. **Legacy scripts execute later than production.** They run after hydration
   rather than at parse time. Final DOM, network requests and page heights are
   identical; only intermediate timing differs. A user on a very slow
   connection could see unstyled widgets marginally longer than on production.
   No contract dimension (§7.1) constrains intermediate timing.

3. **Scope of validation.** Verified on the 9 M1 pages. `PublicScripts` is
   documented as M1-only; pages loading additional plugins (index/product
   pages, M3+) must port their own script lists — the same `LegacyScriptRunner`
   pattern applies, with a different script array.

4. **`.wow` elements: 0 on both sides** for the pages in scope, so WOW's
   animation path is confirmed *loaded* but not exercised. Needs re-verification
   on an M3+ page that actually uses `.wow`.

5. **Client-side navigation between legacy pages** works (verified `/about` →
   `/details`), but each page currently re-uses the already-loaded scripts
   rather than re-running `theme.js`. For the static M1 pages this is correct
   (full document loads). If M3+ introduces genuine client-side routing between
   plugin-bearing pages, re-initialization will need explicit handling.

---

## 9. F-23 PRESERVATION — CONFIRMED

> **F-23:** Reimplementing jQuery widgets (bxSlider, Owl, Fancybox, Isotope,
> Swiper, noUiSlider, TouchSpin) in React is forbidden.

| Requirement | Status |
|---|---|
| Owl Carousel reimplemented in React? | ❌ **No** — the original `owl.carousel.min.js` runs, byte-identical |
| WOW.js reimplemented? | ❌ **No** — original `wow.min.js` |
| Magnific Popup reimplemented? | ❌ **No** — original plugin |
| `theme.js` behavior reimplemented? | ❌ **No** — the original file executes and does all initialization itself |
| Replaced with React alternatives? | ❌ **No** — zero new dependencies |
| Plugin source modified? | ❌ **No** — all four verified byte-identical via `cmp` |
| Widget markup/selectors/classes/ids/data-attrs changed? | ❌ **No** |
| `suppressHydrationWarning` used? | ❌ **No** — absent from the codebase |
| Hydration checking disabled? | ❌ **No** |
| Console errors hidden? | ❌ **No** — the loader `console.error`s failures explicitly |
| Legacy JS arbitrarily deferred? | ❌ **No** — deferred by exactly one well-defined event (hydration completion), for a documented reason |

**F-23 is fully preserved.** React owns structure; the original jQuery plugins
own their widget behavior, unmodified. No contract change is required, and none
was made.

---

## 10. CONTRACT COMPLIANCE

| Rule | Status |
|---|---|
| **F-23** (no React reimplementation) | ✅ See §9 |
| **NN-5** (rendered DOM must match) | ✅ Final DOM matches; heights exact on 9/9 |
| **NN-2** (no silent changes) | ✅ Owner-approved; OI-13 raised, not silently fixed |
| **F-28** (no caching) | ✅ None added |
| **F-29** (no image handling change) | ✅ None |
| **§5.1** (Blade → RSC, DOM identical) | ✅ |
| **§7.2** (permitted variance) | ✅ Only React's `<div hidden>` and `next-route-announcer` — both 0×0, class-less, non-participating in CSS/JS selectors; zero layout effect (heights identical) |
| Laravel source | ✅ Untouched |

---

## 11. CONCLUSION

**OI-10 is resolved.** The root cause was a DOM-ownership conflict, not a
timing or ordering bug: jQuery initialized correctly and React reverted it.
Deferring the legacy stack until after hydration resolves it with a ~150-line
client component, no plugin modification, and no widget reimplementation.

`/details` — the page OI-10 broke — now matches production **exactly**, with
Owl, sticky nav, WOW and Magnific Popup all behaving identically and **zero
console errors**.

**The architecture is reusable for M3+:** later pages supply their own script
array to the same component.

**M1's gate still cannot close**, on: **OI-13** (new, implementer-actionable)
and **OI-1a/OI-1b** (owner credentials, open since M0). **M3 remains NOT
AUTHORIZED** pending OI-2 and OI-6.

**Milestone 2 was not begun**, per instruction.

---

*End of OI-10 Resolution Report*
