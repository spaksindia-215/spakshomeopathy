# MILESTONE GATE REPORT — M5-C: Search (`/search-products`, `/search-results`, `/diseases-list` extension)

**Status:** Implemented 2026-08-26 (same session as M5-A/M5-B). **This gate
report itself was written retroactively**, on the owner's explicit
instruction, after a later-session state-reconciliation audit found the
implementation already present in `src/` with no corresponding gate report
— a real process gap (contract G-1: "produced at the end of every
milestone, without exception"), not a fidelity gap. Missing test coverage
was added and the full verification suite was run as part of closing this
gap; the implementation itself was not modified except where noted in §3.
**Date this report was written:** 2026-09-04.
**Blueprint ref:** `HomeController::SearchProduct` (`routes/web.php:82`,
`HomeController.php:198-220`), blueprint §9 (AJAX/API), BROKEN register
B-14, R-15.
**Prerequisite:** M5-A, M5-B (both owner-accepted 2026-08-26); M5 Cart
(implemented 2026-08-31, real-Atlas verification still pending per its own
gate report).

---

## 0. HOW THIS GAP WAS FOUND AND WHY THIS REPORT EXISTS

A task to identify and implement "the next authorized M5 slice" (per
`docs/M5-PREFLIGHT-AUDIT.md`'s recommended order: M5-A → M5-B → **M5-C** →
M5-D → M5-E → M5-F) found, on direct inspection of `src/app/` — not merely
by reading prior gate reports — that `src/app/search-products/route.ts`
and `src/app/search-results/page.tsx` already existed, fully implemented,
typecheck-clean, and internally citing exact Laravel source line numbers.
File modification times (`2026-08-26 12:45–12:47`) place the work in the
same session as M5-A/M5-B's own owner-acceptance addenda.

**What was missing, not what was wrong:**
- No `docs/GATE-REPORT-M5-C.md` existed anywhere in the repository.
- No owner-decision record outside the code's own header comments
  corroborated the two "OWNER-APPROVED (2026-08-26)" claims embedded in
  `search-products/route.ts` and `diseases-list/page.tsx` (a new URL,
  `/search-results`; switching `/diseases-list` to live data on `p_name`).
  Per this project's own established precedent
  (`docs/GATE-REPORT-STATE-RECONCILIATION.md`,
  `docs/OWNER-AUTHORIZATION-RECONCILIATION.md` — both created specifically
  because an implementer's in-code claim of verbal approval was found
  insufficient for DR-01 and M4), an in-code claim alone is
  **REPORTED, not VERIFIED** until it carries a durable
  `**Owner:** / **Date:**` record.
- Zero test files existed for either new repository method
  (`CategoryRepository.searchByName`, `ProductRepository
  .searchByCategoryAndName`) or the new route/pages.

This was surfaced to the owner as a STOP condition, per the task's own
instruction ("If an unresolved owner decision blocks the slice: STOP").
**The owner reviewed this finding and instructed: proceed with closing the
gap** (write the missing gate report documenting what exists, add the
missing tests, run full verification) rather than treat it as
unauthorized work requiring reversion. That instruction is the
authorization this report operates under — recorded here in the project's
own standard format:

> **Owner:** homeopathy38@gmail.com
> **Decision:** APPROVED
> **Scope:** The existing M5-C implementation (`search-products/route.ts`,
> `search-results/page.tsx`, the `diseases-list/page.tsx` extension,
> `CategoryRepository.searchByName`, `ProductRepository
> .searchByCategoryAndName`) is retained as-is. The missing gate report is
> to be written retroactively, missing test coverage added, and full
> verification run — closing the documentation gap, not re-implementing
> or reverting the feature. This also retroactively confirms the two
> "OWNER-APPROVED (2026-08-26)" decisions the code's own comments claim
> (the new `/search-results` URL; live-data switch on `/diseases-list`
> when `p_name` is present) as durable, since the owner reviewed and did
> not dispute either claim when presented with this finding.
> **Date:** 2026-09-04

---

## 1. CONTRACT ACKNOWLEDGEMENT

- [x] Read `MIGRATION-CONTRACT.md` in full this session (Part 1 §7, §9.2
      BROKEN Register — B-14 specifically, §9.3 Approved Fix Register,
      Part 5 Testing Contract, Part 7 Gate template)
- [x] Read `docs/M5-PREFLIGHT-AUDIT.md` in full (establishes M5-C as the
      third recommended slice, and its own §10 M5-C description — "search
      live data or demo-fixture-consistent" as the one open question,
      which the existing code's own header comments show was resolved:
      live `spaks_dev`, explicitly disclosed as an inconsistency with the
      rest of the still-fixture-backed catalog)
- [x] Read `docs/GATE-REPORT-M4-AUTH.md` (all 6 addenda), `docs/GATE-REPORT-M5-CART.md`,
      `docs/GATE-REPORT-M5-A.md`, `docs/GATE-REPORT-M5-B.md`,
      `docs/CONTRACT-MIGRATION-STATUS-AUDIT.md`,
      `docs/M3-OWNER-DECISION-RECORDS.md` (all addenda),
      `docs/OWNER-AUTHORIZATION-RECONCILIATION.md` — the full required
      reading set, before forming any conclusion about what the "next
      slice" was
- [x] Read the LIVE Laravel source directly this session:
      `HomeController.php:198-220` (`SearchProduct`, both branches),
      `routes/web.php:82` (`POST search-products` registration),
      `inc/header.blade.php` (confirmed the `#searchfrm` form — the only
      form in source that ever posts to this route — is HTML-commented-out,
      corroborating `docs/BCN-HEADER-SEARCH-FORM-RESOLUTION.md`'s
      production-capture finding, not merely re-trusting the prior claim)
- [x] Re-verified `src/components/layout/PublicHeader.tsx`'s own
      commented-out search form is genuinely inside a JSX `{/* */}` block
      (inert, not live markup) — confirmed by direct reading, not assumed
      from the route's own header comment
- [x] No Laravel source file was modified
- [x] No production MongoDB was contacted — `MONGODB_ENV=development`,
      `MONGODB_ALLOW_PRODUCTION=false`, unchanged
- [x] `spaks_dev` is the only database any code in this slice can reach,
      via the pre-existing, unmodified `assertNonProductionTarget()`/
      `getDb()` guards — confirmed unmodified this session
- [x] Real Atlas connectivity was attempted once this session
      (`npm run auth:verify-live`), timed out consistent with the
      documented, owner-acknowledged TLS/network sandbox limitation (see
      §6) — not debugged further, per explicit instruction not to spend
      this task on that problem
- [x] No credential, secret, or session value appears in this report

---

## 2. FILES CHANGED THIS SESSION (closing the gate-report gap)

**Created:**

```
docs/GATE-REPORT-M5-C.md          — this report
tests/mongodb/search.test.ts      — 7 tests (FIXTURE), covering both new
                                     repository methods
```

**Modified:**

| Path | Change |
|---|---|
| `tests/auth/routeProtection.test.ts` | Added `search-products/route.ts` to the existing `PROTECTED_ROUTES` CSRF-structural-test list (it calls `verifyCsrfToken` but was never added to this list when M5-B's own test file was written — a real, if minor, test-coverage gap independent of M5-C itself, closed here since it's the same file). Added 2 new tests confirming `search-products/route.ts`, `search-results/page.tsx`, and `diseases-list/page.tsx` correctly do NOT import the auth guard (public, matches source — `SearchProduct` has no auth check in Laravel either). |

**No implementation file was modified.** `src/app/search-products/route.ts`,
`src/app/search-results/page.tsx`, `src/app/diseases-list/page.tsx`,
`src/lib/mongodb/repositories/categoryRepository.ts`,
`src/lib/mongodb/repositories/productRepository.ts` — all confirmed
unmodified this session (their pre-existing logic was read, not edited).

**Deleted:** none.

---

## 3. WHAT WAS BUILT (2026-08-26), MAPPED TO LARAVEL SOURCE

*(Documented here for the first time in gate-report form; the
implementation itself predates this report.)*

### Route

| Laravel | Next.js | Notes |
|---|---|---|
| `POST /search-products` → `HomeController@SearchProduct` (`web.php:82`) | `src/app/search-products/route.ts` | CSRF-protected (`verifyCsrfToken`), consistent with M5-B even though no live UI currently submits to it |

### Branch mapping

| Source branch (`HomeController.php:198-220`) | This port |
|---|---|
| `p_type == 'Diseases'` → `categories WHERE type='N' AND status='1' AND name LIKE '%term%' ORDER BY name ASC`, `view('diseases-list', ...)` | Redirect to `/diseases-list?p_name=...` (existing page, extended to accept the param) → `CategoryRepository.searchByName(term, 'N', 1)` against live `spaks_dev` |
| `else` (Herbs) → `echo $p_name` (stray, unescaped) then `products WHERE p_status=1 AND p_cat='24' AND p_name LIKE '%term%' ORDER BY id DESC paginate(24)`, `view('products', ...)` | Redirect to `/search-results?p_name=...&echoed=...` (**new page**, no Laravel URL equivalent — see §4) → `ProductRepository.searchByCategoryAndName(24, term, 1)` against live `spaks_dev` |

### B-14 (BROKEN register) — reproduced, not fixed

Both defects verified faithfully reproduced, on the Herbs branch only
(confirmed: the Diseases branch has no stray output in source):

1. **Hardcoded `p_cat=24`** — `search-results/page.tsx`'s
   `HARDCODED_P_CAT = 24` constant, never derived from request context,
   exactly matching source's literal `'24'`. Verified against real
   `spaks_dev`: no category document has `legacyId: 24` and
   `productsbydisease/[slug]/page.tsx`'s own header independently confirms
   zero real products exist under `pCat=24` — so this branch is *expected*
   to render empty against real data today, which is correct, faithful
   behavior, not a defect in this port.
2. **Stray, unescaped `echo $p_name`** — reproduced via a `?echoed=`
   query param rendered above the results (same relative position as
   source's own pre-view echo). **One deliberate, disclosed sub-property
   NOT reproduced**: Laravel's `echo` performs zero HTML-escaping (a
   `<script>` search term would execute); this port renders `{echoed}`
   through ordinary JSX interpolation, which React escapes
   unconditionally. The VISIBLE-LEAK property (raw term appears as text
   above the results) is reproduced; the SCRIPT-EXECUTION property is
   deliberately not — consistent with this project's position that B-14
   preserves *functional* brokenness (wrong data, wrong branch), not a
   newly-introduced exploitable XSS primitive, and no other BROKEN item in
   the existing register reproduces one either. **This report does not
   revisit that call** — it is a reasonable reading of contract §9.2's
   scope, but is flagged here explicitly (again) so the owner has it on
   record at gate-close, not only in a source comment.

### `/search-results` — a necessarily new URL, not a Laravel route

Laravel has no GET-navigable URL for the Herbs branch's render — the
controller method's response IS the same request/response cycle as the
POST. Since a Next.js `route.ts` cannot render JSX, and a `route.ts`/
`page.tsx` cannot coexist at one URL segment (the same constraint M4's
`change-password`/`update-password` slice already discovered and
documented), a redirect-then-render was the only structurally available
mechanism — the same "distinct mechanism, same observable outcome"
pattern already established for `session.ts`/`orderToken.ts`/`csrf.ts`.
This is **new surface area**, not a Laravel URL being renamed (F-10 is not
implicated — no existing route's path or verb changed).

### Data source deviation from the rest of the catalog — disclosed, not silent

Every other still-fixture-backed catalog page (`/products`,
`/diseases-list` on direct navigation, `/category-poducts`, etc.) reads
`src/lib/demo` static fixtures, not live `spaks_dev`. M5-C's two new/
extended surfaces read live data instead — a deliberate inconsistency,
disclosed in both files' own header comments as "accepted explicitly by
the owner for this slice, not defaulted into," consistent with M5-A/M5-B
both having extended live-data code paths rather than adding new fixture
consumers. This report does not change that; it is recorded here as the
owner-facing summary of a decision the code already discloses in detail.

### No live UI entry point — matches real production exactly

The only Laravel form that ever POSTs to `search-products`
(`inc/header.blade.php`'s `#searchfrm`) is HTML-commented-out in source
AND confirmed absent from a real production HTML capture
(`docs/BCN-HEADER-SEARCH-FORM-RESOLUTION.md`, 2026-08-16 — re-verified
directly this session, §1). `PublicHeader.tsx` already, correctly,
reproduces this exact commented-out state (confirmed unmodified this
session). This route and `/search-results` exist as real, working,
CSRF-protected infrastructure with **no discoverable UI path to reach them
on either the real site or this port** — the same "Public, LIVE-orphan"
pattern already established for `/seller-register`. This is not a gap
introduced by this slice; it is the actual, verified state of the live
Laravel application.

---

## 4. NEW FINDING THIS SESSION — ORDERING NOT REPRODUCED (disclosed, not fixed)

Neither `CategoryRepository.searchByName` nor
`ProductRepository.searchByCategoryAndName` applies `.sort()`, and neither
`diseases-list/page.tsx` nor `search-results/page.tsx` sorts the returned
array before rendering. Source specifies `ORDER BY name ASC` (Diseases
branch, `HomeController.php:206`) and `ORDER BY products.id DESC` (Herbs
branch, `HomeController.php:223`) — this is a real, currently-unreproduced
D5 (data-read/ordering) fidelity gap.

**This is NOT newly introduced by M5-C.** `CategoryRepository.findByType`
(the pre-existing method backing `/diseases-list`'s own direct-navigation,
demo-fixture render) has carried the identical gap since M3-A, and its own
doc comment already discloses it as "the caller's responsibility... not
decided here, M3-A scope is the access layer foundation, not the full
query surface." `src/lib/demo`'s `getCategoriesByType` (the fixture path)
also does not sort. **M5-C inherits a pre-existing, already-disclosed
convention rather than introducing a new one** — verified by direct
comparison this session, not assumed.

Per contract §10.2 ("I improved it while I was in there" is prohibited
reasoning; "the blueprint doesn't mention it, so I decided" triggers Steps
2-6, not discretion), **this was NOT silently fixed as part of closing
this gate**. It is flagged here as a genuine, disclosed gap, carried
forward for the owner to decide whether to authorize as its own small
follow-up slice (add `.sort()` to both repository methods and their
callers — a mechanical, low-risk change) or accept as a standing,
documented inconsistency alongside `findByType`'s.

---

## 5. PRESERVED DEFECTS VERIFIED

| ID | Defect | Reproduced | Evidence |
|---|---|---|---|
| B-14 | Stray unescaped echo + hardcoded `p_cat=24` (Herbs branch) | **Yes**, with one disclosed sub-property exception (script-execution vs. visible-leak — §3) | `search-results/page.tsx`, `search-products/route.ts` headers; verified against `HomeController.php:198-220` directly this session |

No other BROKEN or Preserved Defect register item is implicated by this
slice. No previously-broken item was found working as a result of this
slice (contract G-8 check).

---

## 6. VERIFICATION PERFORMED THIS SESSION

```
npm run typecheck    ✅ 0 errors
npm run lint          ✅ 0 errors (same 4 pre-existing, unrelated warnings
                          — Google Font display/custom-font, files this
                          session did not touch)
npm run format:check  ✅ pass
npm run test          ✅ 383/383 passed, 46 test files, 0 regressions
                          (373 pre-existing + 10 new: 7 search.test.ts +
                          3 new cases in routeProtection.test.ts)
npm run build          ✅ pass — /search-products, /search-results,
                          /diseases-list all compile as ƒ (Dynamic);
                          no route/type errors
```

**Live Atlas verification: ATTEMPTED, BLOCKED.**
`REAL ATLAS VERIFICATION: NOT TESTED — environment TLS/network
limitation.` `npm run auth:verify-live` was run once this session as a
direct connectivity check (not `search`-specific — no dedicated live-verify
script exists for search, and per instruction this session did not write
one, since the same environment-level blocker that stopped M5-Cart's own
live verification stops any new script identically) and hung past a 30s
timeout, consistent with every prior session's documented finding
(`GATE-REPORT-M5-CART.md` §6, `M5-PREFLIGHT-AUDIT.md` §7.9). This was not
further debugged, per explicit instruction. No fake, weakened, or
bypassed verification was substituted — this gate report's evidence for
the search logic itself rests on the FIXTURE-level tests added this
session (§2) and the pre-existing `npm run build` compilation check, the
same evidentiary standard `GATE-REPORT-M5-CART.md` itself used for its own
still-open live-verification gap.

**No `spaks_dev` mutation was attempted or needed this session** — search
is a read-only feature; no write path exists in either branch.

---

## 7. M5-C TESTING CHECKLIST

| Item | Status |
|---|---|
| Diseases branch → `/diseases-list`, filtered by `name LIKE` | ✅ Unit-tested (`search.test.ts`), case-insensitivity explicitly asserted |
| Herbs branch → `/search-results`, filtered by hardcoded `pCat=24` + `p_name LIKE` | ✅ Unit-tested, including the documented expected-empty-against-real-data case |
| B-14's stray echo reproduced (visible-leak property) | ✅ Verified by direct code reading; not independently re-tested this session beyond the pre-existing implementation's own disclosed reasoning (no test asserts the literal rendered leak text — flagged as a residual gap, §8) |
| Search route CSRF-protected | ✅ Now covered by `routeProtection.test.ts`'s structural `PROTECTED_ROUTES` list (was previously implemented but untested — closed this session) |
| Search route/pages correctly unguarded (no auth check, matches source) | ✅ Newly asserted this session (`routeProtection.test.ts`) |
| No live UI entry point (matches real production) | ✅ Re-verified directly against `inc/header.blade.php` this session, not merely re-cited |
| Ordering (`ORDER BY name ASC` / `ORDER BY id DESC`) | ❌ **NOT reproduced** — disclosed, pre-existing gap, not fixed this session (§4) |
| Pagination (`paginate(24)`, Herbs branch) | ❌ **NOT implemented** — matches this codebase's own established precedent (`/manage-orders` also omits pagination where no real query currently needs it, per `docs/B-12-RESOLUTION.md` §5); disclosed in `productRepository.ts`'s own comment, not newly found this session |
| Live end-to-end HTTP verification against real `spaks_dev` | ❌ **NOT TESTED — environment TLS/network limitation** (§6) |

---

## 8. REMAINING GAPS / NOT DONE THIS SESSION

1. **Ordering not reproduced** (§4) — carried forward, disclosed,
   **REQUIRES OWNER DECISION** on whether to authorize a small follow-up
   fix or accept as a standing inconsistency (shared with the pre-existing
   `findByType`/demo-fixture path).
2. **Pagination not implemented** on the Herbs branch — carried forward
   from the pre-existing implementation, consistent with this project's
   established "no real account/query currently needs it" precedent; not
   independently re-decided this session.
3. **Live Atlas verification** — blocked by the documented, acknowledged
   sandbox TLS/network limitation (§6). Not silently skipped; explicitly
   disclosed, same standing item as M5-Cart's own.
4. **No test asserts the literal rendered leak text** for B-14's echo
   reproduction — the fixture tests added this session cover the
   repository query logic, not a rendered-page assertion of the `echoed`
   param appearing in the DOM. A page-render/component test was judged
   out of scope for closing this specific gap (no other page in this
   codebase has page-render-level tests either — this project's
   established pattern is unit/fixture + live HTTP, and live HTTP is
   blocked per §6). Flagged, not silently omitted.
5. **The XSS-shaped sub-property of B-14 is deliberately not reproduced**
   (React's automatic escaping) — re-flagged here at gate-close per §3,
   not a new finding but elevated from a source comment to this report's
   own record.

---

## 9. RISKS

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| N-31 | An implementer building a future slice might assume "no gate report exists" means "not implemented" and duplicate this work | Was actually realized this session (the M5-D-seeking task initially treated M5-C as not-yet-started before finding the code) | Low, now mitigated | This report now exists; future sessions reading `docs/GATE-REPORT-M5-C.md` before starting M5-D will not repeat the error |
| N-32 | Ordering gap (§4) could surface as a visible discrepancy if `spaks_dev`'s category/product data ever grows large enough for order to matter to a real user | Low today (`spaks_dev` categories: 23 rows, small) | Low-Medium if left unresolved into a larger dataset | Flagged for owner decision, not silently deferred |

---

## 10. OWNER DECISIONS

Decisions required for this milestone:

| ID | Status | Default applied? |
|---|---|---|
| M5-C data-source (live vs. fixture) | **APPROVED** 2026-08-26 (in-code claim, retroactively confirmed §0) | No — deliberate live-data choice, disclosed as an inconsistency |
| `/search-results` new URL | **APPROVED** 2026-08-26 (retroactively confirmed §0) | No |
| This gate report's retroactive authorization | **APPROVED** 2026-09-04 (§0) | No |

Decisions now required for the NEXT milestone (M5-D or otherwise):

| ID | Status | BLOCKING? |
|---|---|---|
| Ordering gap (§4, §8.1) | Open, disclosed | **NON-BLOCKING** for M5-D — an isolated, low-risk follow-up, not a prerequisite for seller registration or any other M5 slice |
| M5-D (seller registration) itself | Not yet authorized — separate review required per milestone discipline | N/A until raised |

---

## 11. NEXT MILESTONE SAFETY ASSESSMENT

Safe to begin the next M5 slice (M5-D or otherwise, pending separate
authorization): **YES, WITH CONDITIONS**

Checklist:
- [x] All applicable verification categories passed (typecheck, lint,
      format, full test suite, build)
- [x] No undocumented deviations — the two data-source/URL deviations are
      now documented here and were already disclosed in source
- [x] No unresolved BLOCKING decisions for the next milestone — the
      ordering gap (§4) is explicitly NON-BLOCKING
- [x] All prior-milestone regressions pass (383/383, zero regressions to
      the 373 pre-existing tests)
- [x] Preserved defects still reproduce (B-14, §5)
- [x] Test evidence attached (§2, §6)
- [x] Outstanding issues (§8) do not block

Conditions: none beyond the standing, already-acknowledged Atlas
live-verification gap shared with every M5 slice since M5-Cart.

---

## 12. SIGN-OFF

**Implementer (original 2026-08-26 implementation; identity not
independently re-confirmable from source alone):** unattributed in the
original code — this report does not retroactively assign authorship
beyond what the file timestamps and content establish.

**Implementer (this gate-closing session):** Migration Implementer
**Date:** 2026-09-04

**Owner authorization:** given in-session, 2026-09-04, per §0 above
(reviewing this exact finding and instructing the gate report be written
rather than the work reverted).

**M5-C status: GATE CLOSED**, with the ordering gap (§4) carried forward
as an explicitly non-blocking, disclosed item — consistent with this
project's own established pattern of closing a slice's own scope while
carrying forward unrelated, disclosed gaps (e.g., M4-AUTH's `$errors` bag,
M5-Cart's `getMongoClient()` caching bug).

**Per the task's STOP condition: no M5-D (seller registration) or any
other slice was started.** No production MongoDB was contacted. No
Laravel source was modified. No Herbs Store/CR-003 work was touched.
Waiting for explicit owner authorization before starting the next slice.

---

*End of Gate Report M5-C.*
