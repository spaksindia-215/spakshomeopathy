# GATE REPORT — CR-006 Phase 5 (Medicine↔Disease + Potency/Variant — schema/read-side only)

**Status:** ✅ COMPLETE (delivers-now scope only, per owner-confirmed §7
answers 2026-09-15). Both admin-UI halves (disease multi-select, potency
repeater) remain deferred, as agreed.
**Next step:** Awaiting separate, explicit approval before Phase 6
(Herbs/wellness categories). No Phase 6 work has begun.

---

## 1. What changed

### 1.1 Governance step taken before any implementation

`docs/D-11-FOLLOWUP-CR006-SCHEMA-AUTHORIZATION.md` — a dated, scoped owner
decision record authorizing MongoDB schema design for exactly the two
Phase 5 items (medicine↔disease, potency/variant), following the same
pattern D-11 itself and CR-001's amendments established. Nothing broader
was authorized; every other CR-006 module's schema gate
(`CR-006-ANALYSIS-PHASE1.md` §8) remains exactly as it was.

### 1.2 Major scoping correction, found during planning

`CR-006-ANALYSIS-PHASE1.md` §3 had called medicine↔disease "fully new."
Direct inspection this phase found a live, working, already-catalogued
(M3 row #4) relationship already exists —
`GET /productsbydisease/{slug}` filters products by `p_cat` matching a
`categories` (type='N', disease) row's id, already ported to Next.js
(`productsbydisease/[slug]/page.tsx`) and linked from `PublicHeader.tsx`
and the disease/post-detail pages. The genuinely new piece, confirmed by
re-reading the admin write path (`p_cat` is a single scalar field in both
schema and every source controller), is upgrading that existing
ONE-disease-per-medicine relationship into MANY-to-many. Full record in
`CR-006-PHASE-5-PLAN.md` §0.

### 1.3 Schema change (additive only)

- `src/lib/mongodb/schemas/product.ts` — added ONE new, optional field:
  `diseaseCategoryIds: z.array(z.number().int()).optional()`. `pCat` and
  every other field are byte-for-byte unchanged. A product document
  without this field (i.e., every product today) still validates —
  confirmed by test.

### 1.4 New files (4)

- `src/lib/mongodb/diseaseCategoryBackfill.ts` — pure function
  `diseaseCategoryIdsFor(pCat)`, extracted for testability (matches this
  codebase's "logic in `src/lib/`, script is a thin wrapper" convention).
- `scripts/backfill-disease-category-ids.ts` — dry-run-by-default CLI
  script. **Written but NOT executed against any real database this
  phase**, per explicit owner instruction (§7.3: "write it, but don't run
  it yet"). Requires an explicit `--execute` flag to perform a real
  write; both of this codebase's established safety gates
  (`assertNonProductionTarget()`, `getDb()`'s production-flag guard) run
  before any write regardless of flag.
- `tests/mongodb/productRepository.test.ts` — 9 tests (4 schema
  validation, 5 repository method).
- `tests/mongodb/diseaseCategoryBackfill.test.ts` — 4 tests for the pure
  backfill-value function.

### 1.5 Modified files (4)

- `src/lib/mongodb/repositories/productRepository.ts` — added
  `findByDiseaseCategoryIds(categoryId, pStatus)`, ADDITIVE — the
  pre-existing `findByCategory` method is untouched and still used by
  every one of its existing callers.
- `src/app/productsbydisease/[slug]/page.tsx` — live-wired from
  `@/lib/demo`'s `getProductsByCategory` to real MongoDB
  (`findByDiseaseCategoryIds`, falling back to `findByCategory` when the
  new field returns nothing — i.e. for any not-yet-backfilled product).
  This is the ONE catalog page this phase live-wires, per the plan's
  explicit, narrow scope — no other `@/lib/demo`-backed catalog page was
  touched.
- `tests/mongodb/fakeDb.ts` — the shared test fixture's `matches()`
  helper gained scalar-matches-array-element support (MongoDB's real
  semantic for a plain equality filter against an array field),
  ADDITIVELY: strict `===` still applies whenever the document's field
  isn't an array, so every pre-existing caller of this fixture (8+ other
  test files) is unaffected — confirmed by the full suite passing.
- `package.json` — two new script entries,
  `backfill:disease-category-ids:dry-run` /
  `:execute`, following the existing `migrate:mongodb`/
  `migrate:mongodb:dry-run` naming convention.

## 2. What was tested

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ Clean |
| `npm run lint` | ✅ 0 errors, 4 pre-existing warnings (unchanged since Phase 2) |
| `npx prettier --check` on all new/changed files | ✅ Clean (after one `--write` pass corrected one file's formatting) |
| `npx vitest run` — full suite | ✅ **559/559 passed, 63/63 test files** — zero regressions |
| Protected-file mtime check | ✅ `session.ts`, `guard.ts`, `authService.ts`, `orderService.ts`, `categoryRepository.ts`, `PublicHeader.tsx`, `PublicFooter.tsx`, `AdminSidebar.tsx` all predate this session |

## 3. Files changed

**Created (4):** listed in §1.4.
**Modified (5):** `product.ts` (§1.3) + 4 files in §1.5.
**Deleted:** none.
**Backfill executed:** NO — script written, dry-run capable, not run.

## 4. What Phase 5 explicitly does NOT do (deferred, named so nothing is lost)

Per owner-confirmed §7.2 ("defer both admin UIs"):

- No admin UI for assigning multiple diseases to a product.
- No admin UI for managing the 10 existing potency/pack-size slots as a
  repeater.
- No change to the product add/edit form's own write path — it remains
  `@/lib/demo`-backed (Phase 4's own named future item; not pulled
  forward into this phase, per owner's §7.2 answer).
- The backfill script is not run — every existing product still has no
  `diseaseCategoryIds` field until a future, separate approval runs it.
- `product_variations` — confirmed again, still not referenced anywhere.

## 5. Files intentionally left untouched

- `pCat` field itself and every one of its existing read paths
  (`findByCategory` and its callers) — unchanged.
- Every other still-demo-backed catalog page (`products`, `herbs-list`,
  etc.) — not live-wired, per this phase's deliberately narrow scope.
- `PublicHeader.tsx`/`PublicFooter.tsx` (CR-001 §24.5) — untouched.
- `homeopathyMaster`/Phase 4's CRUD — untouched, unrelated to this
  phase's schema change.
- No dependency added — `package.json`'s `dependencies`/
  `devDependencies` sections untouched (only the `scripts` section
  gained two entries).

## 6. Limitations / known gaps carried forward

- Until the backfill actually runs, `productsbydisease/[slug]` relies on
  its fallback path (`findByCategory`) for every real product today —
  functionally equivalent to the pre-Phase-5 behavior, not a regression,
  but the NEW multi-disease capability has no real data to exercise it
  yet.
- No git repository exists in this project; mtime + grep + full-suite-pass
  remains the available substitute for a diff review, same as every
  prior phase's gate report.

---

**Awaiting explicit approval before Phase 6 (Herbs: wellness categories —
herb CRUD itself already exists per CR-003). No Phase 6 work has begun.**
