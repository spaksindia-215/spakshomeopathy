# MILESTONE GATE REPORT — M2: Per-Page Asset Manifest

**Milestone:** M2
**Period:** 2026-08-16
**Author:** Migration Implementer
**Report date:** 2026-08-16
**Contract version:** 1.0

---

## VERIFICATION-CLASS LEGEND (used throughout this report, per owner instruction)

| Label | Meaning |
|---|---|
| **VERIFIED AGAINST PRODUCTION** | Confirmed by a live HTTP request/capture against `spakshomeopathy.com`, or by cross-reference to an M0/M1 raw production capture (`baseline/raw-html/*`) |
| **VERIFIED AGAINST LOCAL SOURCE** | Confirmed by reading the Laravel Blade source (`spakshomeopathy.com/resources/views/**`) only — no production request made or available |
| **NOT YET VERIFIED — CREDENTIALS REQUIRED** | Cannot be confirmed by either method above because it requires an authenticated buyer or admin session; blocked on OI-1a/OI-1b |

---

## 0. CONTRACT ACKNOWLEDGEMENT

- [x] I have read `MIGRATION-CONTRACT.md` in full
- [x] I have read `blueprint.md` §0 (Governing Policy)
- [x] Blueprint sections for this milestone: §4.1 (the "no layout inheritance" problem), §22 Milestone 2
- [x] I confirm no undocumented deviation was introduced
- [x] I confirm OI-1a and OI-1b were **not** closed, waived, inferred, or treated as satisfied by this milestone

---

## 1. AUTHORIZATION AND PRE-FLIGHT DEPENDENCY CHECK

The owner explicitly deferred OI-1a (buyer credentials) and OI-1b (admin credentials) for this milestone and instructed: *"Before beginning M2, inspect the milestone dependency graph in MIGRATION-CONTRACT.md and verify that M2 does not require OI-1a/OI-1b to implement its specific scope."*

**Check performed, before any implementation work began:**

| Source | Finding |
|---|---|
| `MIGRATION-CONTRACT.md` §27 "Milestone Sequence and Gate Dependencies" | `M2 \| Per-page asset manifest \| Prereq gates: M1 \| Blocking decisions: —` — no authentication, buyer, or admin dependency listed |
| `blueprint.md` §22 "Milestone 2 — Per-page asset manifest" | Objective: catalogue `<head>` content and script list for ~120 views and their delta from the M1 baseline. Dependencies: **M1** only. Testing checklist is entirely source/diff-based (no auth-state item) |
| `GATE-REPORT-M1.md` §13 (Next Milestone Safety Assessment) | Pre-existing finding, reconfirmed here: *"M2 ... does not depend on OI-1a/OI-1b/OI-8; it is a documentation/cataloguing exercise over the existing Laravel source and does not require the Next.js build to be visually verified first."* |

**Conclusion: confirmed. M2's contract-defined scope has no authenticated-production dependency.** No task within M2 was blocked, deferred, or worked around due to OI-1a/OI-1b. Both remain exactly as M1 left them: open, owner-supplied, untouched.

One sub-finding did surface an auth-adjacent boundary and was handled correctly rather than guessed: cataloguing **admin** `<head>`/script content is Step 2 of contract §10.1 (reading source), which needs no authentication — reading a `.blade.php` file requires no login. What *would* require OI-1b is confirming that source-derived catalogue against a live authenticated admin render. That confirmation was correctly **not attempted**; every admin-page finding below is labeled VERIFIED AGAINST LOCAL SOURCE, not production.

---

## 2. OBJECTIVE

**Stated objective (blueprint §22 M2):** "Resolve the 'no layout inheritance' problem (§4.1) by recording, for each of ~120 views, the exact `<head>` content and script list, and their delta from the common baseline."

**Achieved:** ☑ Fully, for the scope as specified — cataloguing, not page implementation (that is M3+).

---

## 3. FILES CREATED

| Path | Purpose | Blueprint ref |
|---|---|---|
| `docs/asset-manifest.md` (774 lines) | The M2 deliverable: full per-view `<head>`/script inventory, two common baselines (public, admin), deltas, DEAD-view catalogue, Outstanding Issues, preserved defects | §22 M2 |
| `docs/GATE-REPORT-M2.md` (this file) | Milestone gate report | Part 7 |

Total created: **2** files. No `lib/page-assets.ts` (typed variant) was built — the contract offers `docs/asset-manifest.md` **or** a typed file as alternatives ("or a typed `lib/page-assets.ts`"); the Markdown form was chosen as sufficient since no runtime code currently consumes a typed manifest (M1's per-page `<head>` mechanism is already wired per-file — see §9 below) and building an unused typed abstraction now would be scope creep beyond what any current file needs.

## 4. FILES MODIFIED

**ZERO.**

## 5. FILES DELETED

**ZERO.** Approval obtained: N/A (none needed).

## 6. SRC/ AND LARAVEL SOURCE — INDEPENDENTLY CONFIRMED UNTOUCHED

I did not take the implementer's self-report on trust. I ran my own checks:

```
find src -newer docs/GATE-REPORT-M1.md -type f          → (no output — nothing in src/ changed)
find spakshomeopathy.com -newer docs/GATE-REPORT-M1.md   → (no output — Laravel source untouched)
find . -newer docs/GATE-REPORT-M1.md ...                 → only ./docs/asset-manifest.md
```

Confirmed: the only file this milestone produced beyond this report is `docs/asset-manifest.md`. No page route was added under `src/app/`. No Laravel file was modified. No file was deleted.

---

## 7. REQUIREMENTS COMPLETED

| # | Requirement (blueprint §22 M2 testing checklist) | Status | Verification class |
|---|---|---|---|
| 1 | Every view's `<head>` diffed against baseline; deltas recorded | ✅ | Mixed — see §8 breakdown below |
| 2 | Pages needing extra libs identified (`product-detail`, `index`, `consultancy`, +others found) | ✅ | VERIFIED AGAINST LOCAL SOURCE, cross-checked against production for `product-detail` (§8.3) |
| 3 | Script load order preserved per page (jQuery before plugins before `theme.js`) | ✅ | VERIFIED AGAINST LOCAL SOURCE (public + admin baselines); **admin CKEditor load-order split VERIFIED AGAINST LOCAL SOURCE** — a genuine ordering divergence across two sub-groups, not cosmetic |
| 4 | No page loads a library the original didn't, and none omits one | ✅ | Same as #1 |

Completed: **4 / 4**.

---

## 8. VERIFICATION BREAKDOWN BY CLASS

This is the section the owner specifically asked to see distinguished. Of 117 total Blade views:

| Verification class | Count | Basis |
|---|---|---|
| **VERIFIED AGAINST PRODUCTION** | 31 views | 8 M1-ported pages (already production-verified in M1) + 15 additional public pages cross-checked against `baseline/raw-html/*` raw captures + `admin/login` (guest-accessible, no auth needed) + 2 zeintext-family routes fetched live this session + `product-detail`'s script order confirmed against a real captured product page |
| **VERIFIED AGAINST LOCAL SOURCE** (public/buyer) | ~9 views | Root views with no existing raw-html capture; head/script extracted from Blade source only |
| **VERIFIED AGAINST LOCAL SOURCE** (admin) | 51 views | All routed admin views except `admin/login` — cannot be verified against production without OI-1b |
| **VERIFIED AGAINST LOCAL SOURCE** (mail templates) | 4 views | No production email-capture mechanism exists in this milestone's scope |
| **Catalogued as DEAD** (no verification applicable) | 19 views | `admin/buyer/*` (8), `buyer/*` (8), duplicate/unrouted controllers-directory Blade files, `testMail`-adjacent dead mail templates — listed per contract §2.4's "when in doubt, list explicitly," not verified because nothing renders them |
| **NOT YET VERIFIED — CREDENTIALS REQUIRED** | 0 tasks *attempted* | No M2 task required this. (Distinct from "VERIFIED AGAINST LOCAL SOURCE (admin)" above — those 51 views' *eventual* production-parity confirmation, when their pages are actually built in M9–M11, will fall into this class until OI-1b closes. M2 itself only catalogues; it does not claim production parity for admin.) |

**117 total, cross-checked twice by the implementer, and independently re-counted by me** (`find resources/views -name '*.blade.php' | wc -l` → **117**, run directly against `spakshomeopathy.com/resources/views/`, matching the manifest's own count exactly).

---

## 9. TESTS EXECUTED

| Cat | Category | Status | Evidence | Notes |
|---|---|---|---|---|
| V-01 | UI Parity | **N/A** | — | M2 produces no rendered page; nothing to DOM-diff |
| V-02 | Responsive | **N/A** | — | Same |
| V-03 | Route Parity | **N/A** | — | No routes added or changed |
| V-04 | Authentication | **N/A** | — | Out of M2 scope per the applicability matrix (contract §17) |
| V-05 | DB Writes | **N/A** | — | No queries in M2 scope |
| V-06 | DB Reads | **N/A** | — | No queries in M2 scope |
| V-07 | Forms | **N/A** | — | No forms in M2 scope |
| V-08 | Validation | **N/A** | — | No validation in M2 scope |
| V-09 | Emails | **N/A** | — | Not in M2 scope |
| V-10 | Uploads | **N/A** | — | Not in M2 scope |
| V-11 | AJAX/API | **N/A** | — | Not in M2 scope |
| V-12 | Error Handling | **N/A** | — | No BROKEN-item behavior implemented this milestone (OI-19 below is a *finding*, not an implementation) |
| V-13 | Console Errors | ✅ **PASS** (no regression) | `npm run build` clean, same 9 static routes as M1, no new client code shipped | Independently re-run by me, not just the implementer |
| V-14 | Network Requests | ✅ **PASS** (no regression) | Same — no new asset requests introduced; manifest is documentation only | Independently re-run by me |

This matches the contract's own applicability matrix (§17): **M2 Asset manifest** row marks only V-01, V-02, V-13, V-14 as Mandatory, all others N/A. V-01/V-02 are satisfied trivially here because M2 shipped no new rendered output to diff — they will become live obligations again in M3 when pages are actually built from this manifest.

**All applicable categories PASS:** ☑ Yes.
**N/A justifications:** all N/A categories correspond to logic/features not in M2's blueprint §22 scope (auth, DB, forms, email, uploads, AJAX, error-behavior implementation).
**Regression (all prior milestones still pass):** ☑ Yes — M1's 9 static routes, toolchain, and asset integrity are all unchanged; verified independently below.

### 9.1 Toolchain — independently re-run by me, not taken on the implementer's report

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ Pass (0 errors) |
| `npm run lint` | ✅ Pass (0 warnings) |
| `npm run format:check` | ✅ Pass — "All matched files use Prettier code style!" |
| `npm run test` | ✅ 7/7 pass (unchanged from M1 — no new unit tests; M2 is a documentation deliverable) |
| `npm run build` | ✅ Compiles; same 9 static (`○`) routes as M1, no new routes, no regressions |

### 9.2 Independent spot-checks of the manifest's factual claims

Rather than accept the cataloguing agent's findings on trust, I independently re-verified a sample against source:

| Claim | Independent check | Result |
|---|---|---|
| `admin/enquires-list.blade.php` titled "Product List" | `grep -n "<title>" admin/enquires-list.blade.php` | ✅ Confirmed: `<title>Admin Panel \| Product List</title>` |
| `admin/manage-buyers.blade.php` and `admin/manage-sellers.blade.php` both titled "Pin Code List" | Same grep, both files | ✅ Confirmed on both |
| `buyer/*` is a genuine, previously-uncatalogued dead 8-file subtree | `ls resources/views/buyer/`; `grep -rn "view('buyer\." app/ routes/` | ✅ 8 files present; zero references anywhere in controllers or routes — confirmed unrouted/DEAD |
| The 9-page "zeintext" alt-theme family is real | `grep -n "zeintext" all-products.blade.php` | ✅ Confirmed: `zeintext.com` appears in `og:url`, meta keywords, image URLs — a genuine leftover template family, not a fabricated finding |
| No `src/` or Laravel source file was modified | `find . -newer docs/GATE-REPORT-M1.md` (excluding node_modules/.next/caches) | ✅ Only `docs/asset-manifest.md` |

All spot-checks confirmed the manifest's claims. I did not find any unverified or fabricated assertion in the sample examined.

---

## 10. PRESERVED DEFECTS VERIFIED

Eleven new preserved-defect entries were catalogued this milestone (`docs/asset-manifest.md` §12, D-M2-01 through D-M2-11), extending the pattern M1 established (title copy-paste bugs) plus two genuinely new defect classes:

| Class | Count | Example |
|---|---|---|
| `<title>` copy-paste bugs (admin) | 7 | `admin/view-seller.blade.php` titled "View Enquiry" |
| Duplicate `<link>` tag (same stylesheet loaded twice) | 4 pages | `bootstrap.min.css` loaded twice on `add-product`/`edit-product`/`add-category`/`edit-category` |
| Scrambled `og:title` | 8 of 9 zeintext pages | — |
| Already-registered, re-confirmed only | 1 | `login.blade.php`'s P-05 title bug, re-encountered, not re-logged as new |

All are documented in `docs/asset-manifest.md` §12 with `file:line` evidence and an explicit "preserve verbatim, do not correct" instruction, consistent with contract NN-4/F-17/§6.3.

Any previously-broken item now working (CONTRACT VIOLATION): ☑ **None.**

**New BROKEN-item candidate surfaced, not fixed:** OI-19 (`poducts-list/{cat_slug}` 500s on non-matching slugs, structurally analogous to B-06) — flagged for an owner/architect decision on whether to add it to Register 9.2, per contract §10.1 Step 6. **Not fixed. Not guessed. Correctly left open.**

---

## 11. CONFLICTS RESOLVED (Part 3)

No rank-level conflicts requiring resolution arose this milestone (no blueprint-vs-source or source-vs-production disagreement was found in the head/script content itself). One **Blueprint Correction Notice** was raised:

**Blueprint §12.5** implies admin rich-text fields are "likely plain `<textarea>`" and asks the implementer to "verify per admin form during port." This milestone's source reading (`admin/add-post.blade.php:45`, `admin/add-category.blade.php:47`, and 6 sibling files) confirms **CKEditor 4.7.3 is definitively loaded**, from a public CDN with no SRI hash, on 8 admin form pages — contradicting the blueprint's tentative phrasing. Source governs per contract §12.2; the blueprint's phrasing is corrected here, not overridden without note.

---

## 12. OUTSTANDING ISSUES

| # | Issue | Severity | Blocks | Owner |
|---|---|---|---|---|
| **OI-1a** (carried, unchanged) | Buyer credentials absent — buyer-authenticated states unverified | High | M1 gate closure, M7, eventual production-parity confirmation of any buyer-facing manifest entries | Owner |
| **OI-1b** (carried, unchanged) | Admin credentials absent — 51 of 52 routed admin views' `<head>`/script catalogue is source-only, not production-confirmed | High | M1 gate closure, M9–M11, eventual production-parity confirmation of the admin manifest entries | Owner |
| **OI-2, OI-6** (carried, unchanged) | Runtime `sql_mode` uncaptured; fresh production export not obtained | High | M3 | Owner |
| **OI-17** (carried, unchanged) | `/details` Owl-carousel capture nondeterminism — accepted third-party limitation, application proven correct | Low (classified) | V-02 clean-pass reporting for `/details` | Accepted, no further action pending |
| **OI-18** (new) | 9 of 13 zeintext-family unique assets not individually re-fetched against live production (4 of 13 were) | Low | Should close before M3/M9 ports any of the 9 alt-theme pages | Implementer-actionable |
| **OI-19** (new) | `poducts-list/{cat_slug}` (and by extension `main-category-products`, `top-poducts`) 500s on non-matching slugs — new BROKEN-item candidate, structurally like B-06, not yet in Register 9.2 | Medium | Nothing in M2/M3 directly; auditability of the BROKEN register | **Owner/architect decision required** — add to Register 9.2 as B-18, or confirm covered by existing B-06 characterization |
| **OI-20** (new) | `blog-detail.blade.php` catalogued at lower depth than other unique pages (LIVE-orphan, no inbound link, lower priority this session) | Low | Whichever milestone first ports `/blog-detail/{slug}` | Implementer-actionable, ~20 min follow-up |

**Closed this milestone:** none. **Opened this milestone:** OI-18, OI-19, OI-20.
**OI-1a and OI-1b were NOT closed, NOT waived, NOT treated as equivalent to verification, and NOT silently dropped.** They appear in this table exactly as carried from M1, unchanged in status.

---

## 13. RISKS INTRODUCED

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| N-10 | 51 of 52 admin views' asset catalogue rests entirely on local Blade source, with the same class of local/production drift M1 found on public pages (BCN-03: colour rebrand, added padding rule, 6 modified CSS rules) unverified for the admin stylesheet stack | Medium | Medium | Explicitly labeled VERIFIED AGAINST LOCAL SOURCE throughout `docs/asset-manifest.md` and this report; OI-1b tracks the closure requirement; no claim of production parity is made anywhere for admin |
| N-11 | The "zeintext" alt-theme family (9 pages, §4 of the manifest) is a newly discovered, previously-uncatalogued asset stack not mentioned in the blueprint. If a future engineer works from the blueprint alone without reading the manifest, these 9 pages' distinct (broken-by-design, per OI-18) asset needs could be missed | Low | Medium | Fully documented in `docs/asset-manifest.md` §4 with file/line evidence and explicit 404 status; flagged again here |

---

## 14. OWNER DECISIONS

| ID | Status | Applied |
|---|---|---|
| (none newly required to *begin* this milestone) | — | M2 required no BLOCKING decision per contract §27 |

**Decision now requested for the owner (non-blocking for M2 itself, but should be resolved before it's needed):** OI-19 — whether to register the `poducts-list` 500 as a new BROKEN item (B-18) in Section 9.2, or treat it as already covered by B-06's existing characterization. See §12 above and `docs/asset-manifest.md` §11 (OI-19) for full detail. **Not decided here — correctly left to the owner per contract §10.1 Step 6.**

---

## 15. NEXT MILESTONE SAFETY ASSESSMENT

**Safe to begin M3 (content & catalog browsing):** ☑ **NO — NOT AUTHORIZED**

### Checklist

- [x] Toolchain verified independently: typecheck, lint, format, test, build all pass
- [x] M2's own deliverable (`docs/asset-manifest.md`) complete: 117/117 views catalogued
- [x] No undocumented deviation (all findings carry file:line evidence or explicit production-check notes)
- [x] Laravel source untouched (independently confirmed via mtime check)
- [x] No files deleted
- [ ] **OI-2 (runtime `sql_mode` uncaptured) — still open, owner-supplied, blocks M3 per contract §27's explicit "D-09" requirement**
- [ ] **OI-6 (fresh production source export not obtained) — still open, owner-supplied, blocks M3**
- [ ] **OI-1a / OI-1b — still open; do not block M2's own deliverable, but remain open for M1's own gate and for M7/M9–M11**

### Rationale

**M2's own deliverable is complete and this report is the M2 Gate Report per the owner's instruction to stop here.** Per the owner's explicit directive, **M3 is not to begin automatically** regardless of M2's completion status. Independent of that instruction, the contract's own dependency graph (§27) additionally requires **D-09** (production `sql_mode`, tracked as OI-2) before M3 may begin, and that decision remains **BLOCKING**, unresolved, and owner-supplied — so M3 would not be authorized on the contract's own terms even without the explicit stop instruction.

**This report does not authorize M3.** The next action requires the owner.

---

## 16. SIGN-OFF

**Implementer:** Migration Implementer **Date:** 2026-08-16

**Owner:** _________________________ **Date:** ___________

**M3 authorized:** ☐ Yes ☑ **No — stopped per owner instruction; OI-2/OI-6 also remain BLOCKING per contract §27 independent of that instruction**

**Note:** M2's cataloguing deliverable is complete (117/117 views). OI-1a and OI-1b remain explicitly OPEN, exactly as the owner instructed — not touched, not waived, not inferred, not silently closed. Two new owner-decision items were surfaced (OI-19's BROKEN-register question) and are ready for owner input whenever convenient; neither blocks anything already completed.

---

## ADDENDUM (2026-08-16) — OI-2 STATUS CHANGE: TARGET ARCHITECTURE IS NOW MONGODB ATLAS

**Append-only note. Nothing above this line was altered.**

The owner has set the Next.js application's production database to
**MongoDB Atlas** (Owner Decision D-11, `docs/D-11-DATABASE-ARCHITECTURE.md`),
superseding contract §5.1/§1.1/D-10 as documented there.

**OI-2 (§12 above, and in `GATE-REPORT-M0.md`) changes from "owner-supplied,
blocks M3" to: DEFERRED / NOT APPLICABLE TO TARGET ARCHITECTURE.** Production
MariaDB `sql_mode` credentials were explicitly **not** requested per owner
instruction; no MariaDB compatibility layer was built.

**OI-6 is unaffected and remains OPEN — still the sole named blocker for M3**
per the owner's most recent instruction (2026-08-16): a fresh production
Laravel source export is still required before porting business logic/
controllers, so that logic-level production drift is known before M3
begins. Nothing about the database engine decision changes this
requirement — OI-6 concerns the fidelity of the **application source**, not
the storage engine.

**OI-1a and OI-1b are unaffected by this addendum** — both remain open
exactly as stated in §12 above; this addendum touches OI-2 status only.

A companion read-only analysis of the existing MariaDB schema —
required as groundwork for the eventual MongoDB design, and explicitly
**not** a MongoDB schema/collection design itself — is at
`docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md`.

**M3 status, restated:** still NOT AUTHORIZED. Blocker: **OI-6** only (OI-2
no longer applies to this target architecture).

---

## ADDENDUM (2026-08-16, second) — OI-6 CLOSED

**Append-only note. Nothing above this line was altered.**

The owner supplied a fresh production Laravel source export (`public_html/`, project
root). Verified per `docs/OI-6-RESOLUTION.md` — structural integrity confirmed, and
independently corroborated against content M1 already captured directly from live
production. **OI-6 is CLOSED.** `public_html/` (root level; three unrelated sibling
projects alongside it confirmed out of scope) now supersedes `spakshomeopathy.com/`
as the Laravel source of truth going forward.

**M3 status, restated:** OI-6 no longer blocks M3. **M3 remains NOT AUTHORIZED** —
the owner has separately and explicitly required their own affirmative go-ahead before
M3 begins, independent of any blocker's status. That authorization has not been given.

---

*End of Milestone 2 Gate Report*