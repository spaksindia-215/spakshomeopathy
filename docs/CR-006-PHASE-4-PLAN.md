# CR-006 Phase 4 — Implementation Plan: Catalog Core + Disease/`tbl_homeopathy` CRUD

**Status:** 📋 PLAN ONLY — awaiting explicit "Proceed with Phase 4"
approval, matching the Phase 2/3 process. Nothing in this document has
been implemented.
**Depends on:** `GATE-REPORT-CR006-PHASE-3.md` (Phase 3 complete),
`CR-006-ANALYSIS-PHASE1.md` §1/§2 (existing vs. missing functionality).

---

## 0. Major correction to this CR's own earlier scoping — read first

`CR-006-ANALYSIS-PHASE1.md` §2 originally listed **"Disease/condition list
CRUD"** as a *missing* screen needing confirmation. Direct inspection this
phase of `AdminController::Savecategory`/`EditCategory`/`UpdateCategory`/
`UpdateCategoryStausActive`/`UpdateCategoryStausInactive` found this was
**wrong in the way that matters for scoping**:

- The `categories` collection holds **both** disease (`type='N'`) and herb
  (`type='H'`) rows in one table, and **already has full, live CRUD**:
  `cat-list` (list, both types), `add-hurbcat` (the add form — misleadingly
  named, but confirmed it POSTs to `save-cat` for either type), `edit-category`,
  `update-category`, and the two status-toggle routes. **All five are
  already ported and live-wired** (`CategoryRepository`, not `@/lib/demo`).
- There is **no separate "Disease Category" admin screen in Laravel** —
  it is the exact same generic category screen, filtered by `type`. So
  "Disease Category management" is **already complete**, not a Phase 4
  deliverable. This CR's own module list (from the original request) named
  "Disease Categories" as if distinct from "Medicine Categories"; in the
  real application they are the same table and the same screen.

**What genuinely remains missing** — confirmed again this phase, not
assumed — is `tbl_homeopathy` (150 rows, `homeopathyMaster` collection):
**zero admin CRUD exists for it anywhere in Laravel.** It is populated
once in the original seed data, read on the public site
(`HomeController.php`), and used only as a read-only dropdown in
`AdminController::EditPost` (a blog-post tagging field). This is the one
piece of "Disease/Condition Management" that is genuine new admin
surface over existing data — not a migration, because Laravel itself
never had this screen.

## 1. What this phase actually covers, precisely separated

| Item | Classification | Action this phase |
|---|---|---|
| Product categories (`categories`, both `type` values) — list/add/edit/status-toggle | Already complete (ported, live) | **None — do not rebuild.** |
| Products — list/add/edit/status/trending/featured toggles | Ported, but **write forms still read `@/lib/demo`** (confirmed: `add-product/page.tsx` uses `getAllCategories()` from `@/lib/demo`, not `CategoryRepository`) | Wire `add-product`/`edit-product`'s category `<select>` to live `CategoryRepository.findAllByNameAscending()` — a small, additive fix (source: `DB::table('categories')->OrderBy('name','ASC')->get()`, confirmed against `AdminController@AddProduct:205`), not a redesign. Full product CRUD write-path live-wiring beyond this one dropdown is **out of scope** for this phase (large, and not part of Phase 4's named deliverable) — flagged as a separate future item, not silently expanded into. |
| `tbl_homeopathy` (`homeopathyMaster`) — list/add/edit | **Genuinely new** — no Laravel equivalent | Build: repository (schema already exists), list page, add/edit forms, save/update routes. New admin surface, clearly labeled as such in every file's header — not framed as "migration." |
| Medicine ↔ Disease relationship | Genuinely new (confirmed again: `products`/`tbl_homeopathy` never joined anywhere in source) | **Out of scope for Phase 4** — this is Phase 5 per the approved phase order. Not touched here, even though `homeopathyMaster` CRUD is adjacent. |
| Inventory | `products.pQuantity`/`pStatus` already exist as plain fields; no separate "inventory" table in source | **Out of scope for Phase 4** — no dedicated inventory screen exists in Laravel; folding stock-status display into product list/edit is a Phase 5-adjacent decision, not assumed here. |

## 2. Files to create

| File | Purpose |
|---|---|
| `src/lib/mongodb/repositories/homeopathyMasterRepository.ts` | New repository class, `HomeopathyMasterRepository extends ValidatedRepository<HomeopathyMaster>`, using the ALREADY-EXISTING `homeopathyMasterSchema`/`COLLECTIONS.homeopathyMaster` (both predate this phase — `schemas/post.ts`, `collections.ts`). Methods: `findAllDescending` (mirrors the closest existing convention, e.g. `CategoryRepository.findAllDescending`), `findByLegacyId`, `insertHomeopathy`, `updateHomeopathy` — same shape as `CategoryRepository`'s own methods, not a new pattern invented for this collection. |
| `src/app/admin/(shell)/homeopathy-list/page.tsx` | New list page. **No Laravel route/view to port** — see §3 for the route-naming approach, since there is no existing URL to preserve here (nothing to conflict with contract O-5's "preserve existing URLs," because no URL for this ever existed). |
| `src/app/admin/(shell)/add-homeopathy/page.tsx` | New add form — name/slug/image/status only, mirroring `tbl_homeopathy`'s actual 6 columns, nothing invented beyond them (no symptoms/causes/FAQ fields — those belong to Phase 5's medicine-disease design, not this phase, and adding them now would be inventing schema ahead of that decision). |
| `src/app/admin/(shell)/edit-homeopathy/[id]/page.tsx` | New edit form, same fields as add. |
| `src/app/admin/save-homeopathy/route.ts` | New POST route — insert. |
| `src/app/admin/update-homeopathy/route.ts` | New POST route — update. |
| `tests/mongodb/homeopathyMasterRepository.test.ts` | Repository tests, following `categoryRepository.test.ts`'s existing pattern. |

## 3. Routes — naming, since there's no source URL to mirror

Since Laravel has no route for this at all, names are chosen to match
this codebase's own established naming convention for parallel
entities (`cat-list`/`add-hurbcat`/`edit-category`/`save-cat`/
`update-category`) rather than inventing a different shape:

```
GET  /admin/homeopathy-list
GET  /admin/add-homeopathy
GET  /admin/edit-homeopathy/{id}
POST /admin/save-homeopathy
POST /admin/update-homeopathy
```

No status-toggle routes (Laravel's `categories` module has them; `tbl_homeopathy`
has no status-workflow precedent to extend, and inventing one would be
new business logic, not new *admin UI over existing schema* — the schema
does have a `status` column, so it will be an editable field on the
add/edit form itself, matching how `categories`' OWN add/edit forms
already expose `status` as a plain field rather than a separate action).

**Not added to `AdminSidebar.tsx` automatically** — flagged as a decision
in §9, not assumed. Unlike Phase 3's seller-orders/seller-payments (which
matched Laravel's own no-link precedent), there is no Laravel precedent
to match here either way, since the screen never existed. Silently adding
a new, permanent sidebar entry is itself a product decision, however
small — raised explicitly rather than defaulted.

## 4. APIs

No JSON/AJAX API — same GET-page/POST-form-redirect pattern as every
other admin CRUD module in this codebase (`save-cat`, `save-slider`,
etc.). Consistent with the existing architecture, not a new one.

## 5. Database impact

**Zero new collections or schema fields.** `homeopathyMaster`'s collection
name and full schema already exist (`collections.ts`, `schemas/post.ts`) —
confirmed by direct inspection, not assumed. This phase adds a repository
class and CRUD routes over an already-defined, already-D-11-authorized
shape. No Zod schema change, no new field, no index change.

**One small live-wiring fix** (not a schema change): `add-product`/
`edit-product`'s category dropdown switches from `@/lib/demo` to
`CategoryRepository`, reading the same collection that already backs
`cat-list`.

## 6. Authentication changes

None. Every new page/route calls `requireAdminSession()` (unchanged),
composed with `requirePermission(session, PERMISSIONS.DISEASES_VIEW /
DISEASES_CREATE / DISEASES_EDIT)` — Phase 2's mechanism, already defined
for exactly this module in `permissions.ts`, not requiring any new
permission constant.

## 7. Risks

| Risk | Mitigation |
|---|---|
| Conflating `tbl_homeopathy` CRUD with "disease category" work already done, leading to a duplicate or confusing second category-like screen | Every new file's header explicitly states this is a DIFFERENT collection (`homeopathyMaster`, not `categories`) serving a DIFFERENT, currently-narrow purpose (a blog-tagging list, not the disease taxonomy `categories` type='N' already provides) — named explicitly so a future phase doesn't merge or confuse the two. |
| Inventing fields on `tbl_homeopathy` beyond its real 6 columns (tempting, since the original request describes a much richer "Disease" entity with symptoms/causes/FAQs) | Explicitly not done this phase — those richer fields are Phase 5's design question (medicine-disease relationship + possible disease-content-model expansion), requiring its own schema-design authorization per D-11. Phase 4 only exposes what already exists in the schema. |
| Silently adding a sidebar link for a screen with no Laravel precedent either way | Raised as an open question (§9), not defaulted. |
| Product category dropdown fix could be scope-crept into "let's just live-wire the whole product form while we're here" | Explicitly bounded to the one dropdown; full product CRUD live-wiring is named as future, separate work, not absorbed into this phase silently. |

## 8. Testing

- New repository tests for `HomeopathyMasterRepository`, following
  `categoryRepository.test.ts`'s existing pattern (fixture-based, no real
  MongoDB connection).
- Full existing suite re-run (540 tests as of Phase 3) to confirm zero
  regression.
- Typecheck + lint clean, same bar as Phases 2/3.

## 9. Decision needed before implementation

Should the new `homeopathy-list` screen be added to `AdminSidebar.tsx`?
Unlike Phase 3's seller-orders (which had a clear "Laravel didn't link it
either" precedent to match), this screen has no Laravel precedent at all
— the choice is genuinely new. Recommend **yes** (a CRUD screen with no
way to reach it from the UI is not a usable admin feature, and nothing in
CR-001 §24.5's protection applies here — that clause guards
`PublicHeader`/`PublicFooter`/`AdminSidebar` specifically *for settings
purposes*; adding a catalog-module link is the same category of change
every other Phase 3/4 module already makes to reach its own new
screens)... but flagged for confirmation rather than assumed, per this
project's own standing practice of not deciding product questions on the
owner's behalf.

## 10. Existing functionality that remains untouched

- `cat-list`/`add-hurbcat`/`edit-category`/`save-cat`/`update-category`/
  both status-toggle routes — **not modified at all**. Confirmed already
  complete; touching them is out of scope.
- Every other currently-ported admin module — untouched.
- `product_variations` — not referenced.
- `PublicHeader.tsx`/`PublicFooter.tsx` (CR-001 §24.5) — untouched.
  `AdminSidebar.tsx` — touched only if §9 is answered "yes," and only to
  add one new link, not restructure existing ones.

---

**Awaiting explicit "Proceed with Phase 4" (and an answer to §9) before
any file listed in §2 is created.**
