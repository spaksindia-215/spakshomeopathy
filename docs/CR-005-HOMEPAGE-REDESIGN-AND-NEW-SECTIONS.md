# CHANGE REQUEST CR-005 — Homepage Redesign, New Public Sections, and Mother Tincture Admin Feature

**Raised by:** Migration Implementer (retroactively, per explicit owner instruction)
**Date:** 2026-09-07
**Requested by:** Owner (homeopathy38@gmail.com) — work performed 2026-09-07, in a session prior to this CR's own drafting
**Confirmed intentional by:** Owner (homeopathy38@gmail.com), 2026-09-07 — see
`docs/OWNER-DIRECTED-2026-09-07-CHANGE-RECONCILIATION.md` §1 for the exact
authorization record this CR formalizes
**Milestone:** Not part of the M0–M13 1:1-migration sequence. Runs as an
additive parallel track, the same posture CR-003 already established for
the Herbs Store.
**Contract version:** 1.0
**Status:** 🟢 **RETROACTIVELY DOCUMENTED AND APPROVED** — the underlying
work is already built and live; this CR is the formal governance record
the project's own established discipline requires for it, not a proposal
awaiting a build decision.

> **This CR is structurally different from CR-001 and CR-003.** Those two
> were written *before* any implementation, gating a build decision. This
> one is written *after* the work already exists, because the M5
> Consolidation Audit and the two post-gate reconciliations that followed
> it found the work undocumented, and the owner has since confirmed
> (`docs/OWNER-DIRECTED-2026-09-07-CHANGE-RECONCILIATION.md` §1) that it
> was intentional. **Nothing in this CR authorizes new work.** It records,
> retroactively, the authorization for work that already happened, per the
> owner's explicit governance instruction. See §0 for the full chain of
> custody.

---

## 0. WHY THIS CR EXISTS, AND WHAT IT DOES NOT DO

On 2026-09-07, `docs/GATE-REPORT-M5-CONSOLIDATION.md` §8 found a body of
undocumented file changes dated 2026-09-07 with no located Change Request,
gate report, or owner sign-off — only in-code comments claiming "owner
request." Per contract §10.5 ("when uncertain, do nothing and ask"), that
report declined to classify the work and recommended reconciliation before
M6.

`docs/M5-POST-GATE-RECONCILIATION-2026-09-07.md` then produced a full
file-by-file inventory of that work, explicitly refusing to treat the
code comments as equivalent to owner sign-off, consistent with this
project's standing evidentiary rule (first established in
`docs/GATE-REPORT-STATE-RECONCILIATION.md`, 2026-08-22, for the original
M4/DR-01 authorization question).

The owner then explicitly confirmed the work was intentional and
instructed that it be brought into formal governance, **not** classified
as part of M5, reverted, or silently folded into CR-003.
`docs/OWNER-DIRECTED-2026-09-07-CHANGE-RECONCILIATION.md` performed the
governance classification this CR now formalizes: it found that the
**Herbs Store** portion of the 2026-09-07-adjacent work (a separate,
larger body of code dated 2026-08-30/31, discovered during that
reconciliation) is already fully covered by CR-003's own §10 amendment and
needs no new CR — but that the **homepage redesign**, the **new
`/homeopathy` and `/nutrition` sections**, and the **Mother Tincture admin
feature** are not covered by CR-003's text (which is scoped specifically
to the Herbal e-commerce section) and require their own governance record.//
**This document is that record.**

This CR does **not**:
- authorize any further work beyond what already exists and is described
  here,
- revert, redesign, or modify any file,
- reopen or invalidate any M5 gate (see §7 for the explicit finding on
  M5-Cart, the one gate with a shared file),
- fold the Herbs Store into its own scope (that remains governed by
  CR-003 alone — see §8),
- begin M6.

---

## 1. WHAT EXISTS TODAY (Step 1 — Identify, applied retroactively)

Verified directly against the repository this session, matching the
inventory already produced in
`docs/OWNER-DIRECTED-2026-09-07-CHANGE-RECONCILIATION.md` §2.1/§3 (not
re-derived from scratch — that inventory's file list and mtimes are
adopted here as the authoritative record, cross-checked once more for
this CR's own purposes):

### 1.1 — Homepage redesign

| File | State |
|---|---|
| `src/app/page.tsx` | **Modified.** `/` now renders `RedesignedHome` (imported from `./redesign/RedesignedHome`) instead of the legacy, migration-governed `HomePageContent`. Retains the site's real, production-verified SEO metadata (title/description/keywords/OG/Twitter) unchanged — only the rendered content component changed. |
| `src/app/home/page.tsx` | **Modified.** Same swap — `/home` (Laravel's own duplicate-of-`/` route) renders `RedesignedHome` too, preserving the pre-existing "both routes render the same thing" relationship. |
| `src/app/redesign/page.tsx` | **New.** Relocates the *former* `/`/`/home` content (the legacy, migration-governed `HomePageContent`) to a `noindex` archive route, `/redesign`, so it is not lost. |
| `src/app/redesign/RedesignedHome.tsx` | **Modified** (637 lines currently; a version of this file existed before 2026-09-07 as a preview-only page, referenced and correctly excluded from scope by two 2026-09-04 M5-E gate reports at that time). Now the live content for `/` and `/home`. |
| `src/app/redesign/redesign.css` | **New**, ~20KB — styling for `RedesignedHome`, scoped to that component, not applied to any other migration-governed page. |

### 1.2 — New public sections (no Laravel counterpart)

| File | State |
|---|---|
| `src/app/homeopathy/page.tsx`, `.../category/[slug]/page.tsx`, `.../product/[slug]/page.tsx`, `.../products/page.tsx` | **New.** A listing/category/product-detail section at `/homeopathy/*`. |
| `src/components/homeopathy/*.tsx` (13 files) | **New.** An independent component library for this section, including its own header/footer/stylesheet components, not the shared `PublicHeader`/`PublicFooter`. |
| `src/lib/homeopathy/queries.ts` | **New.** A presentation-layer helper reading the REAL, existing `@/lib/demo/products`/`@/lib/demo/categories` accessors — does not define a parallel schema or invent product/category content (confirmed by this session's own re-read of the file's header, quoted in `OWNER-DIRECTED-2026-09-07-CHANGE-RECONCILIATION.md` §4.5's supporting inspection). |
| `src/app/nutrition/page.tsx` | **New.** A single new page at `/nutrition`, no Laravel counterpart. |

### 1.3 — Mother Tincture admin feature

| File | State |
|---|---|
| `src/app/admin/(shell)/add-mother-tincture/page.tsx`, `AddMotherTinctureForm.tsx` | **New.** A new admin route, `/admin/add-mother-tincture`, with no Laravel counterpart. |
| `src/lib/motherTincture/**` (9 files: `catalog.ts`, `db/{index,config,client,motherTinctureProductRepository,schema,service}.ts`, `uploads/{index,config,storage}.ts`) | **New.** A complete, self-contained MongoDB data-access and upload layer, structurally parallel to (but isolated from) the legacy migration's `src/lib/mongodb/**` and the Herbs Store's `src/lib/herbs/db/**`. |
| `src/app/mother-tincture/page.tsx` | **Modified.** This route is a pre-existing, legitimate, migration-governed Laravel static-port page (`/mother-tincture`). Its 2026-09-07 modification was not independently diffed by either prior reconciliation; flagged here, unresolved, per §9. |
| `src/components/admin/AdminSidebar.tsx` | **Modified.** New "Mother Tincture" treeview entry added, linking to `/admin/add-mother-tincture`. |

### 1.4 — Header/navigation changes (shared file, additive-only region)

| File | State |
|---|---|
| `src/components/layout/PublicHeader.tsx` | **Modified.** The `<ul className=" navigation-box">` block's five top-level items ("About Us," "Herbs," "Diseases Catalogue," "Video," and a new "Herbs Store" link) were consolidated into a single new "Menu" dropdown. This is a **restructuring of existing, non-Herbs, non-Mother-Tincture navigation markup** — distinct in kind from an additive new entry, and the reason this file's change is claimed by this CR rather than by CR-003 (whose own protected-component clause covers only Herbs-Store-related additions to this file, not a restructuring of pre-existing items). See §7 for this file's relationship to the M5-Cart gate, and §6 for why this specific change is in scope here. |

---

## 2. WHAT IS BEING RETROACTIVELY AUTHORIZED (Step 1, cont.)

Exactly the file set in §1, in the state it currently exists in — no more,
no less. This CR does not authorize any future extension of these
features; a further change to any of them (adding fields, new routes
under `/homeopathy`, further nav restructuring, etc.) would itself need
its own Change Request or fold under an amendment to this one, per the
same discipline CR-003 §10 already modeled for itself.

---

## 3. JUSTIFY (Step 2)

**Category: [x] Owner-requested.** Confirmed directly:
`docs/OWNER-DIRECTED-2026-09-07-CHANGE-RECONCILIATION.md` §1 records the
owner's explicit statement that this work "was intentionally created by
the project owner" and is "not accidental, not unauthorized." This CR's
own justification rests entirely on that confirmation — it is not a
technical-impossibility or security/legal/data-integrity category, the
same as CR-003's own §3.

This is retroactive by necessity, not by design: the correct process
(raise the CR before implementing) was not followed when the work was
originally built, which is exactly why the M5 Consolidation Audit flagged
it. The owner has since confirmed intent and instructed that the
governance record be created now, which is what this document does.

---

## 4. IMPACT (Step 3)

| Dimension | Effect |
|---|---|
| **Users affected** | All guests/buyers visiting `/`, `/home`, `/homeopathy/*`, or `/nutrition` see new content. Admin users see one new sidebar entry and one new admin route (`/admin/add-mother-tincture`). No buyer-authenticated or admin-authenticated *migration* surface (login, orders, existing CRUD) is affected. |
| **Database effect** | Mother Tincture introduces one new, isolated MongoDB logical database (`<MONGODB_DB_NAME>_motherTincture`), confirmed by read-only inspection (`docs/OWNER-DIRECTED-2026-09-07-CHANGE-RECONCILIATION.md` §7) to carry the same production-write guard as the legacy migration's own database client, use only environment-variable-sourced configuration, and store no hardcoded secrets. No existing collection is read from or written to by this feature. |
| **SEO effect** | The homepage swap changes what `/` and `/home` render — their existing, production-verified metadata (title/description/OG/Twitter) is preserved unchanged (confirmed in §1.1), so indexed search-result snippets are not expected to change, though the rendered page content itself does. `/homeopathy/*` and `/nutrition` are new indexed surface; their current metadata/indexing posture was not audited by this CR (see §9). |
| **Routes/forms/features affected** | None of the existing 56+13+102 cataloged Laravel routes change path, verb, or behavior. This is entirely additive/replacement surface at URLs (`/`, `/home`, `/homeopathy/*`, `/nutrition`, `/admin/add-mother-tincture`) that either had no Laravel-parity content to preserve in the first place (the two duplicate-content homepage routes are unusual in that they DID have governed content, addressed specifically below) or have no Laravel counterpart at all. |
| **The one genuine fidelity question this CR must own:** `/` and `/home` are **not** ordinary new surface — until this change, they rendered `HomePageContent`, the actual migration-governed, Laravel-parity homepage, verified against production at earlier milestones. Replacing that content at the site's literal root URL is a materially different kind of change from adding a new URL with no prior governed content. **This CR's owner-approval block (§8) must speak to this specifically, not merely wave it through as "new, additive" work** — it is a replacement of previously-governed content, mitigated only by the fact that the original content was NOT deleted, merely relocated to `/redesign` (§1.1). |
| **Completed milestones affected** | M5-Cart shares one file (`PublicHeader.tsx`) with this CR's scope. §7 below performs the exact revalidation the governing reconciliation documents required before this CR could respons­ibly claim "no impact." Finding: **no impact** — M5-Cart's own specific claims about that file remain true; see §7. |
| **Rollback difficulty** | Low for the new-route additions (`/homeopathy/*`, `/nutrition`, `/admin/add-mother-tincture`) — deleting the new files removes the surface cleanly, no shared state. **Higher for the homepage swap** — `/` and `/home` are the site's most-trafficked, most-indexed URLs; reverting the swap is a one-file-each change (point back to `HomePageContent`) but is not risk-free the way deleting an isolated new route is, since search engines and cached links have had exposure to the new content in the interim. |
| **Additional testing required** | `npm run verify` (typecheck/lint/format/test) was independently re-run as part of the M5 Consolidation Audit and found clean except for the `format:check` failures already attributed to this exact file set (§9 tracks this as a still-open item, not resolved by this CR). No dedicated test suite exists yet for `RedesignedHome`, the `/homeopathy` section, or the Mother Tincture feature — this CR does not create one; whether one is required is listed as an open item in §9. |

---

## 5. WHAT WAS VERIFIED BEFORE THIS CR WAS WRITTEN

Per NN-2/IR-10's evidentiary standard, this CR is not asserting safety or
non-interference without support. The following was independently
verified, read-only, before this document was drafted, and is
incorporated here by reference rather than repeated in full:

- **`PublicHeader.tsx`'s cart-badge region (M5-Cart's own scope) is
  unaffected** — a line-by-line comparison against `GATE-REPORT-M5-CART.md`'s
  own textual description found every specific claim it makes still true
  of the current file. Full comparison: `OWNER-DIRECTED-2026-09-07-CHANGE-RECONCILIATION.md`
  §6, restated in §7 below.
- **The Mother Tincture database/upload layer carries the same
  production-write guard as the legacy migration's own client**, uses only
  environment-variable configuration, has no hardcoded secrets, and
  applies upload validation stricter than the original Laravel application
  ever had. Full audit: `OWNER-DIRECTED-2026-09-07-CHANGE-RECONCILIATION.md`
  §7.
- **`add-hurbcat` and the B-14 search branch remain untouched** by any file
  in this CR's scope — confirmed by direct grep.
- **No hardcoded secret was found in any file this CR covers.**
- **No existing migration-governed route's path, verb, status code, or
  redirect target changed** as a result of any file in this CR's scope.

---

## 6. PROTECTED-COMPONENT DISCIPLINE — WHY `PublicHeader.tsx`'S NAV CHANGE BELONGS TO THIS CR, NOT CR-003

CR-003 §10.3/§10.4 commits `PublicHeader.tsx` (among other shared files)
to being "extended additively, never rewritten" for Herbs-Store-related
changes specifically. The current file does contain one Herbs-Store-related
addition consistent with that commitment (the "Herbs Store" link, folded
into the new dropdown) — that piece is CR-003's, not this CR's.

But the dropdown itself, and the consolidation of four **pre-existing,
non-Herbs** nav items ("About Us," "Herbs" [the legacy
`/productsbydisease/24` link, unrelated to the Herbs Store's `/herbs`
route despite the similar label], "Diseases Catalogue," "Video") into that
dropdown, is a restructuring of markup that predates both CR-003 and this
CR — markup that was, until 2026-09-07, governed solely by the parent
migration contract's NN-5 (rendered DOM must match). **This CR is the
correct place to record authorization for that specific restructuring**,
since CR-003's protected-component clause does not extend to justifying
changes unrelated to the Herbs Store, and this restructuring was part of
the same 2026-09-07 session as the homepage redesign (per the file's own
comment, cross-referencing `RedesignedHome.tsx`'s identical
"2026-09-07... same change applied to the legacy header" language).

---

## 7. M5-CART GATE — EXPLICIT REVALIDATION FINDING

Restating `docs/OWNER-DIRECTED-2026-09-07-CHANGE-RECONCILIATION.md` §6's
finding as this CR's own formal record, since `PublicHeader.tsx` is a file
this CR's scope touches:

**Finding: M5-Cart's gate does not require reopening.** Every specific,
textual claim `GATE-REPORT-M5-CART.md` §3 makes about its own
`PublicHeader.tsx` change — `StickyNavBody` as an async function, the
`getTotalCartItem(await getCartContent())` read, the `<span
className="count">` badge markup, the exact Blade-whitespace-preserving
ternary, the import statement — was independently re-verified this session
against the current file and found unchanged, byte-for-byte, in content.
The nav-consolidation change this CR covers occupies a structurally
distinct, non-overlapping region of the same file (the `<ul
className=" navigation-box">` block, which is a sibling to, not a
container of, the cart-badge markup).

This CR does not invalidate M5-Cart. `docs/GATE-REPORT-M5-CART.md` remains
accurate for the scope it claims. The one outstanding, narrower question
(whether the owner wants a fresh functional check of the cart badge in
addition to this textual comparison) is Decision 2 in
`OWNER-DIRECTED-2026-09-07-CHANGE-RECONCILIATION.md` §8 and is not
resolved by this CR — it is independent of whether this CR itself is
approved.

---

## 8. RELATIONSHIP TO CR-003 — EXPLICIT BOUNDARY

To prevent any future ambiguity: this CR's scope is **exactly** §1 above
(homepage redesign, `/homeopathy`, `/nutrition`, Mother Tincture, and the
non-Herbs portion of the `PublicHeader.tsx` nav change). It does **not**
cover, does **not** amend, and does **not** duplicate any part of
`docs/CR-003-HERBAL-ECOMMERCE-SECTION.md`'s scope. The Herbs Store
(`src/lib/herbs/**`, `src/app/herbs/**`, the Herbs-related entries in
`AdminSidebar.tsx` and `PublicHeader.tsx`'s new dropdown) remains governed
solely by CR-003 §10's own authorization, verified as a close match to the
actual implementation in `OWNER-DIRECTED-2026-09-07-CHANGE-RECONCILIATION.md`
§4.2. Any future change to the Herbs Store should amend CR-003, not this
document; any future change to the homepage, `/homeopathy`, `/nutrition`,
or Mother Tincture should amend this document, not CR-003.

---

## 9. OPEN ITEMS NOT RESOLVED BY THIS CR

Carried forward, unresolved, from
`docs/OWNER-DIRECTED-2026-09-07-CHANGE-RECONCILIATION.md` §8, restated
here because they bear directly on this CR's own scope:

1. **`src/app/mother-tincture/page.tsx`'s exact 2026-09-07 content change**
   was not independently diffed by any document to date, including this
   one — this CR authorizes the file's current *existence and role* as
   part of the Mother Tincture feature, but the specific fidelity
   implications of its modification (does it still preserve the
   Laravel-ported `/mother-tincture` page's original content/behavior
   anywhere the Mother Tincture admin feature doesn't touch?) remain
   unverified.
2. **`/herbs`'s and, by extension, `/homeopathy`'s/`/nutrition`'s current
   search-indexing posture** (`noindex` or not) was not audited by this
   session.
3. **The project-wide `format:check` failure** (11 files, all inside this
   CR's own scope per the M5 Consolidation Audit's finding) is not fixed
   by this CR — formatting the affected files is a mechanical, low-risk
   follow-up this CR does not perform, since this CR's job is
   authorization, not implementation.
4. **No dedicated automated test coverage exists** for `RedesignedHome`,
   the `/homeopathy` section, or the Mother Tincture feature. This CR does
   not require it retroactively; whether it should be added is left to the
   owner or a future CR amendment.

---

## 10. APPROVAL

```
Owner decision:  [x] APPROVE — retroactively authorize the work described
                     in §1, as it currently exists, per the owner's own
                     2026-09-07 confirmation recorded in
                     docs/OWNER-DIRECTED-2026-09-07-CHANGE-RECONCILIATION.md §1
                 [ ] APPROVE WITH CONDITIONS (specify below)
                 [ ] REJECT / REQUIRE REVERSION
Conditions:      1. `add-hurbcat` and the B-14 search branch remain
                    untouched, governed solely by the parent migration
                    contract (already confirmed true, §5).
                 2. Any further extension of this CR's scope (new fields,
                    new routes under /homeopathy, further nav changes,
                    etc.) requires its own Change Request or a formal
                    amendment to this one — not ad hoc implementation.
                 3. This CR does not retroactively authorize anything
                    outside the exact file set in §1 — any other
                    undocumented work discovered later is not covered by
                    this approval.
                 4. The open items in §9 remain open; this approval does
                    not resolve them.
Signature:       Owner (homeopathy38@gmail.com)
Date:            2026-09-07
```

**Consequence:** the homepage redesign, `/homeopathy`, `/nutrition`, and
the Mother Tincture admin feature — exactly as they exist in the
repository as of this CR's date — are now formally, durably authorized in
this project's own established governance format, closing the
authorization gap the M5 Consolidation Audit found. No further
implementation is triggered by this CR's approval; the work already
exists. M5's gate sequence is unaffected (§7). M6 readiness is a separate
question, addressed by whichever document tracks the remaining items in
`docs/OWNER-DIRECTED-2026-09-07-CHANGE-RECONCILIATION.md` §8's Decisions
2–4 and this CR's own §9.

---

*End of Change Request CR-005 — Homepage Redesign, New Public Sections, and Mother Tincture Admin Feature.*
