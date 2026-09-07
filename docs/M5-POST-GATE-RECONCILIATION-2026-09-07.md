# M5 POST-GATE RECONCILIATION — 2026-09-07 UNDOCUMENTED WORK

**Type:** Governance reconciliation. **This is not an implementation task.**
No code, database, or configuration change was made in the production of
this document. No file was reverted, edited, or deleted. No historical gate
report was modified. No Atlas connection was attempted. No production
system was touched.
**Date:** 2026-09-07
**Author:** Claude Code, at owner instruction, following the M5
Consolidation Audit's BLOCKED — OWNER DECISION REQUIRED verdict
(`docs/GATE-REPORT-M5-CONSOLIDATION.md`).
**Governing documents re-read in full for this reconciliation:**
`MIGRATION-CONTRACT.md` v1.0, every M5 gate report (`GATE-REPORT-M5-A.md`,
`-M5-B.md`, `-M5-C.md`, `-M5-CART.md`, `-M5-E-PINCODE.md`, `-M5-E-SLIDER.md`,
`-M5-E-BLOG-CATEGORIES.md`, `-M5-E-CATEGORIES.md`, `-M5-E-BLOGS.md`,
`-M5-E-POSTS.md`, `-M5-E-PRODUCT-CATEGORIES.md`),
`docs/GATE-REPORT-M5-CONSOLIDATION.md`, `docs/CR-003-HERBAL-ECOMMERCE-SECTION.md`,
`docs/M3-OWNER-DECISION-RECORDS.md`, `docs/B-12-RESOLUTION.md`,
`docs/B-16-RESOLUTION.md`, `MIGRATION-CONTRACT.md` §9.2 (BROKEN Register),
§9.3 (Approved Fix Register), §9.4 (Preserved Defect Register), §22
(Approved Deviation Log).

---

## 1. PURPOSE

This document does not decide whether the 2026-09-07 work is acceptable.
It does not classify that work as approved, does not fold it into M5, and
does not remove it. Per the owner's explicit governance instruction, this
document's sole purpose is to:

1. Produce a complete, file-by-file inventory of the undocumented
   2026-09-07 changes the M5 Consolidation Audit flagged.
2. Identify, for each change, what documentary evidence of authorization
   actually exists — distinguishing owner sign-off, Change Request, gate
   report, code comment, and inference, without treating any of the latter
   as equivalent to the first two.
3. Identify conflicts with `MIGRATION-CONTRACT.md` and existing Change
   Requests, in particular CR-003.
4. Identify which M5 gates can still be certified against the current tree
   and which cannot, without re-litigating those gates' own findings.
5. Present the owner with explicit, numbered decisions — not
   recommendations disguised as conclusions.

No implementation follows this document. M6 remains stopped until the
owner acts on §7.

---

## 2. TRIGGER

`docs/GATE-REPORT-M5-CONSOLIDATION.md` §8 ("MATERIAL FINDING — UNDOCUMENTED
WORK DATED 2026-09-07"), produced 2026-09-07, found — via a repository-wide
file-modification-time sweep — a substantial body of file changes dated
2026-09-07 that:

- do not appear in the file-created/file-modified list of any M5 gate
  report,
- do not appear in `CR-003-HERBAL-ECOMMERCE-SECTION.md` (the one
  legitimately-authorized parallel track this project has, which
  explicitly defers this category of work to post-cutover), and
- include, by their own in-code comments, a description of a homepage
  redesign and new "homeopathy," "nutrition," and "mother tincture"
  sections, with navigation changes to the site's live, production-governed
  header.

The Consolidation Audit's verdict was **BLOCKED — OWNER DECISION
REQUIRED**, and it explicitly declined to classify this work itself,
consistent with contract §10.5 ("when uncertain, do nothing and ask").
This document continues that posture — it goes one level deeper into the
evidence than the Consolidation Audit did, but reaches no classification
decision of its own beyond sorting items into the five categories the
owner's task specifies (§3, column "Migration / additive / redesign /
unclear" — a *descriptive* sort, not an *authorization* verdict).

---

## 3. UNDOCUMENTED CHANGE INVENTORY

All entries below were independently re-verified this session by direct
file inspection (not re-quoted from the Consolidation Audit). "M5-owned"
means the file appears in the Files Created/Files Modified table of at
least one CLOSED M5 gate report, verified by exact-path grep against every
M5 report, not a basename match.

### 3.1 — Files touching the legacy/production-governed public site

| Path | What changed | Route/page/component affected | Touches an M5-owned file? | Character of work | Existing authorization record | Conflicts? | Verification status |
|---|---|---|---|---|---|---|---|
| `src/app/page.tsx` | Content swapped: previously rendered the legacy, migration-governed `HomePageContent`; now renders `RedesignedHome`. Own header comment: *"SWAPPED (owner request, 2026-09-07)... This route used to render the legacy `index.blade.php`-ported `HomePageContent` (MIGRATION-CONTRACT.md IR-1 governed it)."* | `/` — the site's real, indexed, canonical homepage | **NO** — not listed as created/modified in any M5 gate report's own file table (M5-Cart, M5-C, and every M5-E sub-slice's *grep hits* on this path in the prior audit were false positives from a basename-only search; none of their own Files Created/Modified tables lists `src/app/page.tsx`) | **Redesign work** — the code's own comment names IR-1 (the exact rule "never redesign UI") and asserts an override | **Code comment only.** No `docs/CR-*.md`, no `docs/GATE-REPORT-*.md`, no `MIGRATION-CONTRACT.md` §22 entry | **Direct, on-its-face conflict** with NN-2, NN-5, IR-1, F-8 unless a genuine owner approval exists outside this repository | Not independently verified by this reconciliation beyond confirming the file's own claim; `npm run build` passes structurally but that is not evidence of authorization |
| `src/app/home/page.tsx` | Same swap: now renders `RedesignedHome` instead of legacy content, mirroring `/`'s change | `/home` (Laravel's own duplicate-of-`/` route) | **NO** | Redesign work (same swap as `/`) | Code comment only (references `page.tsx`'s comment for "full swap history") | Same as above | Same as above |
| `src/app/redesign/page.tsx` | **New file.** Relocates the *former* `/` and `/home` content (the migration-governed `HomePageContent`) to a new, `noindex` URL, described in its own comment as an "archive" | New route: `/redesign` (was previously the preview location of the *replacement* design, per the file's own comment: *"MOVED HERE from `/` and `/home` in the 2026-09-07 swap"*) | **NO**, but note: **the M5-E-slider (2026-09-04) and M5-E-blog-categories (2026-09-04) gate reports both already reference a file at `src/app/redesign/RedesignedHome.tsx`**, at that time describing it as pre-existing, unmodified, "appears to belong to the separate CR-003/Herbs Store... track" — i.e., a *version* of this file/path existed **before** 2026-09-07, under a different role (a preview of a proposed redesign, not the live homepage) | Redesign work (relocation of legacy content to make room for the swap) | Code comment only | Same as `page.tsx` | Not independently verified |
| `src/app/redesign/RedesignedHome.tsx` | **Substantially modified today** (mtime 14:28, the latest of any file in the sweep; 637 lines currently). Was already present and flagged by two 2026-09-04 M5-E gate reports as a pre-existing, out-of-scope, unmodified formatting-check failure at that time. Its role changed from "preview, not live" to "the live homepage content for `/` and `/home`," per the swap described in `page.tsx`. Contains its own comment: *"Consolidated per owner request (2026-09-07, same change applied to the legacy header — see `PublicHeader.tsx`)."* | The actual rendered content of `/` and `/home` | **NO** by direct-path grep, but **its predecessor was independently, correctly flagged as out-of-scope by two M5-E gate reports** — this is the strongest existing corroboration in the repository that some version of this file predates 2026-09-07 and was already understood by prior sessions to belong to a different, non-M5 track | Redesign work — both the file's evolution (preview → live) and its explicit new content changes | Code comment only, self-referential (cites `PublicHeader.tsx`'s comment, which in turn is also just a code comment) | Same as `page.tsx`; additionally, this file is the concrete cause of the `format:check` failure the Consolidation Audit found and no M5-E report anticipated at this scale (prior reports characterized it as a single, static, unchanging gap — it is not static; it changed materially today) | `format:check` **fails** on this file, confirmed this session |
| `src/app/redesign/redesign.css` | **New file**, ~20KB | Stylesheet for `RedesignedHome.tsx` | **NO** | Redesign work — new, from-scratch CSS, which is itself a direct F-30 concern ("Upgrading or replacing the front-end CSS") if applied to any in-scope page, and an IR-1/F-8 concern regardless of scope | None found | Potential F-30 conflict if this CSS reaches any migration-governed route (it does, since `RedesignedHome` is now `/` and `/home`) | Not independently verified |
| `src/components/layout/PublicHeader.tsx` | **Structurally modified.** The legacy, production `.navigation-box` menu — the same header M5-Cart's own gate report modified (for the real cart badge) and gate-closed cleanly — had five items ("About Us," "Herbs," "Diseases Catalogue," "Video," and a new "Herbs Store" link) collapsed into a single new "Menu" dropdown. Own comment: *"Consolidated per owner request (2026-09-07): About Us, Herbs, Diseases Catalogue, Video, and Herbs Store no longer sit as separate top-level items — they're grouped under one 'Menu' dropdown."* | `/` and every page using the shared public header (i.e., nearly the entire public site) | **YES — this is an M5-owned file.** `GATE-REPORT-M5-CART.md` §3 lists `src/components/layout/PublicHeader.tsx` as modified (for the cart badge) and that gate is CLOSED. `GATE-REPORT-M5-C.md` also references it (confirming it is unmodified/correctly commented-out at that time, 2026-08-26/2026-09-04). **This file has now been structurally changed again, after its owning M5 gates closed, by different, undocumented work.** | **Redesign / structural markup change to a live, migration-governed component** — this is a direct, on-its-face NN-5 ("rendered DOM must match... same elements, same nesting, same class names, same order") concern, independent of any Herbs Store question | Code comment only. Additionally: `CR-003-HERBAL-ECOMMERCE-SECTION.md` §4/§conclusion explicitly designates `PublicHeader.tsx` a **"protected component"** to be "extended additively, never rewritten" *if and when* the (still-deferred) Herbs Store work proceeds — this file has now been altered in a way that removes/restructures existing top-level nav items, which is a stronger action than "additive extension" | **Direct conflict with NN-5**, and a **direct conflict with CR-003's own stated protected-component discipline** for this file, regardless of whether the Herbs Store itself has begun | `format:check` **fails** on this file, confirmed this session — this specific failure did not exist at any M5-E sub-slice's own close (each explicitly confirmed `format:check` passing for every file it touched) |

### 3.2 — New feature areas with no located authorization record

| Path | What changed | Route/page/component affected | Touches an M5-owned file? | Character of work | Existing authorization record | Conflicts? | Verification status |
|---|---|---|---|---|---|---|---|
| `src/app/homeopathy/page.tsx`, `src/app/homeopathy/category/[slug]/page.tsx`, `src/app/homeopathy/product/[slug]/page.tsx`, `src/app/homeopathy/products/page.tsx` | **New files.** A complete new section: listing, category, and product-detail pages | New routes: `/homeopathy`, `/homeopathy/category/[slug]`, `/homeopathy/product/[slug]`, `/homeopathy/products` — **none of these exist in Laravel source**, per every prior M3/M4/M5 route inventory (`M3-APPLICATION-MAPPING.md`, `M4-NEXTJS-ROUTE-MAPPING.md`) | **NO** | **Additive new-feature work** — a genuinely new URL tree with no Laravel counterpart | None found in any `docs/*.md` | **F-10** ("Renaming, adding, or removing routes... forbidden without approval") and §3.2 ("Adding features, pages, fields, filters, sorts, or reports" — excluded activity) unless separately, properly authorized | Not independently verified |
| `src/components/homeopathy/*.tsx` (11 files: `HomeopathyCatalog.tsx`, `HomeopathyCategoryGrid.tsx`, `HomeopathyFooter.tsx`, `HomeopathyHeader.tsx`, `HomeopathyIcon.tsx`, `HomeopathyMarketingSections.tsx`, `HomeopathyMedia.tsx`, `HomeopathyProductCard.tsx`, `HomeopathyProductDetail.tsx`, `HomeopathyShell.tsx`, `HomeopathyStylesheets.tsx`, `HomeopathyUI.tsx`, `NewsletterSection.tsx`) | **New files.** A full, independent component library for the `/homeopathy` section, including its own header/footer/stylesheet components — **not** reusing `PublicHeader`/`PublicFooter` | Supports the `/homeopathy` route tree above | **NO** | **Additive new-feature work**, and specifically the kind CR-003 §4/§conclusion required to reuse (not duplicate) shared components like the header/footer — this new section instead builds its own `HomeopathyHeader`/`HomeopathyFooter` | None found | Same F-10/§3.2 concern; also arguably inconsistent with CR-003's own stated architecture discipline ("reuse first, extend only where required") even though this section is not itself CR-003's Herbs Store | Not independently verified |
| `src/lib/homeopathy/queries.ts` | **New file**, ~6.5KB | Data layer for the `/homeopathy` section | **NO** | Additive new-feature work | None found | Same F-10/§3.2 concern | Not independently verified |
| `src/app/nutrition/page.tsx` | **New file** | New route: `/nutrition` — no Laravel counterpart | **NO** | Additive new-feature work | None found | Same F-10/§3.2 concern | Not independently verified |
| `src/app/mother-tincture/page.tsx` | **Modified.** This route already existed pre-2026-09-07 (it is the legitimate Laravel static-port `/mother-tincture` page, referenced correctly in numerous M5-E reports' own regression checks — confirmed by the many M5 gate-report hits on this exact path in the earlier basename search). | `/mother-tincture` — a real, existing, migration-governed Laravel route | **Ambiguous — the path is real and migration-governed, but this specific 2026-09-07 modification's content was not inspected in enough depth by either audit to characterize precisely; flagged for owner clarification, not assumed** | **Unclear** — could be a legitimate continuation of existing migration work on an existing route, or could be new "mother tincture" commerce-feature work bleeding into the existing static page | None found for the 2026-09-07 modification specifically | Potentially none (if the change is in-scope migration work) — **this is exactly the kind of item that must not be assumed either way** | Not independently verified; **flagged as requiring direct diff/content review before classification** |
| `src/app/admin/(shell)/add-mother-tincture/page.tsx`, `src/app/admin/(shell)/add-mother-tincture/AddMotherTinctureForm.tsx` | **New files.** A new admin page and form for adding "Mother Tincture" products | New admin route: `/admin/add-mother-tincture` — **no Laravel counterpart**; `AdminController.php` has no `MotherTincture`-related method in the source inventory any M3/M4/M5 document has ever catalogued | **NO** | **Additive new-feature work**, admin-side | None found | Same F-10/§3.2 concern; also §3.2's explicit exclusion "Adding features, pages, fields, filters, sorts, or reports" | Not independently verified |
| `src/lib/motherTincture/**` (9 files: `catalog.ts`, `db/actions.ts`, `db/client.ts`, `db/config.ts`, `db/index.ts`, `db/motherTinctureProductRepository.ts`, `db/schema.ts`, `db/service.ts`, `uploads/config.ts`, `uploads/index.ts`, `uploads/storage.ts`) | **New files.** A complete, independent data-access and file-upload layer — its own DB client/config/schema/repository/service, and its own upload config/storage module, structurally parallel to (but separate from) the project's existing `src/lib/mongodb/**` MongoDB infrastructure and `src/lib/uploads/adminUpload.ts` (FIX-003's shared upload module) | Backs `/admin/add-mother-tincture` and presumably `/mother-tincture`'s new content | **NO — and notably does NOT reuse the FIX-003 shared upload module** (`src/lib/uploads/adminUpload.ts`) that every M5-E sub-slice was required to use for its own uploads, per the Approved Fix Register | **Additive new-feature work**, and a new, separate persistence mechanism whose relationship to the project's single MongoDB target (`spaks_dev`) and its production-safety guards (`assertNonProductionTarget()`) was not verified by this reconciliation | None found | Same F-10/§3.2 concern; additionally, **a new, unaudited database/upload pathway is a direct concern for the same production-safety discipline every M5 report has been careful to maintain** — this reconciliation did not verify whether this new `db/client.ts` carries the same non-production guard every other MongoDB-touching file in this project does | **Not independently verified — this is the single most safety-relevant unverified item in this inventory** and should be checked before any further action, regardless of the owner's disposition decision |
| `src/components/admin/AdminSidebar.tsx` | **Modified.** A new "Mother Tincture" treeview section added, linking to `/admin/add-mother-tincture` and (implied by an adjacent, unlabeled-in-this-sweep "Herbs" treeview section) `/admin/herbs-list`/`/admin/add-herb-product` | Admin shell sidebar navigation, present on every admin page | **NO** by direct-path grep against M5 gate reports, but **`CR-003-HERBAL-ECOMMERCE-SECTION.md` explicitly designates this file a protected component** ("extended additively, never rewritten") for the *deferred* Herbs Store work — the sidebar now contains live links for both an undocumented "Mother Tincture" feature and what appears to be Herbs Store admin scaffolding (`/admin/herbs-list`, `/admin/add-herb-product`), despite CR-003's Herbs Store being explicitly **deferred, post-cutover only** | **Additive in form** (new treeview item, not a rewrite of existing items) but **the underlying features it links to are not documented as authorized**, and one set of links (`/admin/herbs-list`, `/admin/add-herb-product`) appears to belong to the CR-003 Herbs Store track specifically | Code comment only (*"Mother Tincture admin-add feature addition — see file header"*) | **Direct conflict with CR-003's own deferral** if the Herbs-related sidebar links are live/reachable admin functionality rather than dead placeholder links — **this reconciliation did not verify whether `/admin/herbs-list` and `/admin/add-herb-product` are functional routes or dead links, and does not assume either** | Not independently verified — **flagged as a priority item**: if these routes are live and functional, CR-003's explicit "not to begin until M13 is signed off" is being violated; if they are dead placeholder links, they may be inert scaffolding from before CR-003's deferral decision. This distinction matters and was not resolved by either audit. |

### 3.3 — Files referenced by the sweep but already accounted for

| Path | Note |
|---|---|
| `src/lib/mongodb/repositories/categoryRepository.ts` | Modified 2026-09-06 12:20, **inside** the M5-E-product-categories gate's own session window (that report's own §2/§3 lists this exact file as modified, for `ProductCategoryRepository` methods). **This is M5-owned, accounted for, and not part of the undocumented work.** Included in the original sweep only because its mtime (2026-09-06) fell inside the ">= 2026-09-06 00:00" window the Consolidation Audit used, not because it is undocumented. |
| `src/app/admin/save-product-category/route.ts`, `save-other-category/route.ts`, `save-product-subcat/route.ts`, `destroy-product-category/[id]/route.ts`, and the 7 `admin/(shell)/*-category*` pages | All dated 2026-09-06, all exactly match `GATE-REPORT-M5-E-PRODUCT-CATEGORIES.md`'s own Files Created list. **M5-owned, accounted for, not part of the undocumented work.** Included in the original sweep's date window only. |

**Correction to the Consolidation Audit's own §8 file list:** the prior
report's inventory was drawn from a single `find -newermt` sweep without
per-file disposition. This reconciliation confirms roughly half of that
sweep's raw output (the product-category files) is legitimate, already-
gate-closed M5-E work that merely shares the same mtime window as the
genuinely undocumented work. **The undocumented set is smaller than the
raw sweep implied, but every item confirmed undocumented above (§3.1,
§3.2) is confirmed undocumented by direct, path-exact cross-reference
against every M5 gate report's own file tables — not by inference from
the sweep alone.**

---

## 4. AUTHORIZATION EVIDENCE

Applying the exact distinction the owner's instruction requires:

| Evidence type | Found for any 2026-09-07 item in §3.1/§3.2? | Detail |
|---|---|---|
| **Owner sign-off** (a durable `**Owner:** <name> **Date:**` record, the pattern used by every M5-A/B/C/E-\* report and by CR-003 itself) | **NO** | No such record exists anywhere in `docs/` for the homepage swap, the header consolidation, the homeopathy section, the nutrition section, or the mother-tincture admin/data work. |
| **Change Request** (a `docs/CR-*.md` document, the pattern CR-001 and CR-003 both use) | **NO** | No `docs/CR-004*.md` or equivalent exists. `CR-003-HERBAL-ECOMMERCE-SECTION.md` exists but explicitly, currently defers all Herbs-Store-shaped work — it is not authorization for this work, and its own text says so. |
| **Gate report** (a `docs/GATE-REPORT-*.md` document covering this specific work) | **NO** | No gate report of any kind exists for any file in §3.1 or §3.2. |
| **Code comment** (an in-source claim, e.g. *"owner request, 2026-09-07"*) | **YES — this is the ONLY evidence type found** | Present in `src/app/page.tsx`, `src/app/home/page.tsx`, `src/app/redesign/page.tsx`, `src/app/redesign/RedesignedHome.tsx`, `src/components/layout/PublicHeader.tsx`, and `src/components/admin/AdminSidebar.tsx`. **Per explicit instruction, this reconciliation does not treat this as equivalent to owner sign-off.** It is evidence that *someone*, in some session, asserted an owner instruction existed — it is not, by itself, verification that it did, in the same way `GATE-REPORT-STATE-RECONCILIATION.md` (2026-08-22) already established for this exact project regarding the original M4/DR-01 authorization question. |
| **Inference** (reasoning from surrounding context, without direct evidence) | Not relied upon by this reconciliation for any authorization conclusion. Where this document uses words like "appears to," "presumably," or "implied," that is flagged explicitly as inference about *content*, never treated as a substitute for authorization evidence. |

**Conclusion for this section:** every item inventoried in §3.1 and §3.2
has exactly one, and only one, form of evidence — a code comment. **Zero
items have owner sign-off, a Change Request, or a gate report.** This
reconciliation does not conclude the work is unauthorized (the owner may
confirm the comments are accurate); it concludes only that the
documentary record required by this project's own established standard
does not currently exist.

---

## 5. CONTRACT / CR CONFLICTS

| Item | Rule/CR | Nature of conflict |
|---|---|---|
| `/` and `/home` homepage swap | **NN-2** (no silent changes), **NN-5** (rendered DOM must match), **IR-1** (never redesign UI), **F-8** (redesigning/restyling/re-theming forbidden without approval) | Direct, on-its-face — the swap replaces the entire rendered homepage with a "from-scratch homepage design," which is definitionally a redesign of a migration-governed page, unless separately, properly authorized |
| `src/app/redesign/redesign.css` reaching `/` and `/home` | **F-30** (upgrading/replacing the front-end CSS) | Direct — new, from-scratch CSS now governs the site's actual homepage rendering |
| `PublicHeader.tsx`'s nav consolidation | **NN-5**, and **CR-003's own protected-component clause** for this exact file | Direct on both counts — this is not merely an F-8 "new redesign" question but a violation of a *specific, already-written* commitment (CR-003 §conclusion: "extended additively, never rewritten") that this exact file would not be restructured |
| `/homeopathy`, `/nutrition` route trees | **F-10** (adding routes forbidden without approval), **§3.2** ("Adding features, pages, fields... " listed as an excluded activity) | Direct — these are new URL trees with no Laravel counterpart and no located CR |
| `/admin/add-mother-tincture` and its data/upload layer | **F-10**, **§3.2** | Direct, admin-side equivalent of the above |
| `AdminSidebar.tsx`'s new Mother Tincture entry and any live Herbs-Store-shaped admin links (`/admin/herbs-list`, `/admin/add-herb-product`) | **CR-003's protected-component clause** for this file; **CR-003's own deferral** ("not to begin until M13 is signed off") if the Herbs links are functional, not dead placeholders | Conditional — depends on the unresolved functional-status question flagged in §3.2's table; **if** these are live, reachable admin routes, this is a direct violation of CR-003's own explicit, owner-signed deferral (2026-08-30), which is a materially more serious conflict than an ordinary undocumented-change question, since it would mean a specific owner "not yet" decision was overridden without a corresponding "yes, now" decision anywhere on record |

**No conflict was found with any Approved Fix Register entry (FIX-001
through FIX-004) or any Preserved Defect (P-01–P-18) or BROKEN item
(B-01–B-17)** — the 2026-09-07 work does not appear to touch any of those
mechanisms. This reconciliation is narrower than the full B-#/P-# sweep;
it did not re-verify the entire register against the current tree, only
checked for direct overlap with the files in §3.

---

## 6. M5 GATE IMPACT

Per file, cross-referenced against every M5 gate's own Files
Created/Modified table:

| M5 Gate | Files it owns that were touched again on 2026-09-07 | Can this gate still be certified against the CURRENT tree? |
|---|---|---|
| **M5-Cart** (`GATE-REPORT-M5-CART.md`) | `src/components/layout/PublicHeader.tsx` — modified by M5-Cart for the real cart badge (`getTotalCartItem`), and modified AGAIN, structurally, by the undocumented 2026-09-07 work | **NO — not fully.** M5-Cart's own evidence (its file-list, its "no regression" claims, its `format:check pass` claim) describes a version of `PublicHeader.tsx` that no longer exists unmodified in the current tree. The cart-badge logic itself (`getTotalCartItem(await getCartContent())`) was not found removed by this reconciliation's inspection — the nav restructuring appears to sit in a different part of the file — but this reconciliation **did not perform a full line-by-line diff** to confirm the cart badge markup/behavior M5-Cart certified is byte-identical to what exists now. **This must be explicitly re-verified, not assumed either way**, before M5-Cart is treated as still fully describing the current tree. |
| **M5-C** (`GATE-REPORT-M5-C.md`) | References `PublicHeader.tsx` only to confirm its commented-out search form remains inert — that specific, narrow claim was re-checked this session (§3.1 above; the search form's own commented-out block was not found disturbed) and appears **still accurate**, but this is a narrow confirmation, not a full-file re-certification | **PARTIALLY — the one specific claim M5-C makes about this file still holds; the file as a whole is no longer the file M5-C last read** |
| **M5-A, M5-B** | Neither report's file list includes any file in §3.1/§3.2 | **YES — unaffected.** No file either report created or modified appears in this reconciliation's inventory. |
| **M5-E (all 7 sub-slices)** | None of the 7 sub-slices' own Files Created/Modified tables include any file in §3.1/§3.2 (confirmed by exact-path grep, §3.3 above) | **YES — unaffected**, with one caveat: `format:check` was reported passing "for every file this session touched" by every M5-E sub-slice, and that remains true of the files each sub-slice actually touched. The **project-wide** `format:check` command now fails (11 files, all outside M5-E's own scope) — this does not retroactively invalidate any M5-E sub-slice's own narrower claim, but it does mean **`npm run format:check` run today, without qualification, no longer returns a clean pass for the repository as a whole**, which is a fact the owner should have plainly stated, not buried in a per-file caveat. |

**Summary:** of the 9 M5 gates (M5-A, M5-B, M5-C, M5-Cart, and 5 named
+ 2 more M5-E sub-slices = 7 total, 9 gates overall), **7 remain fully
certifiable against the current tree as far as this reconciliation can
determine.** **M5-Cart is the one gate whose own evidence describes a file
(`PublicHeader.tsx`) that has since been structurally altered again by
undocumented work**, and this reconciliation cannot certify that M5-Cart's
claims about that file still hold without a direct diff this session did
not perform. M5-C's evidence about that same file is narrower and appears
to still hold on the one point it actually makes.

---

## 7. DECISIONS REQUIRED FROM OWNER

This reconciliation does not decide any of the following. Each is
presented with its real options, not a recommended default, per the
owner's explicit instruction not to have this document decide on their
behalf.

### DECISION 1 — What should happen to the undocumented 2026-09-07 work?

- **A. Formally authorize and document it** as a new, dated, owner-signed
  Change Request (e.g. `docs/CR-004-*.md`), the same durable pattern
  CR-001 and CR-003 both used, converting the existing code comments into
  a genuine documentary record.
- **B. Preserve it but defer it to post-cutover**, the same disposition
  CR-003 itself already chose for materially similar work (a from-scratch
  homepage design and new commerce-adjacent sections are, in kind, closer
  to CR-003's own Herbs Store category than to any M5 CRUD slice).
- **C. Revert it**, restoring `/`, `/home`, and `PublicHeader.tsx` to the
  state each had at the close of its last owning M5 gate, and removing the
  new, unauthorized route trees.
- **D. Other owner-directed disposition** — e.g., authorize some files
  (say, the mother-tincture admin work, if it is confirmed to be
  legitimate, previously-scoped migration work rather than a new feature)
  while deferring or reverting others. This reconciliation flags that the
  items in §3 are not uniform in character and a single blanket decision
  may not fit all of them equally well — but does not choose that
  decomposition itself.

### DECISION 2 — Does the owner authorize revalidation of affected M5 gates after the current-tree changes?

Specifically: should `GATE-REPORT-M5-CART.md`'s claims about
`PublicHeader.tsx` be re-verified against the current file (a diff, or a
fresh, targeted test run against that file's cart-badge logic
specifically) before M5-Cart is treated as fully describing the tree as it
exists today?

### DECISION 3 — Should the two newly discovered M5-E defects receive formal B-#/P-# identifiers?

- `edit-product-category` duplicate-on-edit (silently inserts a new
  top-level category instead of updating, because the edit form has no
  hidden id and posts to the Add URL) — found and disclosed in
  `GATE-REPORT-M5-E-PRODUCT-CATEGORIES.md` §5.1, never fixed, never
  numbered.
- `product-subcategory-list` dead edit link (points to
  `edit-product-subcat/{id}`, a route that does not exist anywhere in
  `routes/admin.php`) — found and disclosed in the same report §5.3,
  never fixed, never numbered.

Both are currently reproduced faithfully in the Next.js port and
documented only inside that one gate report's own text, not in
`MIGRATION-CONTRACT.md` §9.2/§9.4's numbered registers.

### DECISION 4 — M5-Cart: does the owner formally accept the already-implemented/tested M5-Cart gate despite the missing owner-signed acceptance addendum?

`GATE-REPORT-M5-CART.md` is the one M5 report in the entire sequence
without a located `**Owner:** <name> **Date:**` acceptance addendum, in
contrast to M5-A, M5-B, M5-C, and every M5-E sub-slice, each of which
carries one. This decision is independent of Decision 2 (which concerns
whether the file `PublicHeader.tsx` needs re-verification) — this decision
concerns only whether the *implementation itself*, as originally built and
tested on 2026-08-31, is formally accepted.

### DECISION 5 — Should the newly introduced `format:check` failures be treated as blocking migration work, or as belonging to the newly introduced undocumented work?

Confirmed this session: `npm run format:check` currently fails on 11
files. Of those, this reconciliation's inventory (§3) places all 11 inside
the undocumented 2026-09-07 work's own file set (`redesign/RedesignedHome.tsx`,
`PublicHeader.tsx`, the `homeopathy/`/`nutrition`/`mother-tincture` files).
**None of the 11 failing files belong to any M5-A/B/C/Cart/E-\* file set.**
This suggests the failures are a consequence of the undocumented work, not
a regression in M5's own deliverables — but this reconciliation flags it
as a decision rather than asserting it, since the owner may want this
formally confirmed (e.g., by running `format:check` scoped only to the
M5-owned file list) before relying on it.

---

## 8. RECOMMENDED SAFE STATE

Precisely, before M6 may begin:

1. **Decision 1 must be made and recorded** in a durable, owner-signed form
   (a new CR, a deferral record, or a revert instruction) — the same
   evidentiary standard every other authorization in this project has been
   held to since `GATE-REPORT-STATE-RECONCILIATION.md` first raised this
   exact concern on 2026-08-22.
2. **Decision 2's outcome must be executed or explicitly waived** — either
   `PublicHeader.tsx` is re-verified against M5-Cart's claims, or the owner
   explicitly accepts the risk of proceeding without that re-verification.
3. **Decision 4 must be recorded**, closing the one durable-acceptance gap
   in the M5 sequence.
4. **The unverified safety question in §3.2** (whether
   `src/lib/motherTincture/db/client.ts` carries the same non-production
   MongoDB guard every other database-touching file in this project uses)
   should be checked — not fixed, not touched, only checked and reported —
   before any further work builds on top of it, since M6 will itself add
   more MongoDB write paths and a second, unaudited database client sitting
   in the same tree is a risk this project's own established discipline
   would normally have caught at that file's own gate.
5. **Decisions 3 and 5 are lower-priority** (register hygiene and a
   diagnostic classification, respectively) but should be recorded before
   M5 is described anywhere as fully, formally closed.

**M6 remains STOPPED until the owner decisions above are recorded and the
affected tree/gates are reconciled.**

This document implements nothing. It reverts nothing. It touches no
production system, no Atlas connection, and no application behavior. It is
a record of what exists and what evidence does or does not support it,
for the owner's decision.

---

*End of M5 Post-Gate Reconciliation. Per instruction, this document stops
here. M6 is not begun by this document.*
