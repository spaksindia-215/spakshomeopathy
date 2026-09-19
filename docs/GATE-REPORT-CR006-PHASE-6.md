# GATE REPORT — CR-006 Phase 6 (Herbs/Wellness Categories)

**Status:** ✅ COMPLETE. Nothing deferred — unlike Phase 5, this phase had
no still-demo-backed prerequisite blocking it.
**Next step:** Awaiting separate, explicit approval before Phase 7
(Content CMS). No Phase 7 work has begun.

---

## 1. What changed

### 1.1 Scoping correction, found during planning

`CR-006-ANALYSIS-PHASE1.md` §3 had called wellness categories "New,"
implying the concept didn't exist anywhere. Direct inspection this phase
found it already existed as a complete, deliberately separate data model
(CR-003's "parallel model") — a `WellnessCategory` union type, a
`WELLNESS_CATEGORIES` static constant with 13 entries, and live public
pages (`/herbs/wellness`, `/herbs/wellness/[category]`). The real gap was
narrower: the taxonomy was hardcoded (no admin CRUD), and the herb
add/edit forms' wellness field was wired as a single-`<select>` even
though the underlying schema field (`wellnessCategories: WellnessCategory[]`)
was already an array. Full record in `CR-006-PHASE-6-PLAN.md` §0.

### 1.2 Schema decision (per owner direction: "database-backed wellness
taxonomy CRUD")

- New collection `wellnessCategories` (herb parallel-model tree, not the
  governed legacy-mirror schema files) — `key`, `label`, `description`,
  `icon`, `sortOrder`, `status: 'active' | 'hidden'`, `createdAt`,
  `updatedAt`.
- `wellnessCategorySchema` on `herbProductDocSchema` loosened from a
  closed `z.enum([...13 literals])` to `z.string().min(1)`, so an
  admin-added 14th category doesn't require a code change. Referential
  validity is enforced at the admin-form layer (the multi-select only
  offers keys from the live collection), not the Zod-schema layer — same
  convention Phase 5 used for `diseaseCategoryIds`.
- `WellnessCategory` TypeScript type widened from a 13-literal union to
  `string`, for the same reason.
- Delete semantics: soft-delete only (`status: 'hidden'`) — no hard
  delete — so an existing herb's `wellnessCategories` array never
  dangles.

### 1.3 New files (9)

- `src/lib/herbs/db/wellnessCategorySchema.ts` — `wellnessCategoryDocSchema`.
- `src/lib/herbs/db/wellnessCategoryRepository.ts` —
  `WellnessCategoryRepository` (`findByKey`, `findAll`, `findAllActive`,
  `upsert`, `hide`, `deleteByKey`), extending `ValidatedRepository` same
  as `HerbProductRepository`.
- `scripts/seed-wellness-categories.ts` — dry-run-by-default CLI script,
  seeds the 13 static entries into the new collection. Same two-gate
  safety discipline as Phase 5's backfill script, adapted for the Herbs
  Store's own separate `<db>_herbs` connection (`identifyEnvironment()`
  against `getHerbsDbConfig()`, since `assertNonProductionTarget()` is
  hardcoded to the legacy migration's config and doesn't apply here).
- `src/app/admin/(shell)/wellness-categories/page.tsx` +
  `DeleteWellnessCategoryButton.tsx` — admin list (merges DB rows,
  labeled "Saved", with any not-yet-persisted static entries, labeled
  "Seed Data").
- `src/app/admin/(shell)/add-wellness-category/page.tsx` +
  `AddWellnessCategoryForm.tsx` — admin create screen.
- `src/app/admin/(shell)/edit-wellness-category/[key]/page.tsx` +
  `EditWellnessCategoryForm.tsx` — admin edit screen (DB-backed rows
  only, same "seed data isn't directly editable" posture as
  `/admin/herbs-list`).
- `tests/herbs/wellnessCategoryRepository.test.ts` — 8 tests (fixture,
  fake `Db`).
- `tests/herbs/wellnessCategorySchemaLoosening.test.ts` — 4 tests
  confirming both original and newly-added wellness keys validate, and
  multi-value arrays parse correctly.

### 1.4 Modified files (10)

- `src/lib/herbs/db/schema.ts` — loosened `wellnessCategorySchema` (§1.2).
- `src/lib/herbs/types.ts` — widened `WellnessCategory` (§1.2).
- `src/lib/herbs/db/service.ts` — added
  `readWellnessCategoriesFromDb`/`saveWellnessCategory`/
  `hideWellnessCategory`, same non-throwing degrade-gracefully contract
  as the existing herb-product functions.
- `src/lib/herbs/db/actions.ts` — added
  `createWellnessCategoryAction`/`updateWellnessCategoryAction`/
  `hideWellnessCategoryAction`; fixed `parseHerbForm` to read
  `formData.getAll('wellness')` (all checked values) instead of
  `formData.get('wellness')` (first value only), writing the full array.
- `src/lib/herbs/db/index.ts` — re-exports the two new modules.
- `src/app/admin/(shell)/add-herb/AddHerbForm.tsx` +
  `src/app/admin/(shell)/add-herb/page.tsx` — wellness field changed from
  single-`<select>` to a checkbox multi-select; the page now fetches
  DB-backed active categories (falling back to the static constant when
  unconfigured) and passes them in as a prop.
- `src/app/admin/(shell)/edit-herb/[id]/EditHerbForm.tsx` +
  `src/app/admin/(shell)/edit-herb/[id]/page.tsx` — same fix, with
  existing tags pre-checked via `herb.wellnessCategories.includes(c.key)`.
- `src/app/herbs/wellness/page.tsx` — now reads DB-backed active
  categories (sorted by `sortOrder`), falling back to the static constant.
- `src/app/herbs/wellness/[category]/page.tsx` — `findCategory` now
  checks the DB first, static fallback second; unlisted DB-only
  categories still resolve correctly since Next.js renders un-enumerated
  dynamic params on demand.
- `src/components/herbs/HerbCategoryGrid.tsx` — `WellnessCategoryGrid`
  now accepts a `categories` prop (defaulting to the static constant)
  instead of importing it directly, so the component doesn't need to
  know which source supplied the data.
- `src/components/admin/AdminSidebar.tsx` — added "Wellness Categories"
  link under the existing "Herbs Store" tree item.
- `tests/herbs/service.test.ts` — added 3 tests for the new
  wellness-category service functions' unconfigured-environment behavior.

## 2. What was tested

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ Clean |
| `npm run lint` | ✅ 0 errors, 4 pre-existing warnings (unchanged since Phase 2) |
| `npx vitest run` — full suite | ✅ **574/574 passed, 65/65 test files** — zero regressions (up from 559/63 before this phase) |
| Seed script dry-run | ✅ Correctly identified `spaks_dev_herbs` as non-production, connected, reported 13 categories to create |
| Seed script `--execute` | ✅ Ran on explicit approval; 13 documents written and read back correctly (verified via a throwaway script, deleted after use) |

## 3. Files changed

**Created (9):** listed in §1.3.
**Modified (14):** listed in §1.4.
**Deleted:** none (a throwaway verification script used to confirm the
seed's real write was removed after use — not part of the shipped change
set).
**Seed executed:** YES, on explicit owner approval — `wellnessCategories`
now holds 13 live documents matching the original static taxonomy
exactly (same keys, labels, descriptions, icons, order).

## 4. What Phase 6 explicitly does NOT do

- No change to `HERB_FORM_CATEGORIES` ("Shop by Herb Form" taxonomy) —
  only `WELLNESS_CATEGORIES` was made database-backed, per the plan's
  explicit scope.
- No change to the legacy `categories` collection or its `type` (N/H)
  enum — confirmed again this phase to be unrelated to the wellness
  concept.
- Herb product add/edit forms still don't cover every `HerbProductDoc`
  field (gallery, ingredients, tags, SEO fields, etc.) — unchanged,
  pre-existing gap named in `actions.ts`'s own header, not part of this
  phase's scope.

## 5. Files intentionally left untouched

- `src/lib/herbs/data/taxonomy.ts` — the static `WELLNESS_CATEGORIES`
  constant itself is kept as-is (still the seed source and the
  no-database fallback), not deleted.
- `HERB_FORM_CATEGORIES` and every herb-form (whole-herbs/powders/etc.)
  admin/public surface — untouched.
- Legacy `categories`/`homeopathyMaster` collections and their admin
  screens (Phase 4) — untouched, unrelated.
- `PublicHeader.tsx`/`PublicFooter.tsx` — untouched.
- No dependency added — `package.json`'s `dependencies`/
  `devDependencies` sections untouched.

## 6. Limitations / known gaps carried forward

- No git repository exists in this project; typecheck + lint +
  full-suite-pass + direct DB read-back remains the available substitute
  for a diff review, same as every prior phase's gate report.
- The admin wellness-category multi-select's UI is plain checkboxes
  (matching this codebase's existing form styling elsewhere), not a
  richer tag-picker widget — functional, not polished; no such widget
  exists elsewhere in this admin to reuse.

---

**Awaiting explicit approval before Phase 7 (Content CMS). No Phase 7
work has begun.**
