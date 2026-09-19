# CHANGE REQUEST CR-006 — Full Admin CMS/Catalog Management Platform

**Raised by:** Migration Implementer (on owner instruction)
**Date:** 2026-09-12
**Requested by:** Owner (homeopathy38@gmail.com), 2026-09-12
**Milestone:** Not part of the M0–M13 1:1-migration sequence. Proposed as
an additive, post-cutover track — see §7.
**Contract version:** 1.0
**Status:** 🟡 **AWAITING OWNER DECISION — nothing implemented, no code
written, no schema designed, no database touched.**

> **NOTHING HAS BEEN IMPLEMENTED, AND NOTHING WILL BE UNDER THIS CONTRACT
> UNTIL THE APPROVAL BLOCK IN §8 IS SIGNED.** This document is the Five-Step
> Change Request (contract §20) for a very large request: a from-scratch,
> full-featured admin CMS covering catalog, disease/medicine relationships,
> herbs, orders, content, SEO, media, RBAC, and audit logging — well beyond
> the existing Laravel admin's actual functionality. Per contract §20 Step 4,
> **work on this item stops here pending written approval.** The 1:1
> migration (M0–M13) is unaffected and continues.

---

## 0. WHY THIS CR EXISTS INSTEAD OF DIRECT IMPLEMENTATION

The request that prompted this document asks for a ~30-module admin
platform: new database entities (variants, potencies, coupons, audit logs,
redirects, RBAC, media library, homepage-section CMS, and more), a rebuilt
dashboard UI, bulk actions, CSV import/export, and full server-side RBAC
enforcement. Implementing this directly, without a CR, would violate:

- **Contract §3.2** (Excluded activities) — bans "adding features, pages,
  fields, filters, sorts, or reports," UI/UX redesign, and "refactoring
  business logic into services/models beyond the mechanical extraction in
  §5.2," all explicitly in scope of the request.
- **Contract §5.2 / §10.2** — forbid schema redesign or new tables/collections
  justified by "best practice" rather than documented behavioral necessity.
  Nearly every proposed entity (`MedicineVariant`, `Coupon`, `AuditLog`,
  `Redirect`, `RolePermission`, `Media`, …) is new, not a 1:1 port of an
  existing Laravel table.
- **Owner Decision D-11** — the target database (MongoDB Atlas) is locked,
  but D-11 §4 explicitly authorizes **analysis only**; designing new
  collections or writing application code against them is "NOT authorized,
  explicitly, until separately instructed."
- **CR-001 §24.4** — already reserved **CR-002** as the successor for
  "Admin-Editable Site Settings," gated on M13 cutover being signed off.
  This request is a superset of that scope and cannot proceed while CR-002's
  own precondition (M13 signed, D-10 rollback window closed) is unmet.
- **Precedent** (CR-003, CR-005) — even owner-directed side work in this
  project is formalized as a dated, numbered CR with an explicit approval
  block before being treated as in-scope. Nothing here has that yet.

This CR exists so the owner can approve, reject, defer, or scope down the
request with full visibility into what it costs against the active
migration — the same discipline CR-001/003/005 already established.

---

## 1. WHAT EXISTS TODAY (Step 1 — Identify)

### 1.1 The Laravel admin (source of truth, being migrated as-is)

`spakshomeopathy.com/app/Http/Controllers/AdminController.php` and its
routes back the existing admin at `spakshomeopathy.elitesfly.com/admin`.
Its actual, real functionality — confirmed against the live route table in
`docs/M3-APPLICATION-MAPPING.md` (172-row catalog, ~102 admin routes) — is:

| Area | What actually exists in Laravel |
|---|---|
| Auth | Single admin login (`utype = 1`), session-based, no roles/permissions table |
| Products | Flat `products` table (75–83 columns, category via `cat_id`/`subcat_id`), CRUD, no variant/potency sub-model, no disease↔medicine join table |
| Categories | `category` table with `type` flag distinguishing product (`H`) vs disease (`N`) categories; single-level parent/child via `parent_id` |
| Diseases | Modeled as `category` rows with `type = 'N'`, not a distinct rich entity — no symptoms/causes/FAQ fields exist in the schema today |
| Herbs | `add-herb` / `edit-herb` / `herbs-list`, a separate flow, added later (CR-003) |
| Blog | Full CRUD (`add-post`, blog categories, list, edit, delete) |
| Sliders | Homepage slider CRUD (`add-slider`, list, edit, delete) — the closest existing thing to "banner management" |
| Pincodes | Serviceable-pincode CRUD (delivery-area check, unrelated to content) |
| Enquiries | Read-only list + detail view of `save-enquiry` / `save-appointment` submissions — no status workflow, no notes field |
| Users | `users-list` (customer list), `user-profile`, `change-password` — no role assignment, no permission model |
| Orders | **No dedicated admin order-management UI found in the routed admin controller** — needs confirmation before CR-002/006 scope is finalized (flagged as an open question, §9) |
| Coupons | **Does not exist** in the Laravel schema or routes |
| Media library | **Does not exist** — uploads go directly to per-feature folders (`uploaded_files/`), no central asset browser |
| Audit log | **Does not exist** |
| Redirects | **Does not exist** |
| RBAC / roles | **Does not exist** — one implicit admin role only |
| Homepage section CMS | **Does not exist** as a generic system — homepage content is currently hardcoded in Blade/React (see CR-005 for the one exception already approved) |
| Pages CMS (About/Privacy/Terms/etc.) | **Does not exist** — these are static Blade/React templates today |

**Conclusion:** roughly a third of the requested modules (orders detail
workflow, coupons, media library, audit log, redirects, RBAC, homepage/page
CMS, testimonials, videos-as-CMS, navigation builder) have **no Laravel
equivalent at all**. They are net-new product, not migration. This matters
because the contract's "1:1 migration" framing and the "improvement vs.
migration" line the whole project is built around depend on that
distinction being named explicitly, not blurred.

### 1.2 What is already approved and adjacent

- **CR-003** (Herbs Store) — approved, implemented. Herb CRUD already
  exists; this CR should extend it, not duplicate it.
- **CR-005** (Homepage redesign + new sections) — approved, implemented.
  Any "Homepage CMS" module in this CR must build on top of what CR-005
  already shipped, not re-architect it.
- **CR-001 / reserved CR-002** — Admin-editable site settings, deferred to
  post-cutover. This CR's "Settings" module (§32 of the request) is exactly
  CR-002's scope and should be merged into this CR's Phase 8 rather than
  implemented twice.
- **Owner Decision D-11** — MongoDB Atlas is the target store. Every new
  entity this CR proposes must be designed against that, following D-11 §5's
  governing principle (mechanical/behavioral translation, not aesthetic
  redesign) once collection design is separately authorized.

---

## 2. WHAT IS PROPOSED (Step 1, cont.)

A phased, additive admin platform, built on the existing migrated admin
(`src/app/admin`) rather than replacing it, covering:

1. **Modules that are a genuine 1:1 migration** (no CR needed under §2.1 of
   the contract — proceeds as normal migration work, already in progress):
   products, product categories, disease categories (as `category` rows),
   blog, sliders, herbs, pincodes, enquiries (read), users (read).

2. **Modules that extend existing Laravel entities with new
   admin-facing structure** (needs approval — new fields/relationships not
   in the current schema): medicine↔disease many-to-many, potency/variant
   sub-records, inventory status fields, SEO fields per entity.

3. **Modules with no Laravel equivalent — genuinely new product** (needs
   approval, and is the largest scope item): orders workflow, customers
   dashboard, coupons, media library, homepage-section CMS, pages CMS,
   navigation builder, testimonials, video CMS as a first-class module,
   redirects, RBAC/roles/permissions, audit log, dashboard analytics/charts.

Full module list, field-level specs, and suggested routes are as given in
the owner's original request (preserved verbatim in the session record);
not restated here to avoid drift between two copies of the same spec.

---

## 3. JUSTIFY (Step 2)

**Category: Owner-requested change** (contract §20 Step 2, third category).
No technical-necessity or security/legal claim is made for the *new*
modules (§2 items 2–3) — they are additional capability the owner wants,
which is a valid basis under the contract's own rules and does not need to
be dressed up as something else.

For the modules that are genuine migration (§2 item 1), no CR is needed at
all — they proceed under the existing migration mandate.

---

## 4. IMPACT (Step 3)

| Dimension | Effect |
|---|---|
| **Users affected** | Admin only. No guest/buyer-facing behavior changes proposed, **except** where a new admin capability (e.g. homepage section toggles, coupon codes at checkout) is designed to affect the public site — each such case must be its own named sub-item with explicit approval, not bundled silently. |
| **Database effect** | Large. New collections/entities beyond the current 34-table Laravel schema (or their MongoDB equivalents, pending D-11's schema-design authorization). This is the single largest-impact item in the CR. |
| **SEO effect** | Must be net-neutral or positive only: existing slugs/URLs must not change as a side effect of adding SEO-management fields. Any slug-changing capability in the new admin must ship with the redirect module (§25 of the request) active from day one, not as a follow-up. |
| **Routes/forms/features affected** | Additive — new `/admin/*` routes. Should not modify existing migrated admin routes' behavior (list/CRUD for products, categories, blog, sliders, herbs, pincodes) beyond what's needed to link new relationship data (e.g. adding a "Diseases" tab to the existing product edit form). |
| **Completed milestones affected** | None directly, **provided** this work is sequenced after or alongside M0–M13 without altering already-gated files. Contract §20 Step 3 requires this be re-checked at each phase's gate report. |
| **Rollback difficulty** | Low per phase if built additively (new routes/collections only); high if any phase touches shared components (`PublicHeader`, `PublicFooter`, `AdminSidebar` — see CR-001 §24.5's existing protection, which this CR inherits unchanged). |
| **Additional testing required** | Every new module needs its own CRUD + auth/RBAC test coverage (this project's O-3 objective — first regression suite — extends naturally to net-new admin code, since there's no legacy PHP behavior to preserve here). |
| **Interaction with D-11 (MongoDB)** | Collection design for every new entity in §2 items 2–3 requires the separate authorization D-11 §4 withholds today. This CR does not itself grant that authorization — see §9 Decision 2. |
| **Interaction with reserved CR-002** | This CR's Settings module (request §32) subsumes CR-002. If approved, CR-002 should be marked "superseded by CR-006" rather than opened separately. |

---

## 5. WHAT I DID **NOT** DO

- Did not create any database table, collection, or index.
- Did not write any admin page, API route, or component beyond what
  already exists in `src/app/admin`.
- Did not modify `PublicHeader.tsx`, `PublicFooter.tsx`, `AdminSidebar.tsx`,
  or any already-gated M-series file.
- Did not touch the Laravel source (`spakshomeopathy.com/**`).
- Did not assume D-11's MongoDB schema-design authorization has been
  granted — it has not.
- Did not treat the owner's original 2500-line request as pre-approved; it
  is treated as a proposal requiring the same sign-off every prior CR in
  this project has required.

---

## 6. OPTIONS FOR THE OWNER

**A. Approve in full, phased** — build all ~30 modules across the 9 phases
in §7 below, one phase at a time, each with its own gate report, run
sequentially alongside (not blocking) the active M0–M13 migration.

**B. Approve a reduced core now** — Phase 2–4 only (auth/RBAC shell,
catalog: medicines/categories/diseases/disease-medicine relationship,
potencies, inventory), deferring commerce/content/system modules to later
CRs, closer to how CR-001 was originally scoped before being deferred
entirely.

**C. Defer entirely to post-cutover**, the same disposition CR-001 chose
for its much smaller settings request — this is the most consistent
option with this project's established pattern of protecting migration
velocity, given this request is far larger than CR-001's.

**D. Reject / send back for re-scoping.**

No option is recommended over another here; per this project's own
established practice (see CR-003 §6, M5-POST-GATE-RECONCILIATION §7), the
CR presents real options rather than defaulting to one on the owner's
behalf.

---

## 7. PROPOSED PHASING (if approved, Option A or B)

Unchanged in structure from the original request, mapped to this project's
gate-report discipline — **each phase stops for explicit written approval
before the next begins** (contract §20 Step 4), exactly as the owner's own
prompt independently required:

| Phase | Scope | Depends on |
|---|---|---|
| 1 | Architecture doc, entity map, route map, API map (documentation only — this CR is effectively Phase 1's output) | This CR's approval |
| 2 | Auth/RBAC shell: admin login (extends existing), roles, permissions, protected layout | Phase 1 |
| 3 | Catalog: medicines, categories, diseases, disease categories, medicine↔disease, potencies/variants, inventory | Phase 2, D-11 schema authorization |
| 4 | Commerce: orders workflow, customers, coupons | Phase 3 |
| 5 | Herbs: extend existing CR-003 herb CRUD with wellness categories, richer fields | Phase 3 |
| 6 | Content CMS: homepage sections (extends CR-005), banners, videos, articles, testimonials, pages, navigation | Phase 2 |
| 7 | Media library + SEO + redirects | Phase 6 |
| 8 | System: admin users, roles, permissions UI, audit log, **settings (absorbs CR-002)** | Phase 2 |
| 9 | Testing/hardening pass across all phases | All prior |

---

## 8. APPROVAL

```
Owner decision:  [ ] APPROVED (Option A — full, phased)
                 [ ] APPROVED (Option B — reduced core)
                 [ ] DEFERRED to post-cutover (Option C)
                 [ ] REJECTED / RETURN FOR RE-SCOPE (Option D)

Conditions:


D-11 schema-design authorization granted alongside this CR?  [ ] YES  [ ] NO / SEPARATE DECISION

CR-002 disposition:  [ ] Superseded by this CR's Phase 8
                     [ ] Kept separate

Signature (homeopathy38@gmail.com):                     Date:
```

---

## 9. OPEN QUESTIONS FOR THE OWNER (per contract §12.5 — raise, don't guess)

1. **Does an admin order-management screen already exist in the live
   Laravel admin** (`spakshomeopathy.elitesfly.com/admin`) **that the M3
   route catalog missed**, or is order management genuinely absent today?
   This changes whether "Orders" is §2 item 1 (migration) or item 3 (new).
2. Is D-11's "analysis only" restriction being lifted alongside this CR, or
   does Phase 3+ wait for a separate schema-design decision?
3. Should CR-002 (reserved, dormant) be formally superseded by this CR's
   Phase 8, or kept open as independent, smaller-scoped work?
4. Given the scale (~30 modules), does this run **in parallel** with the
   active M0–M13 migration (as CR-003/CR-005 did), or only **after** M13
   cutover (as CR-001 was told to)? The answer changes engineering
   sequencing significantly.

---

*No implementation proceeds until §8 is signed. Per contract §20 Step 4,
work on this item stops here; the active 1:1 migration is unaffected and
continues.*
