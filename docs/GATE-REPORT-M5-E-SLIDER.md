# MILESTONE GATE REPORT — M5-E (Sliders): Admin CRUD Write Path, Second Sub-Slice

**Milestone:** M5-E, second sub-slice (sliders) — per
`docs/M5-PREFLIGHT-AUDIT.md` §10's own recommendation that M5-E be split
into per-entity sub-slices. First sub-slice (pin codes): see
`docs/GATE-REPORT-M5-E-PINCODE.md`.
**Period:** 2026-09-04
**Author:** Migration Implementer
**Report date:** 2026-09-04
**Contract version:** 1.0

---

## 0. AUTHORIZATION RECORD

### 0.1 — Entity selection

Presented with the 5 remaining M5-E entities (categories, blogs, blog
categories, posts, sliders — all with zero existing write-path code), the
owner selected sliders as the second sub-slice:

> **Owner:** homeopathy38@gmail.com
> **Decision:** APPROVED
> **Scope:** Second M5-E sub-slice: sliders (add/edit/delete admin CRUD).
> **Date:** 2026-09-04

### 0.2 — D-04 (upload validation) resolved

Building the slider write path immediately surfaced D-04 (upload
validation), open since contract signing and, unlike DR-03, carrying a
safe NON-BLOCKING contract default ("reproduce current unvalidated
behavior"). Sliders are the FIRST entity in this migration involving a
real file upload (`slider_image`, written to
`public/uploaded_files/slider/`, with `unlink()` on replace/delete) — no
prior slice needed a decision here. Because D-04's own text calls the
unvalidated-upload gap "the single strongest recommended deviation in the
project" (admin-reachable RCE via an uploaded `.php` file with an
unsanitized, executable filename), this was raised explicitly rather than
silently defaulting into it, even though the contract default was
available and would have been compliant. The owner selected D-04's own
recommended fix:

> **Owner:** homeopathy38@gmail.com
> **Decision:** APPROVED
> **Scope:** D-04 — apply the recommended fix now (extension whitelist,
> filename sanitization, preserving the `time().'g'.originalName` naming
> pattern). Recorded in `MIGRATION-CONTRACT.md` §9.3 as Fix Register entry
> **FIX-003**.
> **Date:** 2026-09-04

Full decision record: `docs/M3-OWNER-DECISION-RECORDS.md` D-04 addendum.

---

## 1. CONTRACT ACKNOWLEDGEMENT

- [x] Read `docs/GATE-REPORT-M5-E-PINCODE.md` in full before starting
      (established this sub-slice's own conventions: guard/CSRF wiring,
      live-data-migration discipline, Fix Register format)
- [x] Read `MIGRATION-CONTRACT.md` §9.3 (Approved Fix Register, now
      carrying FIX-001/FIX-002 from the pincode sub-slice) and D-04's full
      entry (§14, "Upload validation (security exception)")
- [x] Read the LIVE Laravel source directly this session:
      `AdminController.php:1143-1217` (`AddSlider`, `SaveSlider`,
      `SliderList`, `EditSlider`, `UpdateSlider`, `DestroySlider`, all 6
      methods in full), `routes/admin.php:103-109` (confirmed all 6 sit
      inside the `userAuth` group), verified `csrf_field()` presence
      directly on both `add-slider.blade.php` and `edit-slider.blade.php`
- [x] Re-verified `src/lib/mongodb/schemas/slider.ts`'s pre-existing
      header (P-18) and confirmed no DR-equivalent decision was needed for
      this entity's column shape — `slider`'s real columns already match
      what `SaveSlider`/`UpdateSlider` write, unlike pincode's B-09
- [x] Confirmed `src/lib/herbs/uploads/` (the CR-003 Herbs Store's own
      upload module) is NOT reused — a new, separate, migration-scoped
      module (`src/lib/uploads/adminUpload.ts`) was built instead, per the
      standing instruction that Herbs Store code and this migration remain
      independent
- [x] No Laravel source file was modified
- [x] `spaks_dev` is the only database any code in this slice can reach,
      via the pre-existing, unmodified `assertNonProductionTarget()`/
      `getDb()` guards — confirmed unmodified this session
- [x] No credential, secret, or session value appears in this report

---

## 2. FILES CREATED

```
src/lib/uploads/adminUpload.ts                     — saveAdminUpload/deleteAdminUpload, D-04/FIX-003
src/lib/mongodb/repositories/sliderRepository.ts   — SliderRepository
src/app/admin/save-slider/route.ts                 — POST /admin/save-slider
src/app/admin/update-slider/route.ts               — POST /admin/update-slider
src/app/admin/destroy-slider/[id]/route.ts         — GET /admin/destroy-slider/{id}
tests/mongodb/fakeDb.ts                            — shared fake-Db test helper (see §3)
tests/lib/adminUpload.test.ts                      — 14 tests (real-tempdir FIXTURE)
tests/mongodb/sliderRepository.test.ts             — 10 tests (FIXTURE)
docs/GATE-REPORT-M5-E-SLIDER.md                    — this report
```

**24 new tests + 5 new structural cases in `routeProtection.test.ts`, 29
total, all passing.**

## 3. FILES MODIFIED

| Path | Change |
|---|---|
| `src/app/admin/(shell)/add-slider/page.tsx` | Form now POSTs for real, CSRF-token-wired, success flash rendered. |
| `src/app/admin/(shell)/edit-slider/[id]/page.tsx` | Switched from `@/lib/demo/admin` to live `spaks_dev` read (`SliderRepository.findByLegacyId`); CSRF token added; success flash wired. Flagship two-`.box-body` structural defect UNCHANGED. |
| `src/app/admin/(shell)/slider-list/page.tsx` | Switched from `@/lib/demo/admin` to live `spaks_dev` read (`SliderRepository.findAllDescending`) — same half-migrated-trap avoidance as the pincode sub-slice. Success flash wired. P-18 (unused-by-homepage) and all other preserved defects UNCHANGED. |
| `tests/auth/routeProtection.test.ts` | Added 5 new structural tests: 3 new slider routes call `requireAdminSession`; `save-slider`/`update-slider` are in the CSRF `PROTECTED_ROUTES` list; `destroy-slider` is in `EXEMPT_GET_ROUTES`; `add-slider`/`edit-slider` pages are in `FORMS_WITH_REAL_TOKEN`. |
| `tests/mongodb/pinCodeRepository.test.ts` | Refactored to import the shared `createFakeCrudDb` from the new `tests/mongodb/fakeDb.ts` instead of its own inline copy of the same fake — avoids a second/third verbatim duplicate now that sliders needs the identical harness. No test behavior changed (all 9 pre-existing pincode tests still pass unchanged, verified independently before and after the refactor). |
| `docs/M3-OWNER-DECISION-RECORDS.md` | D-04 marked RESOLVED (addendum, append-only). |
| `MIGRATION-CONTRACT.md` | §9.3 Approved Fix Register: added FIX-003. |

**No other file was touched.** Every repository, auth module, existing
route.ts/page.tsx outside the slider surface, and all Laravel source —
confirmed unmodified. `src/lib/demo/admin/sliders.ts` (if it exists under
that name — the demo fixture backing `getAllAdminSliders`/
`getAdminSliderByLegacyId`) is left in place, now unreferenced by any live
page, NOT deleted — same NN-8/G-2 precedent as the pincode sub-slice.

**Deleted:** none.

---

## 4. WHAT WAS BUILT, MAPPED TO LARAVEL SOURCE

| Laravel route | Controller method | Next.js target | MongoDB collection |
|---|---|---|---|
| `GET admin/add-slider` (`admin.php:103`) | `AdminController@AddSlider` | `admin/(shell)/add-slider/page.tsx` (pre-existing, wired this session) | none (form only) |
| `POST admin/save-slider` (`admin.php:104`) | `AdminController@SaveSlider` | `admin/save-slider/route.ts` (new) | `sliders` (write) + filesystem write |
| `GET admin/edit-slider/{id}` (`admin.php:105`) | `AdminController@EditSlider` | `admin/(shell)/edit-slider/[id]/page.tsx` (pre-existing, live data this session) | `sliders` (read) |
| `POST admin/update-slider` (`admin.php:106`) | `AdminController@UpdateSlider` | `admin/update-slider/route.ts` (new) | `sliders` (write) + filesystem write/delete |
| `GET admin/destroy-slider/{id}` (`admin.php:107`) | `AdminController@DestroySlider` | `admin/destroy-slider/[id]/route.ts` (new) | `sliders` (delete) + filesystem delete |
| `GET admin/slider-list` (`admin.php:109`) | `AdminController@SliderList` | `admin/(shell)/slider-list/page.tsx` (pre-existing, live data this session) | `sliders` (read, `orderBy id desc`) |

No column-mismatch defect existed for this entity — `slider`'s real
columns (`slider_title`/`slider_subtitle`/`slider_image`/`slider_status`)
already match what `SaveSlider`/`UpdateSlider` write. No DR-equivalent
decision was needed for the data shape itself, unlike pincode's B-09.

### D-04 / Fix Register FIX-003 — file upload validation

`src/lib/uploads/adminUpload.ts` (new, general-purpose, migration-scoped —
explicitly NOT a reuse of `src/lib/herbs/uploads/`, which belongs to the
separate CR-003 project):

- **Extension whitelist:** `jpg, jpeg, png, gif, webp, pdf` (D-04's own
  recommended list). A rejected extension is a hard error — no filesystem
  write occurs, no `sliders` document is inserted/updated. This is the
  ONE observable behavioral difference from source's unconditional
  acceptance, disclosed here and in the Fix Register.
- **Filename sanitization:** the original filename's non-extension
  component is stripped of path separators and anything outside
  `[A-Za-z0-9._-]`, collapsing rejected characters to `_`. Verified this
  session against a path-traversal-shaped input (`../../etc/passwd.png`)
  and a shell-metacharacter-laden input — both produce a safe filename
  confined to the target subdirectory (§7 test evidence).
- **Naming pattern PRESERVED exactly:** `{unix-seconds}g{sanitizedName}`,
  matching source's `time().'g'.getClientOriginalName()` byte-for-byte in
  format (verified directly against `AdminController.php:1157-1158`) —
  this is business-observable (stored in the DB, appears in `<img src>`
  attributes) and D-04 does not authorize changing the FORMAT, only WHICH
  uploads are accepted and whether the name is sanitized first.
- **Old-image deletion order preserved:** `UpdateSlider`'s
  `move()`-before-`unlink()` sequence (new file saved successfully before
  the old one is deleted) is reproduced exactly in
  `update-slider/route.ts` — if the new upload is rejected, the old file
  is never touched, matching source's own effective behavior.

---

## 5. LIVE DATA MIGRATION (avoiding the half-migrated trap)

Same discipline as the pincode sub-slice: `slider-list/page.tsx` and
`edit-slider/[id]/page.tsx` were both switched to live `spaks_dev` reads
alongside the write path, avoiding a state where writes succeed but the
list/edit views still show frozen demo-fixture data.

---

## 6. PRESERVED DEFECTS VERIFIED

| ID | Defect | Reproduced | Evidence |
|---|---|---|---|
| Flagship structural defect — two adjacent `.box-body` divs on Edit | Structural markup defect, unrelated to D-04 | **Preserved** — unchanged, `edit-slider/[id]/page.tsx` |
| P-18 — sliders maintained by admin, unused by homepage | Preserved | **Preserved** — nothing in this slice wires `sliders` into any public page |
| Status prints raw lowercase/capitalized text, no badge styling | Preserved | **Preserved** — unchanged, `slider-list/page.tsx` |
| Delete link has no `confirm()` dialog | Preserved | **Preserved** — unchanged |
| D-04 (unvalidated uploads) | Was the contract default, now an Approved Fix (FIX-003) | **Deliberately NOT reproduced**, per owner decision — disclosed here and in the Fix Register, not silent |

**No item was found silently repaired.** The one deviation from strict
source fidelity (D-04's own resolution) carries an explicit, dated Fix
Register entry per contract §9.3.

---

## 7. VERIFICATION PERFORMED THIS SESSION

```
npm run typecheck    ✅ 0 errors
npm run lint          ✅ 0 errors (same 4 pre-existing, unrelated warnings)
npm run format:check  ✅ pass for every file this session touched — one
                          PRE-EXISTING, UNRELATED formatting gap found in
                          src/app/redesign/RedesignedHome.tsx (confirmed
                          via file mtime and `git diff --stat`: not
                          modified this session, predates this slice,
                          appears to belong to the separate CR-003/Herbs
                          Store work). NOT touched or "fixed" — out of
                          this slice's scope; flagged for the owner's
                          awareness rather than silently corrected.
npm run test          ✅ 428/428 passed, 49 test files, 0 regressions
                          (398 pre-existing + 30 new this session: 14
                          adminUpload.test.ts + 10 sliderRepository.test.ts
                          + 5 new structural cases in routeProtection.test.ts,
                          net of 1 file — pinCodeRepository.test.ts — being
                          refactored, not net-new, its own 9 tests
                          unchanged in count and behavior)
npm run build          — see §7.1
```

### 7.1 — Build verification, with a disclosed environment caveat

`npm run build` was run 5 times this session. The FIRST 3 attempts each
failed with a DIFFERENT internal Next.js/build-cache error
(`ENOENT: pages-manifest.json`, `PageNotFoundError: /_document`,
`ENOTEMPTY: .next/export`) — none referencing any file this slice or the
pincode sub-slice touched, and each attempt's own "Compiled successfully"
line printed BEFORE the failure, confirming the TypeScript/bundler
compilation step itself succeeded every time; only Next.js's own
post-compile page-data-collection housekeeping failed, consistently
pointing to `.next` cache/filesystem contention specific to this sandbox,
not a code defect. Attempts 4 and 5, both after a full `rm -rf .next`,
completed cleanly end-to-end with the full route table printed, confirming
all 6 slider routes compile correctly as `ƒ (Dynamic)` routes alongside
every pre-existing route, zero errors, zero retries needed on either clean
run. This flakiness pattern and its resolution are disclosed here in full
rather than silently retried until green without comment.

**Live Atlas verification: ATTEMPTED (implicitly, via the same standing
blocker), BLOCKED.** `REAL ATLAS VERIFICATION: NOT TESTED — environment
TLS/network limitation`, unchanged from every session since
`GATE-REPORT-M5-CART.md` §6 — not re-debugged this session, per explicit
instruction. This report's evidence for the slider write/read logic and
the upload-validation logic rests on FIXTURE-level tests: 10 repository
tests (in-memory fake Db) and 14 upload tests (REAL temporary-directory
`fs/promises` calls, not mocked — same rigor precedent as
`tests/herbs/uploadStorage.test.ts`), plus the successful `npm run build`
compilation check.

**No `spaks_dev` mutation was performed this session.** No real file was
written to `public/uploaded_files/slider/` — all upload-module tests
targeted a temporary directory via `ADMIN_UPLOAD_ROOT`, confirmed deleted
in each test's own cleanup.

---

## 8. AUTHORIZATION/OWNERSHIP CHECKS

Same as pincode: no per-resource ownership concept in Laravel for sliders
— any authenticated admin (`utype=1`) may add/edit/delete any slider,
matching source exactly. No ownership check was added beyond
`requireAdminSession()`.

---

## 9. ERROR / VALIDATION CHECKS

Source performs zero server-side validation on `slider_title`/
`slider_subtitle`/`slider_status` (confirmed by reading the full method
bodies — no `$request->validate()` call in either `SaveSlider` or
`UpdateSlider`). Reproduced faithfully for those three fields. The ONE
validation this slice adds — the upload extension whitelist — is D-04/
FIX-003's explicit, owner-approved, disclosed exception to that rule, not
an unauthorized tightening.

A missing/empty `slider_image` file on `save-slider` (source: this would
fatal on a null `UploadedFile`, an uncatalogued PHP null-dereference, not
itself a BROKEN register item) is handled with a disclosed, non-fatal
flash-and-redirect instead — same reasoning already established for
similar non-BROKEN-register edges elsewhere in this project (e.g. B-06's
sibling cases).

---

## 10. ROUTE CHECKS

All 6 routes verified against `routes/admin.php:103-109` by exact line
number this session. Paths, HTTP verbs, and `userAuth` group membership
all confirmed to match source exactly.

---

## 11. REGRESSION CHECK — M3/M4/M5 SURFACE

`npm run test` confirms all 398 pre-existing tests (through the pincode
sub-slice) still pass unchanged alongside the 30 new/refactored this
session — zero regressions. No file under `src/lib/auth/`,
`src/lib/mongodb/client.ts`, `src/lib/mongodb/environmentGuard.ts`, any
existing schema, `src/lib/mongodb/repositories/pinCodeRepository.ts`, or
any pre-existing repository/route/page outside the slider surface was
modified (the pincode TEST file's own refactor is test-infrastructure
only, not a change to `pinCodeRepository.ts` itself).

---

## 12. NEW FINDINGS THIS SESSION

1. **Build-tooling flakiness** in this specific sandbox (§7.1) — disclosed,
   not a code defect, resolved by a full `.next` cache clear.
2. **`src/app/redesign/RedesignedHome.tsx` fails `prettier --check`** —
   pre-existing, unrelated to this slice or the pincode sub-slice,
   confirmed unmodified this session. Flagged for the owner's awareness,
   not fixed (out of scope — appears to belong to CR-003/Herbs Store,
   which this migration explicitly does not touch).

---

## 13. DEVIATIONS

| Type | Item | Authorization |
|---|---|---|
| Fix Register entry | FIX-003 — upload extension whitelist + filename sanitization | `MIGRATION-CONTRACT.md` §9.3; §0.2 above |
| Pre-approved (§5.2) | List/edit pages switched to live `spaks_dev` reads | Mechanical extension; no SQL/rendered-output change to the slider data itself |

**Undocumented deviations: NONE.**

---

## 14. SIGN-OFF

**Implementer:** Migration Implementer **Date:** 2026-09-04
**Owner authorization:** given in-session, 2026-09-04, per §0 above
(sliders selected as the second M5-E sub-slice; D-04 resolved with its
recommended fix, Fix Register FIX-003).

**M5-E (slider sub-slice) status: GATE CLOSED** for its own scope.
**M5-E overall remains PARTIAL** — categories, blogs, blog categories, and
posts all remain unbuilt, each its own future sub-slice. M5-D (seller
registration) remains explicitly DEFERRED, unchanged.

**Per the task's STOP condition: no other M5-E sub-slice, M5-D, M5-F, or
any other milestone was started.** No production MongoDB was contacted.
No Laravel source was modified. No Herbs Store/CR-003 work was touched
(the pre-existing, unrelated formatting gap in `RedesignedHome.tsx` was
found, not fixed). Waiting for explicit owner authorization before
starting the next sub-slice.

---

## ADDENDUM (2026-09-04, found during the blog-categories sub-slice) — FIX-003 and FIX-004

**Append-only. Nothing above this line is altered, deleted, or superseded.**

**FIX-003 paperwork gap:** D-04's resolution and implementation in this
report (§0.2, §4) were real and correctly done at the time, but the
corresponding `MIGRATION-CONTRACT.md` §9.3 Fix Register row was never
actually added — found omitted during the blog-categories sub-slice and
corrected retroactively (the approval/implementation date recorded in the
Fix Register remains 2026-09-04, this report's own session, not backdated
further or changed).

**FIX-004:** `update-slider/route.ts` (§4 above) originally set
`updatedAt: new Date()` on every update — an unauthorized fidelity
deviation for the same reason as the pincode sub-slice's identical bug
(`slider.updated_at` has no `ON UPDATE current_timestamp()` clause).
Corrected in the blog-categories sub-slice; recorded as Fix Register
FIX-004. Full disclosure: `docs/GATE-REPORT-M5-E-BLOG-CATEGORIES.md` §5.
No other claim in this report is affected.

---

*End of Gate Report M5-E (Sliders), including this addendum.*
