# CR-006 — Phase 1 Analysis: Admin CMS Platform

**Status:** 📋 ANALYSIS ONLY — no code written, no database touched, no
migrations created, no APIs created, no dependencies installed.
**Supersedes:** The §9 open-questions answers in `CR-006-FULL-ADMIN-CMS-PLATFORM.md`
where they conflict with this document — this document is the verified
version; that one's §9 answers were provisional and are corrected here.
**Method:** Every classification below is backed by direct inspection of
`spakshomeopathy.com/routes/{web,admin}.php`, `AdminController.php`,
`docs/M3-APPLICATION-MAPPING.md` (the gate-reported 172-row route catalog),
and `docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md` (the D-11-authorized schema
analysis) — not assumption.

---

## 1. EXISTING FUNCTIONALITY THAT CAN BE MIGRATED/REUSED

Confirmed live in `routes/admin.php` + `AdminController.php`, already
catalogued (with row numbers) in `M3-APPLICATION-MAPPING.md`, and either
already ported to `src/app/admin` or pending ordinary migration work (no CR
needed — proceeds under the existing migration mandate):

| Module | Laravel routes | Next.js status |
|---|---|---|
| Product categories | `add/edit/save/update/destroy-product-category`, `cat-list` | ✅ Ported (`(shell)/cat-list`, `save-cat`, etc.) |
| Product subcategories | `add/save-product-subcat`, `product-subcategory-list` | ✅ Ported |
| Products | `add/edit/save/update/destroy-product`, `product-list`, `active/inactive-products`, `update-product-status/-trending/-featured` | ✅ Ported |
| Blog + blog categories | full CRUD, both entities | ✅ Ported |
| Sliders (homepage banners) | `add/edit/save/update/destroy-slider`, `slider-list` | ✅ Ported |
| Herbs | `add-herb`/`edit-herb`/`herbs-list` (CR-003 addition, already approved) | ✅ Ported |
| Pincodes | full CRUD | ✅ Ported |
| Enquiries (`save-enquiry`/`save-appointment` submissions) | `enquires-list`, `view-enquiry`, `destroy-enquiry` | ✅ Ported (read/delete; **no status workflow exists in Laravel — see §2**) |
| Users (customers) | `users-list`, `destroy-user`, `update-user-status` | ✅ Ported (list only) |
| Admin auth/profile | `login`, `user-login`, `user-logout`, `user-profile`, `change-password` | ✅ Ported |
| **Orders — list** | `GET order-list` → `AdminController@ManageOrders` (all `orderproducts` join `products`, unfiltered, unpaginated) | ❌ **Not yet ported.** Sidebar already links `/admin/order-list` (`AdminSidebar.tsx:136`) but no route exists at `src/app/admin` — **currently a dead link in the migrated admin.** |
| **Orders — detail** | `GET view-order/{orderId}` → `AdminController@ViewOrder` (joins `orderproducts`+`products`+`users`+`buyer_profile`) | ❌ Not yet ported |
| **Orders — ship** | `GET change-order-status` → `AdminController@ChangeOrderStatus` (sets `orderproducts.OrderStatus=3` only — **does not touch `orders` table, a real asymmetry vs. cancel, must be preserved not fixed**) | ❌ Not yet ported |
| **Orders — cancel** | `GET cancel-order` → `AdminController@CancelOrder` (sets `orderproducts`+`orders`=5, `payments`=4 — **the 4-vs-5 mismatch is a documented, preserved defect (P-03)**) | ❌ Not yet ported |
| **Seller orders** | `GET seller-orders/{sid}` → `AdminController@SellerOrders` | ❌ Not yet ported. Per M3 catalog, LIVE-orphan (no sidebar link) — confirm before building UI for it (§8, open question) |
| **Payments** | `manage-payments`, `seller-payments/{sid}`, `change-payment-status` | ❌ Not yet ported. `manage-payments` is LIVE-orphan; note the dead duplicate method `ManagePayments()` (plural, unrouted) documented in M3 catalog row #162 — do not port the dead one |
| **Appointments** | `GET appointment-list` → `AdminController@ManageAppointment` (read-only, `tbl_appointment`) | ❌ Not yet ported. No status-change route exists in Laravel — read-only list is the full scope of "migration" here |

**Correction to the original CR-006 draft:** that document's §1.1 table said
"No dedicated admin order-management UI found... needs confirmation" and
listed Orders under "does not exist." **Both statements were wrong.** A full
admin order-management flow (list, detail, ship, cancel) already exists in
Laravel, is already catalogued in `M3-APPLICATION-MAPPING.md` rows
#136–139 and #162–163, and is already linked from the migrated
`AdminSidebar.tsx`. It is unported migration work, not new product, and
should be scheduled as ordinary migration (or as the first slice of this
CR's Phase 3/4, purely for sequencing convenience) — **not** treated as a
feature requiring owner approval under contract §3.2.

---

## 2. MISSING FUNCTIONALITY

Things the request describes that have **no admin screen today**, but
where the underlying data **already exists** in the live schema — so the
gap is UI/workflow, not data modeling from scratch:

| Gap | Underlying live data | Notes |
|---|---|---|
| Disease/condition list CRUD | `categories` table, `type='N'` rows (23 total rows across both types) | Laravel has **no dedicated admin CRUD for disease categories** — `categories` rows appear to be seeded once, not managed through `AdminController`. Confirm this before assuming any admin screen is being "migrated" vs. built new. |
| `tbl_homeopathy` list CRUD | 150 rows, 6 columns (`name`, `image`, `slug`, `status`) — read on the public site (`HomeController.php`) and used as a **blog-post tag dropdown** in `AdminController@EditPost` (`leftJoin`) | **No admin CRUD exists for this table at all** in Laravel — not create, not edit, not delete. It is read-only everywhere in the live app. Any admin screen to manage these 150 rows is new admin surface over existing data, not a migration of an existing screen. |
| Order status workflow beyond ship/cancel | `orderproducts.OrderStatus`, `orders.OrderStatus`, `payments.orderStatus` columns already support arbitrary integer values | Laravel only ever writes `3` (ship) or `4`/`5` (cancel, asymmetric). A richer status workflow (Confirmed/Processing/Delivered/Returned) is new business logic, not present today — see §3. |
| Enquiry/appointment status + notes | No status column exists on `enquiries` or `tbl_appointment` beyond what's already there | Adding `status`/notes is a schema change, however small — flagged for §3, not silently bundled into "migrate the enquiry list." |

---

## 3. GENUINELY NEW FUNCTIONALITY (no Laravel equivalent, any table)

Verified absent from both the route table and the 34-table schema — these
require CR approval under contract §3.2/§5.2 before any design work:

| Module | Evidence of absence |
|---|---|
| Medicine ↔ Disease many-to-many relationship | No join table exists. Grepped `HomeController.php` and the full schema analysis: `products` and `tbl_homeopathy` are never joined anywhere in the live application. The public disease pages and product pages are entirely independent flows today. |
| Potency/variant sub-records | `product_variations` table exists (147 rows, 7 columns) but is **VESTIGIAL** — confirmed not read or written by any live controller. Building admin UI on it means reviving dead schema with unknown data quality, not migrating live behavior. Must be its own explicit decision, not assumed. |
| Coupons/discounts | No table, no route, no controller method anywhere in the schema or route files. Fully new. |
| Media library (central asset browser) | No table, no route. Uploads go directly to per-feature folders (`uploaded_files/`); nothing indexes them centrally. Fully new. |
| Audit log | No table, no logging call anywhere in the 7 live controllers. Fully new. |
| Redirects | No table, no middleware for this. Fully new. |
| RBAC / roles / permissions | `users.utype` is the only access-control signal (1=admin, 3=buyer) — a single flag, not a role/permission model. Fully new. |
| Homepage-section CMS (generic, toggle/reorder any section) | CR-005 already added specific, hardcoded new homepage sections (approved, live) but did **not** build a generic section-management system. A generic CMS layer is new scope beyond what CR-005 shipped. |
| Pages CMS (About/Privacy/Terms/Disclaimer as editable content) | These are static Blade/React templates today with no backing table. Fully new. |
| Testimonials/reviews as an admin-managed entity | `product_review` table exists (0 rows, LIVE per schema but empty) tied to products only, via `HomeController::SaveReview`. A generic testimonials module (not tied to a specific product, with approve/reject workflow) is new scope beyond this table's actual, narrow use. |
| Navigation/menu builder | Header/footer nav is hardcoded in `PublicHeader`/`PublicFooter` today. **Note:** CR-001 §24.5 already forbids modifying these components for settings purposes — a nav builder would need to touch exactly the files that clause protects, so this module specifically requires reconciling with that standing restriction, not just ordinary CR approval. |
| Dashboard analytics/charts | No aggregation queries of this kind exist anywhere in `AdminController`. Fully new. |
| Wellness categories (as distinct from herb categories) | Herb categories exist (CR-003). A second, cross-cutting "wellness category" taxonomy tagging herbs by use-case does not. New. |
| SEO fields per-entity (OG tags, canonical URL, robots) | No SEO-related columns exist on any of the 34 tables. New, though low-risk (additive fields only). |

---

## 4. FUNCTIONALITY THAT SHOULD FOLD INTO CR-002 (not duplicated here)

Per the owner's instruction, the following items from the original request
are **admin-editable site settings** in substance, regardless of which
numbered section of the original prompt they appeared under. They should
be added to reserved **CR-002**'s scope (which already inherits CR-001
§§1–19's analysis) rather than implemented as a second settings system in
CR-006:

| Item (from original request) | Why it's a CR-002 item |
|---|---|
| §32 Settings — General (site name, logo, favicon, email, phone, address) | Exactly CR-001's Category B, S-01…S-09 scope |
| §32 Settings — Business (currency, tax, shipping, order settings) | CR-001 §24.7 Q-1 explicitly excludes "Group 3" (5% fee, delivery charge, pagination, frozen constants) **permanently** — any business-settings module in CR-002 must respect that exclusion, not reopen it |
| §32 Settings — Social links (Facebook/Instagram/YouTube/LinkedIn) | New config values, same shape as CR-001's original ask |
| §32 Settings — SEO defaults (default title/description/OG image) | Global defaults belong with settings; **per-entity** SEO fields (§3 above) are a separate, catalog-level concern and stay in CR-006 |
| §32 Settings — Contact (support email/phone/WhatsApp) | Same as general settings |

**Not folded into CR-002** (stays in CR-006, because it's per-entity or
structural, not a global site setting): per-item SEO fields, redirects,
media library, RBAC, audit log, homepage section CMS, pages CMS.

**Action if this analysis is approved:** CR-002 should be formally opened
(it does not exist as a file yet — CR-001 §24.4 only reserved the ID) with
its scope amended to include the settings items above, and this analysis
should be referenced from it. CR-002 still inherits its original
precondition from CR-001 §24.4 (M13 cutover signed off) unless the owner
separately decides to run it in parallel — this analysis does not itself
change that precondition.

---

## 5. PROPOSED DEPENDENCY / ORDER OF IMPLEMENTATION

Revised from the original CR-006 phasing to reflect the corrected findings
above (Orders moves earlier since it's migration work, not new product;
disease/`tbl_homeopathy` CRUD is called out separately from the
disease-medicine relationship since one is a UI gap and the other is new
modeling):

| Phase | Scope | Classification | Depends on |
|---|---|---|---|
| 1 | This analysis + owner decisions on §8's open items | — | Owner approval |
| 2 | Auth/RBAC shell: extends existing admin login; roles/permissions is new | Mixed (login=migration, RBAC=new) | Phase 1 |
| 3 | **Orders**: port list/detail/ship/cancel/seller-orders/payments/appointments | Migration (unported, already linked from sidebar) | Phase 2 (if RBAC gating is wanted on it) or none |
| 4 | Catalog core: product categories/products (already ported — extend only), disease (`categories` type N + `tbl_homeopathy`) CRUD screens | Missing-UI-over-existing-data | Phase 2 |
| 5 | Medicine↔disease relationship, potency/variant decision (build on vestigial `product_variations` vs. new structure — needs its own decision) | New | Phase 4, D-11 schema authorization |
| 6 | Herbs extension: wellness categories | New (herb CRUD itself already exists) | Phase 4 |
| 7 | Content CMS: homepage section system (builds on CR-005), pages CMS, testimonials, navigation (subject to CR-001 §24.5 file-protection reconciliation) | New | Phase 2 |
| 8 | Media library, SEO fields, redirects | New | Phase 7 |
| 9 | System: audit log; **settings module deferred to CR-002, not built here** | New (audit log only) | Phase 2 |
| 10 | Testing/hardening pass | — | All prior |

Each phase stops for a gate report and explicit written approval before
the next begins, per contract §20 Step 4 and the owner's own instruction.

---

## 6. FILES / ROUTES / MODELS / APIs THAT WOULD BE AFFECTED (future tense — nothing built yet)

**Would be created** (Phase 3, Orders — lowest-risk, pure migration):
- `src/app/admin/(shell)/order-list/page.tsx`
- `src/app/admin/(shell)/view-order/[orderId]/page.tsx` (or similar segment naming, TBD at implementation time)
- `src/app/admin/(shell)/seller-orders/[sid]/page.tsx`
- `src/app/admin/(shell)/manage-payments/page.tsx`, `seller-payments/[sid]/page.tsx`
- `src/app/admin/(shell)/appointment-list/page.tsx`
- `src/app/admin/change-order-status/route.ts`, `cancel-order/route.ts`, `change-payment-status/route.ts`
- A new repository/service (e.g. `OrderRepository`/`orderAdminService`) — reusing whatever pattern `orderService.ts` (buyer-side, per M4 route mapping doc) already established, not a parallel implementation

**Would be modified:**
- None of the already-gated M1–M5 files need modification for Orders (additive routes only).
- `AdminSidebar.tsx` — no change needed; the "Manage Orders" link already exists and is correctly pointed.

**Would NOT be touched, under any phase, per standing restriction:**
- `PublicHeader.tsx`, `PublicFooter.tsx` (CR-001 §24.5) — the navigation-builder module (§3 above) cannot proceed without either amending this restriction or scoping the builder to admin-managed data that these components don't yet consume; **this is an open question, not resolved here** (§8).
- `AdminSidebar.tsx` for settings purposes (same clause) — new module links (Orders, etc.) are not "settings purposes" and are already present/would be ordinary additions, so this restriction does not block adding sidebar links for new CR-006 modules generally, only settings-flavored changes.

**Would require D-11 schema-design authorization first** (not requested by this document):
Any new MongoDB collection for: disease-medicine join, potency/variant
records (if not reusing `product_variations`' shape), coupons, media
library, audit log, redirects, RBAC, homepage sections, pages, testimonials,
navigation.

---

## 7. RISKS TO THE EXISTING MIGRATION

| Risk | Mitigation |
|---|---|
| Orders work (Phase 3) touches the same `orderproducts`/`orders`/`payments` tables the buyer-side M4-prep doc already flagged as having the B-12 crash defect (`orders` join `products` on `orders.pid`, confirmed absent from schema) | Admin `ViewOrder` joins differently (`orderproducts`→`products`→`users`→`buyer_profile`, not the broken buyer-side join) — confirmed by direct code read, not assumed identical. Must still preserve the **existing, separate** admin-side defects verbatim (P-03's 4-vs-5 mismatch, the ship-only-updates-one-table asymmetry) rather than "fixing" them while porting. |
| Reviving `product_variations` (vestigial, 147 rows of unknown data quality) for the potency/variant module | Must be inspected and its actual row content sampled/validated before any decision to reuse it — silently trusting stale data could surface incorrect prices/stock on the public site if ever wired up. Flagged as a pre-condition for Phase 5, not assumed safe. |
| Navigation-builder module directly conflicts with CR-001 §24.5's explicit "do not modify `PublicHeader`/`PublicFooter`/`AdminSidebar` for settings purposes, no new async data fetching" restriction | Must be raised as its own named question before Phase 7 proceeds (§8) — do not interpret "it's not technically a settings feature" as license to bypass the restriction's evident intent (keep these shared components static/simple). |
| CR-002 does not exist as a file yet, only reserved by ID | Must be formally opened before Phase 9's settings item is dropped from CR-006's scope, so the requirement isn't lost between the two documents. |
| Sidebar already links `/admin/order-list`, currently 404s in the migrated app | Not a regression introduced by this CR — already true today, independent of whether CR-006 proceeds. Worth fixing as ordinary migration debt regardless of this CR's fate (recommend flagging to whichever milestone gate currently owns admin-sidebar parity). |
| Scale of the full request (~30 modules) could visually or procedurally blur with the active M0–M13 migration's gate-report cadence if run in parallel without clear labeling | Every CR-006 gate report must be filed under its own `GATE-REPORT-CR006-PHASE-N.md` naming, distinct from `GATE-REPORT-M*.md`, so the two tracks' audit trails never intermix. |

---

## 8. EXACT AUTHORIZATION / CRs REQUIRED BEFORE IMPLEMENTATION

1. **This analysis document** — owner sign-off that the classifications in
   §1–4 are correct (particularly the Orders correction in §1).
2. **CR-006 itself** (`CR-006-FULL-ADMIN-CMS-PLATFORM.md` §8) — approval of
   an option (A/B/C/D) and the phasing in §5 above (which revises that
   document's original §7 table).
3. **CR-002** — must be formally opened (currently only a reserved ID) with
   scope amended per §4 above, before Phase 9 (or earlier, if the owner
   wants settings sequenced sooner).
4. **D-11 follow-up decision** — explicit authorization to move from
   "analysis only" to actual MongoDB collection design, required before
   Phase 5 (medicine-disease, potency/variants) and Phase 8 (media library,
   redirects, audit log, etc.) can begin. Not granted by this document.
5. **A decision reconciling the navigation-builder module (§3) with CR-001
   §24.5's file-protection clause** — required before Phase 7 can include
   navigation management; every other Phase 7 item (pages CMS, testimonials,
   homepage sections extending CR-005) does not depend on this.
6. **A decision on `product_variations`' reuse** (§7 risk) — required before
   Phase 5, after the table's actual data has been sampled.

**Nothing above authorizes implementation on its own.** Per contract §20
Step 4, each phase in §5 additionally requires its own explicit "proceed"
before work begins, one phase at a time, with a gate report after each —
consistent with the owner's standing instruction.

---

## 9. WHAT I DID NOT DO (restating, per instruction)

- Did not modify any code.
- Did not create any database collection, table, or migration.
- Did not create any new API route.
- Did not install any dependency.
- Did not sample `product_variations`' actual row data (flagged in §7/§8 as
  a pre-condition for Phase 5, not performed here since it wasn't
  requested and touches production data handling).

---

*Awaiting owner review of this analysis before CR-006 §8's approval block
is completed or any phase begins.*
