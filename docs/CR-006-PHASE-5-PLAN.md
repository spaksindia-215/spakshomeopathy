# CR-006 Phase 5 — Implementation Plan: Medicine↔Disease + Potency/Variant

**Status:** 📋 PLAN ONLY — awaiting explicit "Proceed with Phase 5"
approval, matching the Phase 2–4 process. Nothing in this document has
been implemented.
**Depends on:** `GATE-REPORT-CR006-PHASE-4.md` (Phase 4 complete),
`docs/D-11-FOLLOWUP-CR006-SCHEMA-AUTHORIZATION.md` (owner-approved
2026-09-15, schema-design authorization scoped to exactly the two items
this phase covers).

---

## 0. Major correction to this CR's own earlier scoping — read first

`CR-006-ANALYSIS-PHASE1.md` §3 stated: *"Medicine ↔ Disease many-to-many
relationship... No join table exists. `products` and `tbl_homeopathy` are
never joined anywhere in the live application... Fully new."*

**That statement was narrowly true but materially misleading for
planning.** Direct inspection this phase of `HomeController::
GetProductsbydiseases` (`AdminController.php`'s sibling read path) and
`routes/web.php:21` found:

- **A live, working, already-catalogued (M3 row #4) medicine↔disease
  relationship already exists** — `GET /productsbydisease/{slug}`
  filters `products WHERE p_cat = {id}` against a `categories` (type='N',
  disease) row's own id. This is real, public, reachable functionality
  today, not absent.
- It is **already ported to Next.js** —
  `src/app/productsbydisease/[slug]/page.tsx` exists, is linked from
  `PublicHeader.tsx`, `diseases-details/[slug]/page.tsx`, and
  `post-details/[slug]/page.tsx` — though (like most catalog pages) still
  reads `@/lib/demo`, not live MongoDB.
- The earlier finding's specific claim — "`tbl_homeopathy` is never
  joined to `products`" — is correct and remains true. But the original
  request's "disease" concept maps to the `categories` (type='N') tree,
  not to `tbl_homeopathy` (which Phase 4 established is a narrow,
  separate, 150-row list used only for blog tagging). Phase 1 checked the
  wrong disease entity when it concluded "no relationship exists at all."

**What genuinely remains new**, confirmed by re-reading the actual admin
write path (`AdminController::SaveProduct`/`UpdateProduct`,
`p_cat=$req->p_cat`, a single scalar field, one value per product): the
existing relationship is **one disease category per medicine**, not
many-to-many. The original request's example ("Arnica Montana → Muscle
Pain, Joint Pain, Injury, Bruising" — four diseases, one medicine) is
**not achievable with the current schema**. Upgrading one-to-many into
many-to-many is the one genuinely new design decision this phase makes —
narrower in scope than Phase 1 originally framed it.

## 1. What this phase actually covers, precisely separated

| Item | Classification | Action this phase |
|---|---|---|
| Product → single disease category (`p_cat` against `categories` type='N') | Already exists, already ported (page), not yet live-wired | Live-wire `productsbydisease/[slug]` to `ProductRepository.findByCategory` (already exists, per Phase 3/4's established pattern) — small, additive. |
| Product → single disease category, ADMIN SIDE (setting `p_cat` on create/edit) | Already exists in the Laravel write path (`p_cat` field on `add-product`/`edit-product`) — Phase 4 already live-wired the category *dropdown data source*; the FORM FIELD ITSELF (`p_cat` on submit) remains `@/lib/demo`-backed since the whole product write-path is out of Phase 4's scope | **Out of scope for Phase 5** — belongs to the "full product CRUD live-wiring" item Phase 4's gate report named as future, separate work. Not absorbed here. |
| Medicine ↔ Disease as MANY-TO-MANY (multiple diseases per medicine) | Genuinely new — confirmed `p_cat` is a single scalar, not an array, in both schema and every write path | New: add an ADDITIVE `diseaseCategoryIds: number[]` field to the EXISTING `products` schema (not a new collection — see §2), defaulting to `[pCat]` for migrated data so existing behavior is preserved exactly, with an admin multi-select UI layered on top. |
| Potency/variant admin UI (over the EXISTING 10 inline slots) | Missing UI over existing data (per Phase 1's dedicated inspection report's own recommendation: do NOT reuse `product_variations`; the real baseline is the products table's own 10 named slots) | New: an admin UI section (part of the product edit form) exposing the already-existing `slot2`..`slot10` fields as a repeatable "Potency/Pack" list, NOT a new collection, NOT a restructuring into an array (F-20 remains binding — the underlying storage stays 10 individually-named fields; only the ADMIN UI presents them as a repeatable list). |
| `product_variations` reuse | Ruled out | **Not touched.** Confirmed again: still not referenced anywhere. |

## 2. Schema design proposal (per the D-11 follow-up authorization)

**Governing constraint, restated from the authorization document:** no
"blindly convert to best-practice shape" redesign. Every change below is
justified by a specific, named functional requirement, not aesthetics.

### 2.1 Medicine↔Disease — additive field, not a new collection

Add ONE new, additive, optional field to the EXISTING `productSchema`:

```
diseaseCategoryIds: z.array(z.number().int()).optional()
```

- **Why additive, not a join collection:** the existing one-to-one
  `pCat` field must be preserved untouched (contract F-20/NN-6 —
  `pCat`'s existing overloaded meaning and every read path that depends
  on it, including the just-identified `GetProductsbydiseases` route,
  keeps working exactly as today). A new array field is the minimal
  change that adds many-to-many capability without touching `pCat`'s
  existing semantics or requiring a data migration of existing products.
- **Why not a separate join collection** (e.g. `productDiseases`): the
  original request's own examples describe a small, bounded list per
  product (a handful of related conditions), read together with the
  product on every product-detail/disease-detail page view — the same
  "always read together" criterion `docs/M3-DATABASE-MAPPING.md` §1.2
  already used to justify embedding `product_images`/`product_review`
  on `products` rather than joining them. A separate collection would
  require an extra query on every product/disease page for no
  demonstrated behavioral need.
- **Migration-safety default:** every EXISTING product document gets
  `diseaseCategoryIds: [pCat]` (or `[]` if `pCat` is null) via a one-time,
  reversible backfill — not a schema requirement enforced at read time
  (the field stays `.optional()` so a document without it doesn't fail
  validation, matching this codebase's own established
  "don't tighten validation beyond source" convention).
- **Public read-side effect:** `productsbydisease/[slug]` (and any future
  disease-detail "related medicines" section) queries
  `diseaseCategoryIds` (via `$in`/`$elemMatch`-style containment) instead
  of / in addition to `pCat`, so a product tagged to multiple diseases
  appears on all of them — the NEW capability — while a product with only
  its original single `pCat` value continues to appear exactly where it
  did before (since the backfill seeds `diseaseCategoryIds` from `pCat`).

### 2.2 Potency/variant — UI only, zero schema change

**No schema change at all.** `slot2`..`slot10` (and slot 1's own
name/mrp/price/desc fields) already exist, are already F-20-protected,
and already hold real potency-like data in production (per Phase 1's
`product_variations` inspection report, which found the REAL multi-potency
mechanism is these inline slots, e.g. "Calcarea Flu.200 / Rhus Tox Q /
Calcarea Fluorica" as three slot entries on one product). Phase 5 adds an
admin UI that presents these 10 already-existing slots as an editable,
labeled "Potency / Pack Size" repeater — reading and writing the exact
same fields the (currently `@/lib/demo`-backed, Phase 4-deferred) product
form already has, once that form is live-wired. If the product write-path
live-wiring (named out-of-scope in the table above) is not done yet when
this phase runs, this UI work is DEFERRED along with it — building a
potency UI on top of a still-demo-backed product form would not actually
let an admin change anything real yet, so this row's own implementation
is gated on that prerequisite (§7).

## 3. Files to create/modify (if the above design is approved as-is)

| File | Change |
|---|---|
| `src/lib/mongodb/schemas/product.ts` | ADD `diseaseCategoryIds: z.array(z.number().int()).optional()` to `productSchema`. No other field touched. |
| `src/lib/mongodb/repositories/productRepository.ts` | ADD `findByDiseaseCategoryIds(categoryId: number)` — mirrors the NEW capability (contains-match on the array), alongside the EXISTING `findByCategory` (kept, unmodified, for the still-live single-`pCat` read paths that don't need the upgrade). |
| `scripts/backfill-disease-category-ids.ts` (new, one-time) | Reversible backfill: for every product missing `diseaseCategoryIds`, set it to `[pCat]` (or `[]`). Dry-run mode by default, matching this codebase's existing `migrate-to-mongodb.ts --dry-run` convention. NOT run automatically — a deliberate, reviewed, owner-approved step (§7), not bundled into app startup. |
| `src/app/productsbydisease/[slug]/page.tsx` | Live-wire from `@/lib/demo` to `ProductRepository.findByDiseaseCategoryIds` (falling back to the existing `findByCategory` behavior where the field is absent — i.e. the backfill makes this a non-issue once run, but the code doesn't assume the backfill has happened). |
| Admin product edit form's disease multi-select | DEFERRED to whenever "full product CRUD live-wiring" (Phase 4's named future item) happens — building this UI against a demo-backed form provides no real capability yet. Named here so it isn't lost, not built prematurely. |
| Admin product edit form's potency/pack repeater UI | Same deferral, same reasoning (§2.2). |

## 4. What Phase 5, AS SCOPED HERE, actually delivers vs. defers

**Delivers now** (if approved): the schema field, the repository method,
the backfill script (run only on explicit approval), and the public-side
live-wiring of `productsbydisease/[slug]` to real data with multi-disease
capability.

**Defers** (blocked on the still-open, Phase-4-named "full product CRUD
live-wiring" item, not on anything Phase 5 itself introduces): the ADMIN
UI for assigning multiple diseases to a product, and the ADMIN UI for
managing potency/pack-size slots. Building admin UI against a form that
still reads/writes `@/lib/demo` would not let a real admin change
anything — it would be exactly the "fake admin panel where changes only
exist inside the admin UI" anti-pattern the original request explicitly
warned against.

**Recommendation:** treat "live-wire the full product add/edit write
path" as a prerequisite sub-phase (Phase 5a) before the admin-UI halves
of this plan (Phase 5b) — raised as a decision in §7, not assumed.

## 5. Risks

| Risk | Mitigation |
|---|---|
| Building admin disease/potency UI before the product form is live-wired, producing UI that silently does nothing on submit | Explicitly deferred (§4) rather than built against demo data. |
| Backfill script run against production without review | Dry-run by default; requires explicit separate approval to run for real, same discipline as this project's existing `migrate-to-mongodb.ts`. |
| `pCat`'s existing single-value semantics being silently changed or removed | Not touched — `pCat` stays exactly as-is; `diseaseCategoryIds` is purely additive, and every existing `pCat`-dependent read path (`GetCatProducts`'s marketplace-tree reading, `ActiveProducts`/`InactiveProducts`, etc.) is unaffected. |
| Conflating this phase's `categories`-based disease relationship with `homeopathyMaster` (Phase 4's separate, narrower CRUD) | Named explicitly in every new file's header — the two remain separate, as Phase 4 already established. |

## 6. Testing

- Schema test: a product document without `diseaseCategoryIds` still
  validates (optional field, no tightening).
- Repository test: `findByDiseaseCategoryIds` returns products whose
  array contains the given id; a product with only a legacy `pCat` match
  (pre-backfill) is NOT found by this method (documented, expected —
  that's what the backfill closes).
- Backfill script test: dry-run reports the correct set of would-be
  changes without writing; a second dry-run after a real run reports zero
  remaining changes (idempotent).
- Full existing suite re-run (546 tests as of Phase 4) to confirm zero
  regression.

## 7. Decisions needed before implementation

1. **Approve the schema design in §2** (additive array field, not a join
   collection) — or propose an alternative shape, which would need its
   own re-justification per D-11 §5's "documented behavioral reason"
   standard.
2. **Sequencing:** should this phase implement ONLY §4's "delivers now"
   list (schema + repository + backfill script + public read-side
   live-wiring), leaving both admin-UI halves fully deferred to a future
   Phase 5b that also live-wires the rest of the product form? Or should
   the product-form live-wiring be pulled forward into this same phase so
   the admin UI can be built immediately? Recommend the former (smaller,
   independently verifiable slice, consistent with every prior phase's
   sizing) but flagged rather than assumed.
3. **Backfill timing:** run the backfill script as part of this phase (on
   explicit approval, dry-run reviewed first), or leave it as a
   documented, not-yet-executed script for a later phase to run once the
   admin UI actually needs it?

---

**Awaiting explicit "Proceed with Phase 5" (and answers to §7) before any
file listed in §3 is created or modified.**
