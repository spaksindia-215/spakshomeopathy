# GATE REPORT — CR-006 Phase 4 (Catalog Core + `tbl_homeopathy` CRUD)

**Status:** ✅ COMPLETE — implemented per `docs/CR-006-PHASE-4-PLAN.md`,
with §9 (sidebar link) confirmed "yes" by the owner 2026-09-15.
**Next step:** Awaiting separate, explicit approval before Phase 5
(Medicine↔Disease relationship + potency/variant decision). No Phase 5
work has begun.

---

## 1. What changed

### 1.1 Major scoping correction, carried in from the Phase 4 plan

This CR's own Phase 1 analysis had listed "Disease Category CRUD" as
missing. Direct inspection this phase (documented in the plan's §0)
confirmed that was wrong: the `categories` collection's `type='N'`
(disease) rows share the exact same, already-complete, already-live CRUD
screens as `type='H'` (herb) rows — `cat-list`, `add-hurbcat`,
`edit-category`, `save-cat`, `update-category`, both status toggles.
**None of these were touched this phase** — confirmed by mtime check
(§5) — because they needed no work.

The real gap, confirmed and scoped precisely: `tbl_homeopathy`
(`homeopathyMaster` collection) has **zero admin CRUD anywhere in
Laravel**. This phase built that as clearly-labeled new admin surface,
not a migration.

### 1.2 New files (7)

- `src/lib/mongodb/repositories/homeopathyMasterRepository.ts` — new
  repository class over the ALREADY-EXISTING `homeopathyMasterSchema`/
  `COLLECTIONS.homeopathyMaster` (both predate this phase). No new
  schema, no new collection.
- `src/app/admin/(shell)/homeopathy-list/page.tsx` — list page
- `src/app/admin/(shell)/add-homeopathy/page.tsx` — add form
- `src/app/admin/(shell)/edit-homeopathy/[id]/page.tsx` — edit form
- `src/app/admin/save-homeopathy/route.ts` — insert route
- `src/app/admin/update-homeopathy/route.ts` — update route
- `tests/mongodb/homeopathyMasterRepository.test.ts` — 6 repository tests,
  following `blogCategoryRepository.test.ts`'s established fixture pattern

Every new file's header states plainly that it has no Laravel source to
mirror, and limits fields to `homeopathyMaster`'s real 6 columns
(name/image/slug/status/legacyId/createdAt) — no symptoms/causes/FAQ
fields were invented ahead of Phase 5's medicine-disease design decision.

### 1.3 Modified files (3) — small, additive live-wiring fix

- `src/app/admin/(shell)/add-product/page.tsx` — category `<select>`
  switched from `@/lib/demo`'s static `getAllCategories()` snapshot to
  live `CategoryRepository.findAllByNameAscending()` (the exact method/
  ordering `AdminController@AddProduct` uses: `orderBy('name','ASC')`).
  Made the page `async` to support the live read. The rest of the page
  (product read/write, all other fields) is unchanged — still
  `@/lib/demo`-backed, deliberately out of this phase's scope.
- `src/app/admin/(shell)/edit-product/[id]/page.tsx` — same live-wiring
  fix, with its own already-documented `name DESC` ordering (a genuine,
  preserved source inconsistency versus Add's `ASC`) re-applied in
  application code after the live fetch, so that preserved defect is not
  accidentally lost in the swap. `getProductByLegacyId` (`@/lib/demo`)
  unchanged.
- `src/components/admin/AdminSidebar.tsx` — one new top-level "Homeopathy
  List" entry, appended after the existing "Mother Tincture" item,
  following this file's own established append-only convention (CR-003,
  Mother Tincture). No existing entry reordered or modified.

## 2. What was tested

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ Clean |
| `npm run lint` | ✅ 0 errors, 4 pre-existing warnings (unchanged since Phase 2) |
| `npx prettier --check` on all new/changed files | ✅ Clean (after one `--write` pass corrected initial formatting on 3 files) |
| `npx vitest run` — full suite | ✅ **546/546 passed, 61/61 test files** — zero regressions |
| Protected/reused-file mtime check | ✅ `session.ts`, `guard.ts`, `authService.ts`, `categoryRepository.ts`, `schemas/post.ts`, `collections.ts`, `adminUpload.ts`, `adminSlug.ts`, and every `categories`-module page/route (`cat-list`, `save-cat`, `update-category`, `edit-category`) all predate this session |

## 3. Files changed

**Created (7):** listed in §1.2.
**Modified (3):** listed in §1.3.
**Deleted:** none.

## 4. RBAC wiring

Every new page/route calls `requireAdminSession()` (unchanged) composed
with `requirePermission(session, PERMISSIONS.DISEASES_VIEW / _CREATE /
_EDIT)` — these three permission constants already existed in Phase 2's
`permissions.ts` (defined in anticipation of exactly this module), so no
change to that file was needed either. No observable effect on the
current single admin account.

## 5. Files intentionally left untouched

- `cat-list/page.tsx`, `add-hurbcat/page.tsx`,
  `edit-category/[id]/page.tsx`, `save-cat/route.ts`,
  `update-category/route.ts`, `update-category-status-active/[id]/route.ts`,
  `update-category-status-inactive/[id]/route.ts` — confirmed already
  complete; none needed any change for this phase.
- `product_variations` — not referenced anywhere in this phase.
- `PublicHeader.tsx`/`PublicFooter.tsx` (CR-001 §24.5) — untouched.
- Every other currently-ported admin module — untouched.
- No new database collection, index, or migration.
- No dependency added — `package.json`/`package-lock.json` untouched.

## 6. Limitations / known gaps carried forward

- `add-product`/`edit-product`'s own write paths (product read/insert/
  update) remain `@/lib/demo`-backed — only the category dropdown was
  live-wired, per the plan's deliberately narrow scope. Full product
  CRUD live-wiring is a separate, future item, not silently expanded into
  here.
- `homeopathy-list`/`add-homeopathy`/`edit-homeopathy` have no delete
  action — matches this phase's plan (no status-toggle or delete
  precedent existed to extend, and inventing one would be new business
  logic beyond exposing the schema's existing fields).
- No git repository exists in this project; mtime + grep + full-suite-pass
  remains the available substitute for a diff review, same as every
  prior phase's gate report.

---

**Awaiting explicit approval before Phase 5 (Medicine↔Disease
relationship + potency/variant decision, both requiring D-11 schema-design
authorization per `CR-006-ANALYSIS-PHASE1.md` §8). No Phase 5 work has
begun.**
