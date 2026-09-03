# CHANGE REQUEST CR-003 — Herbal E-Commerce Section ("Herbs Store")

**Raised by:** Migration Implementer (on request, this session)
**Date:** 2026-08-30
**Requested by:** Owner (homeopathy38@gmail.com) — request received this session
**Decided by:** Owner (homeopathy38@gmail.com), 2026-08-30
**Amended by:** Owner (homeopathy38@gmail.com), 2026-08-30 — see §10
**Milestone:** **M15 "Herbs Store"**, opened early per §10 amendment, running
as an additive parallel track alongside the in-flight M5+ migration.
**Contract version:** 1.0
**Status:** 🟢 **AMENDED — APPROVED FOR IMMEDIATE IMPLEMENTATION (OPTION A, superseding the original Option B deferral)** (Owner amendment, 2026-08-30)

> **§0–§9 below are preserved verbatim as the historical record of the
> original decision (Option B, deferred).** They document real analysis
> that remains true and relevant (unresolved design questions, protected
> components, risk profile). **§10 is the controlling, current decision** —
> the owner has since exercised the override it describes and explicitly
> re-selected Option A. Read §10 for what is actually authorized now.

---

## ⛔ OWNER DECISION — 2026-08-30 — READ FIRST

| Item | Disposition |
|---|---|
| **Herbal e-commerce section (this CR, §2 scope)** | ✅ **APPROVED IN PRINCIPLE**, 🔒 **DEFERRED — POST-CUTOVER.** Not to begin until M13 is signed off and Next.js is production source of truth. |
| **Current 1:1 migration (M0–M13)** | ▶️ **Continues unaffected and unblocked.** This CR is not a prerequisite for, and does not pause, any in-flight milestone. |
| **Reference site (`indianjadibooti.com/Jadistore/`)** | Confirmed **UI/UX reference only** — layout, interaction, and information-architecture patterns. No branding, copy, images, testimonials, or product data may be copied, per the original brief's own §3 and this CR's §2. |
| **Branding** | The deferred build uses **Spaks Homeopathy / Spaks India Business Solution Pvt Ltd** branding and existing Spaks assets, integrated into the existing application — not a separate/unrelated site (Option D rejected). |
| **Architecture** | Deferred build must respect the (by-then-cutover) Next.js app's existing routing, component, data, cart, and auth conventions — reuse first, extend only where required, per §46/§47-style discipline the parent migration itself follows. |
| **Existing site behavior** | ❌ **Not to be altered** by this CR, now or during the deferred build's implementation, except where the deferred build's own future CR/milestone explicitly approves a specific additive change. |
| **`add-hurbcat` admin screen / B-14 search branch** | 🚫 **Out of scope, untouched**, per §1 and §4 of this CR — these are preserved legacy defects, not part of the herbal store, and remain governed solely by the parent migration contract. |

**Consequence:** No code, route, schema, dependency, or styling change results
from this CR today. The only artifact produced is this document.

**Successor:** A new Change Request / milestone brief (tentatively **CR-004**
or folded directly into **M15**) is to be opened **after M13 cutover**,
re-confirming scope, product-model shape (parallel model vs. schema
extension), taxonomy design, and admin integration — see §7 and §9.

---

## 0. WHY THIS CR EXISTS INSTEAD OF DIRECT IMPLEMENTATION

The request (this session) was to integrate a complete herbal-products
e-commerce section — hero, category grid, wellness-concern navigation,
product listing/filter/sort, product detail pages, quick view, cart/wishlist
UI, testimonials, blog, SEO structured data, admin CRUD for a new product
model, etc. — modeled on `indianjadibooti.com/Jadistore/`, under the existing
"Herbs" area of this site.

Before writing any code, this repository was audited per the task's own
instruction to inspect architecture first. That audit found `MIGRATION-CONTRACT.md`
governing `spakshomeopathy-next/` as **"the constitution of this project"**,
whose stated primary objective (§1.1) is a Next.js app **"behaviorally
indistinguishable"** from the live Laravel 5.8 application — not an extended
or improved one. §3.2 explicitly excludes *"UI/UX redesign... Adding
features, pages, fields, filters, sorts, or reports"*, and NN-2 states
*"No silent changes. Every deviation... requires a Change Request and owner
approval before implementation."*

Implementing the requested feature directly would violate, at minimum:

| Rule | What it forbids | How this request would break it |
|---|---|---|
| F-8 | Redesigning/restyling/re-theming any UI | New herbal-store visual system (hero, category cards, etc.) |
| F-9 | Adding loading states, quick-view modals, autosave-style UX | Quick View modal, skeleton loaders, filter drawers |
| F-10 | Adding/renaming routes | `/herbs`, `/herbs/[slug]`, `/herbs/category/[cat]`, `/herbs/wellness/[cat]`, new API routes |
| F-19 | Adding SEO artifacts (sitemap, canonical, JSON-LD, OG) | Requested product/breadcrumb structured data |
| F-23 | Reimplementing jQuery widgets (bxSlider, Owl, Fancybox, Swiper, TouchSpin) in React | Product gallery zoom/lightbox, quantity TouchSpin-style selector |
| F-27 | Changing pagination sizes / adding pagination where none exists | New catalog pagination |
| F-28 | Adding caching of any kind | API caching requested in the brief |
| F-30 | Upgrading/replacing front-end CSS | New component styling system for product cards, filters, etc. |
| §3.2 | Adding features, pages, fields, filters, sorts, reports; content editing | The entire feature is new; seed catalogue is new content |
| §6.2 | Normalizing/extending the 83-column `products` table | Brief's proposed model (variants, wellness tags, botanical name, etc.) doesn't fit the existing schema without extension |

None of these are close calls or accidental — the brief asks for exactly the
category of work Part 6 exists to gate. So per **NN-2 / IR-10** ("never make
a silent decision... raise a Change Request"), this document is Step 1–3 of
the Five-Step Change Request Process (§20), stopping at Step 4 (await
approval) rather than proceeding to Step 5 (implement).

---

## 1. WHAT EXISTS TODAY (Step 1 — Identify)

Verified this session, directly against the repository:

- **No herbal-store concept exists anywhere in the app.** The only "Herbs"
  references in the entire codebase are:
  - `MIGRATION-CONTRACT.md:291` and `:416` — **B-14**, a documented *defect*:
    a stray `echo` and hardcoded `p_cat = '24'` in the disease/product search
    branch, explicitly listed as preserve-as-is (§6.3 "obvious improvement
    trap" — removing the stray echo is called out by name as forbidden
    without approval).
  - `src/app/admin/(shell)/add-hurbcat/page.tsx` — the admin "Add Category"
    screen, ported from Laravel's `AddHurbCat`/`Savecategory`. "Hurbcat" is a
    **preserved typo** of "herb category" in the legacy route/method name
    used generically for product categories (e.g. "Ashwagandha Q", "Cough
    Syrup") — it is not, and never was, a herbal-store feature. The page
    itself is a flagship example of preserved defects (mislabeled as "Add
    Product" in its `<title>` and submit button — see the file's own header
    comment).
- **There is no "Herbs" navigation entry** in `PublicHeader.tsx` distinct
  from the existing product/disease/category navigation. The task's premise
  of "the existing website already has a Herbs nav item — upgrade that page"
  does not hold; nothing needs upgrading because nothing herbal-specific
  exists to upgrade.
- **Product model:** `products` is an 83-column MySQL table (10 inline
  variant slots, no normalized variants table) mirrored into MongoDB per
  `src/lib/mongodb/schemas/`. §6.2/F-20 forbid normalizing it. The brief's
  product model (slug, wellnessCategories\[], botanicalName, availableSizes\[],
  structured variants, tags\[], SEO fields) does not fit this schema without
  either extending the live table (F-5/F-13 risk) or introducing a parallel
  model — both are contract decisions, not implementation details.
- **Cart:** ported from Laravel's `darryldecode/cart` session semantics
  (§7.2 of the contract), explicitly frozen — F-22 forbids changing cart
  persistence semantics.
- **Admin:** a real, working admin panel exists (`/admin/(shell)/...`) with
  product/category/blog/slider CRUD, ported 1:1 from the Laravel
  `AdminController`. It is not designed for a second, parallel product
  taxonomy (categories vs. wellness-concern tags vs. herb-form facets).
- **Styling:** legacy Bootstrap 4 + jQuery widget stack ported byte-for-byte
  (`evidence-prod-style-*.css`, bxSlider/Owl/Fancybox/Swiper), not a modern
  component/Tailwind system the brief assumes ("Tailwind or component
  system" — §13 of the task). There is no design-token or utility-first CSS
  layer to build a new storefront on without introducing one.

**Dimension affected (§7.1):** effectively all seven — markup/DOM, routes,
database writes/reads, session/cart state, `<head>`/SEO, business logic
(pricing/variants), and asset pipeline.

---

## 2. WHAT IS PROPOSED (Step 1, cont.)

A full herbal e-commerce storefront under `/herbs`, modeled on
`indianjadibooti.com/Jadistore/`'s UX patterns (not branding/copy/images),
using Spaks branding, comprising — per the original brief:

- New product data model (or extension) supporting variants, wellness tags,
  herb-form taxonomy, botanical metadata, SEO fields
- New routes: store homepage, category/wellness listing pages, product
  detail pages, search
- New UI: hero, category grids, filters (desktop sidebar + mobile drawer),
  sort, product cards with badges/ratings, quick view modal, product gallery
  with zoom, testimonials, trust/delivery section, blog teaser, recently
  viewed, related products
- Cart/wishlist integration (reuse existing cart if compatible; extend if not)
- New admin CRUD screens for the above
- SEO: structured data, canonical URLs, OG tags, sitemap entries
- ~15–30 seed products as demo data

This is a **net-new product line**, not a migration task — there is no
Laravel behavior to reproduce for any of it.

---

## 3. JUSTIFY (Step 2)

**Category: [x] Owner-requested** (the only applicable category — this is
not a technical-impossibility or security/legal/data-integrity fix).

This is a legitimate business request, not a smuggled "improvement." But per
the contract's own framing (§1.3, "Explicit non-objectives" — the migration
does not aim to add UX/features; that's a *"separate follow-on project"*),
work of this scope and nature is exactly what the contract reserves for
**after** cutover, so it doesn't destabilize the in-flight 1:1 migration
(currently at M5-B, per `docs/GATE-REPORT-M5-B.md`, accepted 2026-08-26).

---

## 4. IMPACT (Step 3)

| Dimension | Effect |
|---|---|
| **Users affected** | All three roles. Guests/buyers get a large new store surface; admins get new CRUD screens. |
| **Database effect** | New collections/tables (or a schema extension) alongside the live 83-column `products` table and its MongoDB mirror — a real design decision (parallel model vs. extension), not something to decide unilaterally. |
| **SEO effect** | New indexed URL tree (`/herbs/...`), new structured data — additive, but touches `<head>` patterns F-18/F-19 currently forbid changing. |
| **Routes/forms/features affected** | None of the *existing* 56+13+102 cataloged routes need to change for this to work as an additive tree, **provided** the existing `/herbs`-adjacent legacy search (B-14) and `add-hurbcat` admin screen are left untouched, not folded into the new feature (folding them in would itself be an undocumented behavior change to a cataloged defect). |
| **Completed milestones affected** | None directly, if built as a genuinely separate route tree and admin section reusing (not modifying) `PublicHeader`/`PublicFooter`/cart internals. Risk is schedule/focus: it's a substantial parallel build during an active, gated migration. |
| **Rollback difficulty** | Low if isolated under `/herbs` + new collections; the existing migration's rollback plan (`D-10`) is unaffected as long as shared files (`PublicHeader.tsx`, `AdminSidebar.tsx`, cart internals) are extended additively, never rewritten — same protected-component posture as CR-001 §24.5. |
| **Additional testing required** | Full new Playwright suite (14 flows listed in the original brief), new unit/integration tests, and a re-run of the existing verify suite (`npm run verify`) to confirm zero regression to the migration. |

---

## 5. WHAT I DID **NOT** DO

Per NN-2/IR-10 I did not: create any `/herbs/*` route, modify
`PublicHeader.tsx`/`PublicFooter.tsx`/`AdminSidebar.tsx`, touch the `products`
schema or cart internals, add any npm dependency, write seed data into the
database, or touch the B-14 search branch or `add-hurbcat` admin page. This
document is the only file added.

---

## 6. OPTIONS FOR THE OWNER

| Option | Description | Consequence |
|---|---|---|
| **A — Approve now, in-contract** | Build it inside `spakshomeopathy-next` immediately, as an additive `/herbs` tree + new admin section + new collections, reusing existing auth/cart/layout components wherever compatible. | Fastest path to a working store; runs alongside the still-open M5+ migration work — needs the owner's explicit OK to interleave. |
| **B — Approve, deferred to post-cutover (CR-001-style)** | Same scope as A, but opened only after the 1:1 migration reaches cutover (M13) and Next.js is production source of truth — mirrors how CR-001/CR-002 (admin settings) were handled. | Keeps the migration's risk surface clean; store work starts once the legacy-parity project is done and signed off. |
| **C — Reject / not now** | Do not build this under the current contract. | No change; revisit later as its own project brief. |
| **D — Build as a fully separate app** | Scaffold the herbal store as an independent application (own repo or top-level folder, e.g. sibling to `spakshomeopathy-next`), linked from the existing site's nav rather than embedded in it. | Zero contract conflict, but loses component/auth/cart reuse the brief explicitly asked for ("reuse existing components," "reuse existing cart"), and duplicates infrastructure. |

**Implementer's recommendation:** **Option B**, for the same reason CR-001's
Category B was deferred — it lets the in-flight, gated 1:1 migration finish
without new-feature risk mixed into it, while preserving full component/
cart/auth reuse (Option A's benefit) once cutover lands. Option A is
reasonable only if the owner explicitly wants to run both efforts in
parallel and accepts the added coordination risk during M5+.

**Owner selected: Option B** (2026-08-30) — see §8.

---

## 7. MILESTONE (as decided)

Not part of the current M0–M13 sequence, and **not opened by this CR**.
Reserved as a new track — tentatively **M15 "Herbs Store"** — to be opened
only after **M13 cutover** is signed off and the Next.js application is the
production source of truth, per Option B. Opening M15 requires its own
follow-up brief (§9) that re-confirms scope and resolves the design
questions this CR intentionally leaves open (schema shape, taxonomy,
component reuse boundaries).

---

## 8. APPROVAL

```
Owner decision:  [ ] OPTION A — approve now, in-contract
                 [x] OPTION B — approve, deferred to post-cutover
                 [ ] OPTION C — reject / not now
                 [ ] OPTION D — separate application
Conditions:      1. Work does not begin until M13 cutover is signed off and
                    D-10's rollback window has closed (same precondition
                    CR-001 §24.4 sets for CR-002).
                 2. Reference site (indianjadibooti.com/Jadistore/) remains
                    UI/UX reference only — no branding, copy, images,
                    testimonials, or product data copied.
                 3. Built as an integrated, additive part of Spaks
                    Homeopathy (existing routing/component/data/cart/auth
                    conventions reused), not a separate/unrelated site.
                 4. No unsupported medical/cure claims; wellness-oriented
                    language only, with disclaimers per the original brief.
                 5. `add-hurbcat` and the B-14 search branch remain
                    untouched, governed solely by the parent migration
                    contract.
                 6. A follow-up brief/CR (§9) re-opens the outstanding
                    design questions before any implementation begins.
Signature:       Owner (homeopathy38@gmail.com)
Date:            2026-08-30
```

**Rationale (owner-facing summary):** The 1:1 migration is mid-flight
(M5-B accepted 2026-08-26) and is explicitly scoped to *not* include new
features (§1.3 of the contract). Interleaving a large, genuinely new
e-commerce build into that work would mix two different risk profiles —
legacy-parity fidelity vs. new-feature correctness — inside one gated
process. Deferring to post-cutover, exactly as CR-001's admin-settings
request was deferred to CR-002, keeps the migration's remaining milestones
(M6–M13) clean while fully preserving the original goal: an herbal store
integrated into Spaks Homeopathy, reusing its real architecture, once that
architecture is the live, stable production system rather than a
mid-migration target.

Until M15 is opened, **all work described in §2 remains un-started**, and
the contract's existing rules (NN-2, IR-1, F-5 through F-30, §2.4, §3.2)
remain fully in force, unmodified. The Approved Deviation Log (§22 of the
contract) stays untouched by this CR — no deviation has been implemented,
only a future one authorized in principle.

---

## 9. NEXT STEPS — TO BE DONE AFTER M13 CUTOVER, NOT NOW

1. Confirm M13 is signed off and `D-10`'s rollback window is closed.
2. Open **M15 "Herbs Store"** (or a follow-up **CR-004**) that re-decides,
   with the then-current architecture in view:
   - Product model: parallel collection/table vs. extending the 83-column
     `products` schema (§1 of this CR flagged this as unresolved).
   - Category/wellness taxonomy design and its relationship to the existing
     `add-hurbcat`-driven category system.
   - Which components are safely reused (cart, auth, `PublicHeader`/
     `PublicFooter` extension points) vs. genuinely new.
   - Styling approach, given the legacy Bootstrap/jQuery stack has no
     existing Tailwind/design-token layer to build on (§1 of this CR).
   - Seed catalogue (~15–30 products), SEO/structured-data scope, and the
     admin CRUD surface for the new model.
3. Re-run this contract's Five-Step process (§20) for each of those
   sub-decisions rather than deciding them ad hoc during implementation.
4. Only then begin implementation — homepage, category/wellness pages,
   product detail pages, cart/wishlist integration, admin screens, SEO,
   and tests — as an additive `/herbs` tree, using
   `indianjadibooti.com/Jadistore/` strictly as a UI/UX reference and Spaks
   branding/content throughout, per the original brief.

**This CR does not authorize starting step 4 today.** It authorizes the
*principle* of the work and records the owner's decision on how it will be
sequenced.

---

## 10. AMENDMENT — 2026-08-30 — OWNER OVERRIDE: EARLY IMPLEMENTATION AUTHORIZED

### 10.1 What changed

The owner has reviewed the §8 deferral and **explicitly overridden it**,
requesting implementation begin now, inside `spakshomeopathy-next`, for a
demonstration to a non-technical stakeholder. This is a **new owner decision
superseding §8's timing condition**, made with full knowledge of the original
analysis (§0–§4) — not a bypass of it.

| Item | Original decision (§8) | Amended decision (§10, now controlling) |
|---|---|---|
| **Option** | B — deferred to post-cutover | **A — approved for immediate, in-contract implementation** |
| **Timing gate** | Not before M13 cutover | **Now**, in parallel with the in-flight M5+ migration |
| **Everything else in §8's conditions 2–6** | — | **Unchanged, still binding** (see 10.3) |

### 10.2 Why this is a valid CR amendment, not a silent bypass

Per §20 of the contract (Five-Step Change Request Process) and NN-2, an
owner-requested change is a valid justification category, and the owner is
the sole authority the process defers to at Step 4 (Await Approval). §8
already recorded a decision; this is the same owner amending that decision
through the same document, in writing, before any implementation — exactly
the channel the contract requires. Nothing here is being decided by the
implementer's own judgment.

### 10.3 Conditions carried forward unchanged from §8

Conditions 2–6 of §8 remain fully binding on this early implementation:

- Reference site is **UI/UX reference only** — no branding, copy, images,
  testimonials, or product data copied from `indianjadibooti.com/Jadistore/`.
- Built as an **integrated, additive** part of Spaks Homeopathy — reuses
  existing routing/component/data/cart/auth conventions; not a separate app,
  not a standalone prototype.
- **No unsupported medical/cure claims**; wellness-oriented language only,
  with disclaimers.
- `add-hurbcat` admin screen and the B-14 legacy search branch remain
  **untouched** — governed solely by the parent migration contract, out of
  scope for the Herbs Store.
- Protected-component discipline from CR-001 §24.5 applies here too:
  `PublicHeader.tsx`, `PublicFooter.tsx`, `AdminSidebar.tsx` and cart
  internals are **extended additively, never rewritten** — new nav entries
  and cart line-item support are additive changes; existing markup,
  whitespace-parity (`OI-13`), routes, and behavior for non-Herbs pages are
  preserved exactly.

### 10.4 New condition specific to early/parallel implementation

- **7. No interference with the in-flight migration.** All Herbs Store code
  lives in new files under new paths (`src/app/herbs/**`,
  `src/components/herbs/**`, new lib/service modules, new MongoDB
  collections). Any edit to a *shared* file already governed by the
  migration (header/footer/layout/cart) is the minimum necessary addition,
  called out explicitly in the implementation report (§11), and does not
  change behavior for any existing route. `npm run verify` (typecheck +
  lint + format + test) must still pass for the whole project afterward,
  and existing routes are spot-checked for regression before this CR is
  marked implemented.

### 10.5 Resolving the §9 open design questions (decided now, not deferred)

§9 flagged five design questions as needing a follow-up brief before
implementation. Given the owner's timing override, they are resolved here
directly, using the least invasive option in each case:

| Question | Decision |
|---|---|
| Product model: parallel model vs. extending the 83-column `products` table | **Parallel model.** A new `herbProducts` MongoDB collection (project already uses MongoDB — see `src/lib/mongodb/`), fully separate from the legacy `products` table/schema. Zero risk to F-20/F-5/F-13; the legacy table is not touched, read, or written by the Herbs Store. |
| Category/wellness taxonomy vs. `add-hurbcat`-driven categories | **Fully separate taxonomy.** New `herbCategories` / wellness-tag data, not sourced from or written into the legacy category system `add-hurbcat` manages. No shared IDs, no shared admin form. |
| Component reuse boundaries | **Reuse:** design tokens/CSS approach, general page shell (`<html>`/root layout), existing auth session check (for account-gated features like wishlist), existing cart *data layer* if its shape can hold an herb line item without changing existing item semantics. **New:** all Herbs-specific UI (header nav additions only, hero, product cards, filters, PDP, quick view, admin screens for herb products). If the existing cart cannot cleanly hold herb items without changing existing cart behavior, a parallel, clearly-labeled Herbs cart is used instead — existing cart behavior is never altered to accommodate this. |
| Styling approach (no existing Tailwind/token layer) | **Scoped CSS, additive.** New CSS scoped under Herbs-specific class namespaces/CSS Modules, not a site-wide Tailwind adoption (F-30 still forbids replacing the *existing* front-end CSS for legacy pages) — new stylesheets only apply to new Herbs components/pages. |
| Seed catalogue, SEO/structured-data scope, admin CRUD surface | **In scope now:** ~20–30 seed herb products; per-page metadata (title/description/OG) and Product/Breadcrumb JSON-LD **scoped to `/herbs/**` routes only** (F-19 governs the *existing* pages' `<head>`, not new ones); a new Admin → Herbs section (new screens, reusing existing admin auth/layout shell) for CRUD on the new model. |

### 10.6 Effect on the Approved Deviation Log

This CR does not modify Laravel-parity behavior for any existing route, so
it does not add an entry to the parent contract's Deviation Log (§22) —
that log tracks divergence from Laravel behavior on *migrated* routes, and
the Herbs Store is new surface area with no Laravel equivalent to diverge
from. This CR itself is the authorization record for the new surface area.

### 10.7 Updated approval block

```
Owner decision:  [x] OPTION A — approve now, in-contract   ← AMENDED, controls
                 [ ] OPTION B — approve, deferred to post-cutover (superseded)
                 [ ] OPTION C — reject / not now
                 [ ] OPTION D — separate application
Conditions:      §8 conditions 2–6, plus new condition 7 (§10.4), all binding.
Signature:       Owner (homeopathy38@gmail.com)
Date:            2026-08-30 (amendment)
```

**Consequence:** Implementation of the Herbs Store inside
`spakshomeopathy-next` is now **authorized to begin immediately**, scoped
exactly as described in §10.5, subject to the conditions in §10.3–10.4. An
implementation report will be produced on completion per the original
brief's reporting requirements.

---

*End of Change Request CR-003 — AMENDED 2026-08-30: APPROVED FOR IMMEDIATE IMPLEMENTATION (OPTION A)*
