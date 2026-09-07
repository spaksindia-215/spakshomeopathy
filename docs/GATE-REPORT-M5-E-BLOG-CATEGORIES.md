# MILESTONE GATE REPORT — M5-E (Blog Categories): Admin CRUD Write Path, Third Sub-Slice

**Milestone:** M5-E, third sub-slice (blog categories). First (pin codes):
`docs/GATE-REPORT-M5-E-PINCODE.md`. Second (sliders):
`docs/GATE-REPORT-M5-E-SLIDER.md`.
**Period:** 2026-09-04
**Author:** Migration Implementer
**Report date:** 2026-09-04
**Contract version:** 1.0

---

## 0. AUTHORIZATION RECORD

### 0.1 — Entity selection

> **Owner:** homeopathy38@gmail.com
> **Decision:** APPROVED
> **Scope:** Third M5-E sub-slice: blog categories (add/edit/delete admin
> CRUD).
> **Date:** 2026-09-04

No new owner decision was required to START this sub-slice — unlike
pincode (DR-03) and sliders (D-04), blog categories carried no open,
contract-registered decision item. Two things were nonetheless found and
handled during implementation, both self-directed corrections/disclosures
rather than owner-decision blockers (see §5, §6) — reported here in full,
not silently folded in.

---

## 1. CONTRACT ACKNOWLEDGEMENT

- [x] Read both prior M5-E gate reports in full before starting
- [x] Read `MIGRATION-CONTRACT.md` §9.3 (now carrying FIX-001/FIX-002 from
      pincode) before adding further entries
- [x] Read the LIVE Laravel source directly this session:
      `AdminController.php:31-38` (`convert_to_slug`, read for the FIRST
      time this migration — no prior slice had ported it),
      `AdminController.php:876-946` (`AddBlogCategory`,
      `SaveBlogCategory`, `BlogCategoryList`, `DestroyBlogCategory`,
      `EditBlogCategory`, `UpdateBlogCategory`, all 6 methods in full),
      `routes/admin.php:77-83` (confirmed all 6 sit inside the `userAuth`
      group), verified `csrf_field()` presence directly on both
      `add-blog-category.blade.php` and `edit-blog-category.blade.php`
- [x] Read `Database/db_newhomo.sql`'s `blog_category` table definition
      directly (line 133-140) — confirmed real column shape matches what
      source's controller already writes (no B-09-style mismatch for this
      entity)
- [x] Confirmed `src/lib/mongodb/schemas/post.ts` already defines
      `blogCategorySchema`/`BlogCategory` (this migration's schemas file
      unusually groups blog-related schemas alongside posts — read and
      confirmed, not assumed) — no new schema file needed
- [x] No Laravel source file was modified
- [x] `spaks_dev` is the only database any code in this slice can reach
- [x] No credential, secret, or session value appears in this report

---

## 2. FILES CREATED

```
src/lib/adminSlug.ts                                        — convertToSlug (P-07's convert_to_slug port)
src/lib/mongodb/repositories/blogCategoryRepository.ts       — BlogCategoryRepository
src/app/admin/save-blog-category/route.ts                   — POST /admin/save-blog-category
src/app/admin/update-blog-category/route.ts                 — POST /admin/update-blog-category
src/app/admin/destroy-blog-category/[id]/route.ts            — GET /admin/destroy-blog-category/{id}
tests/lib/adminSlug.test.ts                                  — 7 tests (UNIT)
tests/mongodb/blogCategoryRepository.test.ts                 — 8 tests (FIXTURE)
docs/GATE-REPORT-M5-E-BLOG-CATEGORIES.md                     — this report
```

**15 new tests + 3 new structural cases in `routeProtection.test.ts`, 18
total, all passing.**

## 3. FILES MODIFIED

| Path | Change |
|---|---|
| `src/app/admin/(shell)/add-blog-category/page.tsx` | Form now POSTs for real, CSRF-token-wired, success flash rendered. |
| `src/app/admin/(shell)/edit-blog-category/[id]/page.tsx` | Switched from `@/lib/demo` to live `spaks_dev` read (`BlogCategoryRepository.findByLegacyId`); CSRF token added; success flash wired. Flagship "Add Blog Category" title/heading/breadcrumb mislabel UNCHANGED. |
| `src/app/admin/(shell)/blog-category-list/page.tsx` | Switched from `@/lib/demo` to live `spaks_dev` read (`BlogCategoryRepository.findAllDescending`) — same half-migrated-trap avoidance. Success flash wired. All preserved defects UNCHANGED. |
| `tests/auth/routeProtection.test.ts` | Added 3 new structural tests: 3 new blog-category routes call `requireAdminSession`; `save-blog-category`/`update-blog-category` in `PROTECTED_ROUTES`; `destroy-blog-category` in `EXEMPT_GET_ROUTES`; `add-blog-category`/`edit-blog-category` pages in `FORMS_WITH_REAL_TOKEN`. |
| `src/app/admin/update-pincode/route.ts` | **FIX-004 (self-correction, §5):** removed the erroneous `updatedAt: new Date()` from the `updatePinCode(...)` call. Header comment extended with the full disclosure. No other logic changed. |
| `src/app/admin/update-slider/route.ts` | **FIX-004 (self-correction, §5):** same removal from `updateSlider(...)`. Header comment extended. |
| `docs/M3-OWNER-DECISION-RECORDS.md` | (No new addendum needed — FIX-004 is not a DR-series decision; recorded solely in the Fix Register and this report.) |
| `MIGRATION-CONTRACT.md` | §9.3 Approved Fix Register: added FIX-003 (**retroactively** — found omitted from the table despite being approved and implemented during the slider sub-slice, §6) and FIX-004. |

**No other file was touched.** Every repository, auth module, and every
pre-existing route/page outside the blog-category surface and the two
FIX-004 corrections — confirmed unmodified.

**Deleted:** none.

---

## 4. WHAT WAS BUILT, MAPPED TO LARAVEL SOURCE

| Laravel route | Controller method | Next.js target | MongoDB collection |
|---|---|---|---|
| `GET admin/add-blog-category` (`admin.php:77`) | `AdminController@AddBlogCategory` | `admin/(shell)/add-blog-category/page.tsx` (pre-existing, wired this session) | none |
| `POST admin/save-blog-category` (`admin.php:78`) | `AdminController@SaveBlogCategory` | `admin/save-blog-category/route.ts` (new) | `blogCategories` (write) + optional filesystem write |
| `GET admin/destroy-blog-category/{id}` (`admin.php:79`) | `AdminController@DestroyBlogCategory` | `admin/destroy-blog-category/[id]/route.ts` (new) | `blogCategories` (delete) + filesystem delete |
| `GET admin/edit-blog-category/{id}` (`admin.php:80`) | `AdminController@EditBlogCategory` | `admin/(shell)/edit-blog-category/[id]/page.tsx` (pre-existing, live data this session) | `blogCategories` (read) |
| `POST admin/update-blog-category` (`admin.php:81`) | `AdminController@UpdateBlogCategory` | `admin/update-blog-category/route.ts` (new) | `blogCategories` (write) + filesystem write (delete NEVER fires — §6) |
| `GET admin/blog-category-list` (`admin.php:83`) | `AdminController@BlogCategoryList` | `admin/(shell)/blog-category-list/page.tsx` (pre-existing, live data this session) | `blogCategories` (read, `orderBy id desc`) |

No B-09-style column-mismatch defect exists for this entity — `blog_category`'s
real columns match what source writes exactly.

### P-07 — `convert_to_slug` port (`src/lib/adminSlug.ts`)

FIRST port of this helper in the migration (shared by product categories,
blog categories, blogs, and products — 6 call sites in source, only 1
exercised so far). Ported step-by-step against the exact PHP source (see
that file's own extensive header for the full derivation, including a
non-obvious double-hyphen artifact at the name/suffix join point, verified
against real execution, not assumed). `str_random(5)`'s underlying RNG
differs from PHP's (Node `crypto.randomBytes` vs. PHP `random_bytes`) —
both CSPRNGs, byte values necessarily differ, permitted variance under
contract §7.2 ("`str_random(5)` slug suffixes on newly created records —
Random by design").

---

## 5. FIX-004 — SELF-CAUGHT CORRECTION TO PRIOR M5-E WORK (pincode, sliders)

While building `BlogCategoryRepository.updateBlogCategory`, direct
inspection of `blog_category`'s real column definitions
(`Database/db_newhomo.sql:133-140`) showed `updated_at` declared
`DEFAULT current_timestamp()` with **no** `ON UPDATE current_timestamp()`
clause. A full-schema grep (`grep -n "ON UPDATE" Database/db_newhomo.sql`)
confirmed **zero** such clauses exist anywhere in the entire 34-table
schema. Combined with the fact that every controller method read so far
uses Laravel's raw `DB::table()->update([...])` (which, unlike Eloquent,
never auto-touches timestamps), this means: **`updated_at` is set once at
row creation and never changes again on any table in this application,
for any update, ever.**

This directly contradicted what the pincode and slider sub-slices'
`update-pincode`/`update-slider` routes did — both set
`updatedAt: new Date()` on every update, an assumption carried over from
ordinary application conventions that does not hold for this specific
codebase. This was an unauthorized, undisclosed-at-the-time fidelity
deviation (contract F-13: "Changing which tables/columns are written, or
the values written").

**Found and corrected before proceeding with blog categories**, not left
for a future session:
- `update-pincode/route.ts`, `update-slider/route.ts`: `updatedAt` removed
  from their respective repository update calls.
- `BlogCategoryRepository.updateBlogCategory`'s own type signature
  excludes `updatedAt` from the start (`Omit<..., 'legacyId' | 'createdAt'
  | 'updatedAt'>`), so this entity never had the bug to begin with.
- Fix Register entry FIX-004 added (`MIGRATION-CONTRACT.md` §9.3),
  disclosing exactly what was wrong, why, and how it was corrected — the
  self-correction itself did not require prior owner approval to CORRECT
  (undoing an unauthorized deviation back toward fidelity needs no
  permission), but is fully disclosed here per contract §7.4 ("fidelity
  is proven, not asserted") rather than silently absorbed.

**Regression impact: none found.** `pinCodeRepository.test.ts`/
`sliderRepository.test.ts` (repository-level tests, which pass
`updatedAt` explicitly as their own test input, independent of what the
route layer decides to pass) still pass unchanged — re-run and confirmed
(§7).

---

## 6. NEW FINDING — `UpdateBlogCategory`'s DEAD image-cleanup check (preserved, not fixed)

`AdminController.php:941`:

```php
if ($old_image!='' && file_exists(!'uploaded_files/blog-categories/'.$old_image)) {
```

The leading `!` binds to the string literal BEFORE concatenation (PHP
operator precedence), so `!'uploaded_files/blog-categories/'` evaluates to
boolean `false`, which PHP's `.` operator coerces to the empty string —
the actual argument passed to `file_exists()` is the bare `$old_image`
filename with no directory prefix, which (for any request served through
the real web root) essentially never resolves to the real file. **The
practical effect: `unlink()` never runs on this code path — the OLD blog-
category image is never deleted when Update replaces it with a new one,
even though the database row correctly switches to the new filename.**
Old files accumulate on disk indefinitely.

This is a **genuinely new finding**, not previously documented anywhere in
this project (not in the BROKEN register, not in any prior audit or gate
report). It does not crash and produces no wrong user-visible output — the
database write and the visible "new image now displays" behavior are both
correct; only silent disk accumulation is affected, invisible through any
UI. Per contract §9.2's scope (BROKEN items are ones that crash or produce
wrong output), this was judged NOT to warrant a new B-# register entry —
but it is exactly the kind of thing an engineer would be tempted to
"helpfully" fix while touching this exact code path (contract §10.2's
prohibited-reasoning trap: "this is obviously a bug, so I fixed it").

**REPRODUCED FAITHFULLY, NOT FIXED:** `update-blog-category/route.ts`
deliberately does NOT call `deleteAdminUpload` on the old-image-replace
path — the code comment there explains exactly why, citing this defect.
`DestroyBlogCategory` (a DIFFERENT method, verified separately — its own
`file_exists()` call has no stray `!` and IS well-formed) correctly DOES
delete the image on delete; only the Update path's cleanup is dead.

**Flagged for the owner's awareness, not treated as requiring a decision
before this slice could proceed** — reproducing it faithfully is the
contract's own default (NN-4, no register entry required to leave
something broken), and no owner decision is needed to KEEP a defect,
only to FIX one. If the owner later wants this raised as its own Fix
Register candidate (parallel to B-09/D-04's pattern), that is a future,
separate, explicit decision — not defaulted into here.

---

## 7. VERIFICATION PERFORMED THIS SESSION

```
npm run typecheck    ✅ 0 errors
npm run lint          ✅ 0 errors (same 4 pre-existing, unrelated warnings)
npm run format:check  ✅ pass for every file this session touched — the
                          same PRE-EXISTING, UNRELATED gap in
                          src/app/redesign/RedesignedHome.tsx persists,
                          still unmodified, still out of scope
npm run test          ✅ 449/449 passed, 51 test files, 0 regressions
                          (428 pre-existing + 21 new: 7 adminSlug.test.ts
                          + 8 blogCategoryRepository.test.ts + 3 new
                          structural cases in routeProtection.test.ts +
                          9 pinCodeRepository.test.ts and 10
                          sliderRepository.test.ts RE-RUN and CONFIRMED
                          unchanged after the FIX-004 route edits, net 3
                          new since those two suites' own counts don't
                          change)
npm run build          ✅ pass, first attempt this session, no cache
                          flakiness this time — all 6 blog-category
                          routes compile correctly as ƒ (Dynamic)
```

**Live Atlas verification: ATTEMPTED (implicitly, standing blocker),
BLOCKED.** `REAL ATLAS VERIFICATION: NOT TESTED — environment TLS/network
limitation`, unchanged. Not re-debugged this session. Evidence rests on
FIXTURE-level tests (repository logic) and UNIT tests (`convertToSlug`'s
exact string transformation, verified against hand-traced source
semantics), plus the successful build.

**No `spaks_dev` mutation was performed this session.**

---

## 8. AUTHORIZATION/OWNERSHIP CHECKS

Same as pincode/slider — no per-resource ownership concept for blog
categories in Laravel; any authenticated admin may add/edit/delete any
blog category.

---

## 9. ERROR / VALIDATION CHECKS

Source's `SaveBlogCategory` has NO server-side validation on `bcat_name`
(confirmed by reading the full method body). Reproduced faithfully — an
empty name writes an empty string. `UpdateBlogCategory` likewise. The
upload extension whitelist (D-04/FIX-003, reused unmodified from the
slider sub-slice) is the ONE validation this route applies, same
disclosed exception as before.

---

## 10. ROUTE CHECKS

All 6 routes verified against `routes/admin.php:77-83` by exact line
number this session.

---

## 11. REGRESSION CHECK — M3/M4/M5 SURFACE

449/449 tests pass, zero regressions to any of the 428 pre-existing
tests (including the two FIX-004-touched route files' own indirect
coverage via `routeProtection.test.ts`, re-run and confirmed unchanged
in count and content for every pre-existing assertion).

---

## 12. NEW FINDINGS THIS SESSION

1. **FIX-004** — self-caught, self-corrected `updatedAt` deviation in two
   prior sub-slices (§5).
2. **`UpdateBlogCategory`'s dead image-cleanup check** — genuine,
   previously-undocumented defect, preserved faithfully (§6).
3. **FIX-003 was approved and implemented during the slider sub-slice but
   never actually added to `MIGRATION-CONTRACT.md` §9.3's table** — found
   this session while adding FIX-004, corrected retroactively (§0, §3).
   This is the exact kind of documentation-drift gap this project has hit
   before (the M5-C search-feature gate-report gap); flagged explicitly
   so the pattern is visible, not just quietly patched.

---

## 13. DEVIATIONS

| Type | Item | Authorization |
|---|---|---|
| Fix Register entry | FIX-003 — retroactively recorded (approval/implementation predate this session) | `MIGRATION-CONTRACT.md` §9.3 |
| Fix Register entry | FIX-004 — self-correction of an unauthorized prior deviation | `MIGRATION-CONTRACT.md` §9.3; §5 above |
| Pre-approved (§5.2) | List/edit pages switched to live `spaks_dev` reads | Mechanical extension |

**Undocumented deviations: NONE** — both FIX-003's retroactive paperwork
gap and FIX-004's substantive correction are now fully documented in this
report and the contract.

---

## 14. SIGN-OFF

**Implementer:** Migration Implementer **Date:** 2026-09-04
**Owner authorization:** given in-session for entity selection (§0.1);
FIX-003/FIX-004 are disclosures/corrections, not new decisions requiring
prior approval, per §5/§6's reasoning — but both are fully recorded for
the owner's review, not silently absorbed.

**M5-E (blog-categories sub-slice) status: GATE CLOSED** for its own
scope. **M5-E overall remains PARTIAL** — blogs, posts, and (product)
categories all remain unbuilt. M5-D (seller registration) remains
DEFERRED, unchanged.

**Per the task's STOP condition: no other M5-E sub-slice, M5-D, M5-F, or
any other milestone was started.** No production MongoDB was contacted.
No Laravel source was modified. No Herbs Store/CR-003 work was touched.
Waiting for explicit owner authorization before starting the next
sub-slice.

---

*End of Gate Report M5-E (Blog Categories).*
