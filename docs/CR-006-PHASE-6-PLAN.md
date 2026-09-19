# CR-006 Phase 6 — Implementation Plan: Herbs/Wellness Categories

**Status:** 📋 PLAN ONLY — awaiting explicit "Proceed with Phase 6" approval,
matching the Phase 2–5 process. Nothing in this document has been
implemented.
**Depends on:** `GATE-REPORT-CR006-PHASE-5.md` (Phase 5 complete).
**Schema-authorization note:** this phase proposes ONE new collection
(`wellnessCategories`, under the herb "parallel model" tree, not the
governed legacy-mirror schema files). Per the D-11 follow-up's own scope
("exactly Phase 5's two items only"), that authorization does not cover
this phase — a fresh, narrow authorization request for this one new
collection is item §7.1 below, to be resolved before implementation, not
assumed.

---

## 0. Correction to this CR's own earlier scoping — read first

`CR-006-ANALYSIS-PHASE1.md` (§3, "genuinely new" table, line 90) stated:

> "Wellness categories (as distinct from herb categories) | Herb
> categories exist (CR-003). A second, cross-cutting 'wellness category'
> taxonomy tagging herbs by use-case does not. New."

**That statement is wrong in the same recurring way as every prior
phase's Phase-1 claim — but in a new direction.** It is not that the
feature is simply missing; it's that it already exists as a complete data
model and a live public feature, and what's actually missing is much
narrower than "New" implied.

Direct inspection this phase found:

- **A full `WellnessCategory` taxonomy already exists** —
  `src/lib/herbs/types.ts:30-43` (13 values: hair-care, skin-care,
  digestion, immunity, joint-care, stress-relaxation, womens-wellness,
  mens-wellness, respiratory-wellness, general-wellness,
  weight-management, heart-wellness, brain-memory), with labels/
  descriptions/icons in `src/lib/herbs/data/taxonomy.ts:81-160`
  (`WELLNESS_CATEGORIES`). It's part of CR-003's deliberate "parallel
  model" (`src/lib/herbs/types.ts:1-15`), fully separate from the legacy
  `categories` collection.
- **Public pages already exist and are live**: `/herbs/wellness` (index)
  and `/herbs/wellness/[category]` (per-category listing) — the site
  already promises this feature to real visitors today.
- **The herb product schema already supports multi-tagging**:
  `wellnessCategories: WellnessCategory[]` is an array on
  `HerbProductDoc` (`src/lib/herbs/db/schema.ts:79`) and on the
  `HerbProduct` type (`types.ts:73`).
- **The admin gap is narrow and specific**: `AddHerbForm.tsx:54-63` and
  `EditHerbForm.tsx` (equivalent field) render the wellness field as a
  single `<select>`, and `actions.ts:98-100` writes it as a one-element
  array (`[String(formData.get('wellness') ?? 'general-wellness')]`) —
  so an admin can never assign more than one wellness tag to a herb
  through the UI, despite the schema already allowing it. Separately,
  **the taxonomy itself (the 13 category definitions) is a hardcoded
  TypeScript constant, not database-backed** — there is no admin screen
  to add, rename, reorder, or retire a wellness category.
- Unlike Phase 5's admin-UI halves, **this work is not blocked on
  anything**: the herb product form is already live-wired to real MongoDB
  (`herbProducts` collection, confirmed via `db/actions.ts` →
  `saveHerbProduct` → `HerbProductRepository`), not `@/lib/demo`-backed.
  So, unlike Phase 5's deferred admin UI, there is no prerequisite
  sub-phase here — this can be built and will actually persist real data
  immediately.

**What genuinely remains new:** a database-backed wellness-taxonomy CRUD
(per your direction), plus fixing the herb form's wellness field from
single-select to true multi-select against the existing array field.
Nothing about the legacy `categories`/`type` enum (`N`/`H`) is touched or
relevant — confirmed it has no third value and never did.

## 1. What this phase actually covers, precisely separated

| Item | Classification | Action this phase |
|---|---|---|
| Wellness taxonomy data (13 categories, labels/descriptions/icons) | Already exists, but as a hardcoded constant (`taxonomy.ts`), not admin-manageable | New: promote to a database-backed collection with full admin CRUD (per your direction). |
| Herb → wellness category tagging (schema field) | Already exists (`wellnessCategories: WellnessCategory[]`) | Untouched — no schema change to `HerbProductDoc`. |
| Herb → wellness category tagging (ADMIN UI) | Exists but broken/limited — single-select writing a 1-element array | Fix: multi-select checkboxes/multi-select control, sourced from the new DB-backed taxonomy instead of the static constant. |
| Public `/herbs/wellness` pages | Already exists and live | Untouched at the routing/page level — only the data source underneath changes (see §2.3), consistent with this codebase's static→live swap pattern used everywhere else. |
| Herb form validation of `wellnessCategories` values | Currently a closed Zod `z.enum([...13 literals])` (`db/schema.ts:38-52`) | Must change — see §2.2, this is the one schema-adjacent decision this phase makes. |
| Legacy `categories` (`type` enum N/H) | Confirmed unrelated; no third value exists or is needed | Not touched. |

## 2. Schema design proposal

### 2.1 New collection: `wellnessCategories`

A new, small collection in the herb "parallel model" tree
(`src/lib/herbs/db/`), following the exact structural precedent of
`herbProductDocSchema` (its own governance header explains why this tree
is kept separate from `src/lib/mongodb/schemas/` — no Laravel table to
trace to, net-new surface area):

```
wellnessCategoryDocSchema = z.object({
  key: z.string().min(1),        // slug, e.g. "hair-care" — stable id, referenced by herb docs
  label: z.string().min(1),
  description: z.string(),
  icon: z.string(),
  sortOrder: z.number().int(),   // controls /herbs/wellness display order
  status: z.enum(['active', 'hidden']),
  createdAt: z.string(),
  updatedAt: z.string(),
})
```

- **Why a new collection, not a field on something existing:** this is a
  standalone list of named entities with their own lifecycle (an admin
  adds/renames/retires a wellness category independent of any herb
  product), which is exactly the shape every other admin-managed taxonomy
  in this codebase already uses as its own collection (`categories`,
  `homeopathyMaster`). Embedding it elsewhere has no precedent here and
  no behavioral justification.
- **Migration-safety seed:** the 13 existing hardcoded entries from
  `taxonomy.ts` become the initial seed data (via a one-time seed script,
  run on approval — same discipline as Phase 5's backfill script), so
  every herb currently tagged with e.g. `'hair-care'` continues to
  resolve to a real, matching category document. No existing herb
  document needs to change.

### 2.2 Herb product schema: loosen `wellnessCategories` validation

`wellnessCategorySchema` (`db/schema.ts:38-52`) is currently a closed Zod
enum of the 13 literal strings. Once the taxonomy is database-backed, new
categories can be added without a code change — a closed enum would
reject them. Change:

```
wellnessCategorySchema: z.enum([...]) → z.string().min(1)
```

on `herbProductDocSchema`'s `wellnessCategories` field only. Referential
validity (does this key correspond to a real, active category) is
enforced at the admin-form layer (the multi-select only offers keys that
exist in `wellnessCategories`), not at the Zod-schema layer — consistent
with this codebase's established "don't tighten validation beyond source"
convention (same reasoning Phase 5 used for `diseaseCategoryIds`). The
`WellnessCategory` TypeScript union type (`types.ts:30-43`) is similarly
relaxed to `string` (or kept as a widened type alias) since it's no
longer a closed compile-time set.

### 2.3 Public `/herbs/wellness` pages: swap data source

`getWellnessLabel()`/`WELLNESS_CATEGORIES` reads currently come from the
static `taxonomy.ts` constant. Once real, these pages read from the new
`WellnessCategoryRepository` instead — same static→live swap pattern
already used for every other catalog surface in this project (herb
products themselves, disease categories, etc.). The page/route structure
itself does not change.

## 3. Files to create/modify (if the above design is approved as-is)

| File | Change |
|---|---|
| `src/lib/herbs/db/wellnessCategorySchema.ts` (new) | `wellnessCategoryDocSchema` per §2.1. |
| `src/lib/herbs/db/wellnessCategoryRepository.ts` (new) | `WellnessCategoryRepository extends ValidatedRepository<WellnessCategoryDoc>` — `findAllActive()` (sorted by `sortOrder`), `findByKey()`, `insertCategory()`, `updateCategory()`, `deleteCategory()` (or soft-delete via `status: 'hidden'` — see §7.2). |
| `src/lib/herbs/db/schema.ts` | Loosen `wellnessCategorySchema` to `z.string().min(1)` per §2.2. |
| `src/lib/herbs/types.ts` | Widen `WellnessCategory` from a closed union to `string` (keep `WellnessCategoryInfo` shape, now sourced from DB not the constant). |
| `scripts/seed-wellness-categories.ts` (new, one-time) | Seeds the 13 existing `taxonomy.ts` entries into the new collection. Dry-run by default, same convention as Phase 5's backfill script. NOT run automatically. |
| `src/app/admin/(shell)/wellness-categories/page.tsx` + `WellnessCategoryList` (new) | Admin list screen, mirrors `homeopathy-list`'s structure. |
| `src/app/admin/(shell)/add-wellness-category/` (new) | Admin create screen, mirrors `add-homeopathy`. |
| `src/app/admin/(shell)/edit-wellness-category/[key]/` (new) | Admin edit screen, mirrors `edit-homeopathy`. |
| `src/lib/herbs/db/actions.ts` | Add `createWellnessCategoryAction`/`updateWellnessCategoryAction`/`deleteWellnessCategoryAction`, same shape as the existing herb-product actions. |
| `AddHerbForm.tsx` / `EditHerbForm.tsx` | Change the wellness `<select>` to a multi-select (checkbox group), sourced from `WellnessCategoryRepository.findAllActive()` instead of the static `WELLNESS_CATEGORIES` import. |
| `src/lib/herbs/db/actions.ts` (`parseHerbForm`) | Read `formData.getAll('wellness')` (multiple checked values) instead of `formData.get('wellness')`, writing the full array to `wellnessCategories` instead of a 1-element array. |
| `src/app/herbs/wellness/page.tsx`, `src/app/herbs/wellness/[category]/page.tsx` | Swap `WELLNESS_CATEGORIES` import for `WellnessCategoryRepository` read, per §2.3. |
| Admin sidebar | Add "Wellness Categories" link (owner-confirm placement, same as Phase 4's sidebar addition). |

`taxonomy.ts`'s `HERB_FORM_CATEGORIES` (the *form* taxonomy — whole-herbs/
powders/roots/etc.) is untouched; only `WELLNESS_CATEGORIES` moves.
Nothing here proposes making herb *forms* database-backed — not asked
for, no gap identified.

## 4. What Phase 6 delivers

- A new, admin-manageable `wellnessCategories` collection with full
  CRUD (list/add/edit/delete or hide).
- The herb add/edit admin forms can assign **multiple** wellness
  categories per herb (fixing the existing single-select limitation),
  sourced live from the new collection.
- `/herbs/wellness` public pages continue to work, now reading real
  admin-managed data instead of a hardcoded constant.
- A seed script (run only on explicit approval) populating the 13
  existing categories so no existing herb's tagging changes.

Nothing is deferred — unlike Phase 5, there is no still-demo-backed
prerequisite blocking this phase.

## 5. Risks

| Risk | Mitigation |
|---|---|
| Loosening `wellnessCategorySchema` from a closed enum to `z.string()` silently allows garbage values into herb documents | Referential integrity enforced at the form layer (multi-select only offers real, active category keys); documented as a deliberate, scoped trade-off, not an oversight. |
| Deleting a wellness category that herbs still reference leaves dangling keys | Recommend soft-delete (`status: 'hidden'`) rather than hard delete — a hidden category disappears from `/herbs/wellness` and the admin picker but doesn't orphan existing herb tags. Raised as a decision in §7.2, not assumed. |
| Seed script run against production without review | Dry-run by default, requires explicit separate approval to run for real — same discipline as every prior phase's one-time scripts. |
| Confusing this new collection with the legacy `categories` (type N/H) mechanism | Named explicitly in every new file's header, per this project's established convention (Phase 4/5 did the same for `homeopathyMaster` and `diseaseCategoryIds`). |

## 6. Testing

- Schema test: a herb document with a `wellnessCategories` value not in
  the original 13 literals still validates (confirms the loosened
  schema).
- Repository test: `WellnessCategoryRepository.findAllActive()` excludes
  `status: 'hidden'` entries and respects `sortOrder`.
- Admin form test: submitting multiple checked wellness values persists
  all of them as an array (not just the first, as today).
- Seed script test: dry-run reports the 13 categories that would be
  created; a second dry-run after a real run reports zero remaining
  changes (idempotent), same pattern as Phase 5's backfill test.
- Full existing suite re-run to confirm zero regression.

## 7. Decisions needed before implementation

1. **Schema authorization**: confirm owner authorization for this one
   new collection (`wellnessCategories`), since D-11's existing
   authorization was scoped only to Phase 5's two items. (You've already
   directed "database-backed wellness taxonomy CRUD" — treating that as
   the authorization for this specific collection unless you'd like a
   separate formal sign-off document like D-11.)
2. **Delete semantics**: hard delete, or soft-delete via
   `status: 'hidden'` (recommended, per §5's dangling-reference risk)?
3. **Seed timing**: run the seed script as part of this phase (on
   explicit approval, dry-run reviewed first), or leave it as a
   documented, not-yet-executed script?

---

**Awaiting explicit "Proceed with Phase 6" (and answers to §7) before any
file listed in §3 is created or modified.**
