# MILESTONE GATE REPORT — M5-E (Pin Codes): Admin CRUD Write Path, First Sub-Slice

**Milestone:** M5-E, first sub-slice (pin codes) — per `docs/M5-PREFLIGHT-AUDIT.md`
§10's own recommendation that M5-E be "broken into per-entity sub-slices...
rather than authorized as one block." M5-D (seller registration) is
explicitly SKIPPED for this session — see §0.1.
**Period:** 2026-09-04
**Author:** Migration Implementer
**Report date:** 2026-09-04
**Contract version:** 1.0

---

## 0. AUTHORIZATION RECORD AND SEQUENCING DECISION (this session)

### 0.1 — M5-D (seller registration) confirmed still deferred, not started

`docs/M5-PREFLIGHT-AUDIT.md` (2026-08-26) proposed the order M5-C → M5-D →
M5-E. `docs/GATE-REPORT-M4-AUTH.md` ADDENDUM 6 (2026-08-31 — five days
later, a durable owner decision) already resolved seller registration as
**DEFERRED**: *"Revisit only if a future milestone has a concrete
functional need."* Per contract Part 3 (Approved Owner Decisions, rank 1,
outrank any implementer planning document including the preflight audit),
that decision governs. Presented with this conflict, the owner confirmed:

> **Owner:** homeopathy38@gmail.com
> **Decision:** APPROVED
> **Scope:** M5-D (seller registration) remains DEFERRED — no concrete
> functional need has been raised since 2026-08-31. Proceed to M5-E
> instead.
> **Date:** 2026-09-04

**No seller-registration code was written or modified this session.**

### 0.2 — M5-E scoping: pin codes selected as the first sub-slice

M5-E covers 6 independent write surfaces (products, categories, blogs,
posts, sliders, pin codes) with zero existing write-path code for any of
them. Per the preflight's own recommendation to split into per-entity
sub-slices, the owner selected pin codes:

> **Owner:** homeopathy38@gmail.com
> **Decision:** APPROVED
> **Scope:** First M5-E sub-slice: pin codes (add/edit/delete admin CRUD).
> **Date:** 2026-09-04

### 0.3 — DR-03 resolved (BLOCKING for this specific sub-slice)

Building the pincode write path immediately surfaced DR-03 (B-09's
disposition), open since 2026-08-16 and never resolved. Per contract
§10.1 Step 6, this was raised to the owner rather than guessed. Full
decision record: `docs/M3-OWNER-DECISION-RECORDS.md` DR-03 ADDENDUM 3.
Summary:

> **Owner:** homeopathy38@gmail.com · **Decision:** APPROVED
> DR-03 Option 2 — pincode admin CRUD works correctly against the real
> column shape, formally recorded as Fix Register **FIX-001**
> (`MIGRATION-CONTRACT.md` §9.3).
> **Date:** 2026-09-04

A second, narrower fork surfaced once Option 2 made it concrete: the Add
form's Status field carries a separate, pre-existing corrupted attribute
name (`name="'pin_status"`, a literal stray quote) that this project's own
code comments call its "flagship preserve-real-defects example." The owner
was asked whether this should stay broken (meaning Status silently never
saves on Add even under Option 2) or be corrected too:

> **Owner:** homeopathy38@gmail.com · **Decision:** APPROVED
> Corrected to `name="pin_status"` — Fix Register **FIX-002**.
> **Date:** 2026-09-04

---

## 1. CONTRACT ACKNOWLEDGEMENT

- [x] Read `MIGRATION-CONTRACT.md` in full this session (§9.3 Approved
      Fix Register — the FIRST entries this project has ever added to it;
      Part 6 Change Control; NN-4/NN-5/F-16/F-17; §10.1 decision procedure,
      Step 6 specifically)
- [x] Read `docs/M3-OWNER-DECISION-RECORDS.md` DR-03 in full (both the
      original 2026-08-16 analysis and confirmed it remained unresolved)
      before raising it to the owner
- [x] Read `docs/GATE-REPORT-M4-AUTH.md` ADDENDUM 6 directly (the seller
      registration deferral) before concluding M5-D was blocked
- [x] Read `docs/M5-PREFLIGHT-AUDIT.md` §10 (M5-E's own scoping guidance)
- [x] Read the LIVE Laravel source directly this session:
      `AdminController.php:1097-1140` (`AddPinCode`, `PinCodeList`,
      `SavePinCode`, `EditPinCode`, `UpdatePinCode`, `DestroyPinCode`, all
      6 methods in full), `routes/admin.php:96-101` (route registration,
      confirmed all 6 sit inside the `userAuth` group), verified `csrf_field()`
      presence directly on both `add-pin-code.blade.php` and
      `edit-pincode.blade.php`
- [x] Re-verified `src/lib/mongodb/schemas/pinCode.ts`'s pre-existing
      header (NOT assumed from memory) before touching the schema/repository
- [x] No Laravel source file was modified
- [x] `spaks_dev` is the only database any code in this slice can reach,
      via the pre-existing, unmodified `assertNonProductionTarget()`/
      `getDb()` guards — confirmed unmodified this session
- [x] No credential, secret, or session value appears in this report

---

## 2. FILES CREATED

```
src/app/admin/save-pincode/route.ts               — POST /admin/save-pincode
src/app/admin/update-pincode/route.ts              — POST /admin/update-pincode
src/app/admin/destroy-pincode/[id]/route.ts        — GET /admin/destroy-pincode/{id}
tests/mongodb/pinCodeRepository.test.ts            — 9 tests (FIXTURE)
docs/GATE-REPORT-M5-E-PINCODE.md                   — this report
```

**9 new tests + 5 new structural tests in `routeProtection.test.ts` (§2
modified), 14 total, all passing.**

## 3. FILES MODIFIED

| Path | Change |
|---|---|
| `src/lib/mongodb/repositories/base.ts` | Added `updateOne`, `deleteOne`, `nextLegacyIdGeneric` — generic CRUD helpers for M5-E-wide reuse (products/categories/blogs/posts/sliders will all need update/delete too). Named `nextLegacyIdGeneric`, not `nextLegacyId`, specifically to avoid a TypeScript `noImplicitOverride` collision with the pre-existing per-repository `nextLegacyId()` methods in `userRepository.ts`/`enquiryRepository.ts`/`appointmentRepository.ts` — those 3 files are UNCHANGED this session. `find`/`insertOne`/`upsertByLegacyId`/`count` UNCHANGED. |
| `src/lib/mongodb/repositories/pinCodeRepository.ts` | DR-03 resolved: added `findAllDescending`, `findByLegacyId`, `updatePinCode`, `deletePinCode`. `insertPinCode` UNCHANGED (was already correct-by-construction; this resolution is what authorizes using it for real admin saves). Header comment updated to reflect DR-03's resolution. |
| `src/lib/mongodb/schemas/pinCode.ts` | Header comment only — updated to state DR-03 is RESOLVED (was "NOT YET APPROVED"). Schema fields themselves UNCHANGED. |
| `src/app/admin/(shell)/add-pin-code/page.tsx` | Form now POSTs for real with a CSRF token; success flash wired; FIX-002 applied (`name="'pin_status"` → `name="pin_status"`). |
| `src/app/admin/(shell)/edit-pincode/[id]/page.tsx` | Switched from `@/lib/demo/admin` to live `spaks_dev` read (`PinCodeRepository.findByLegacyId`); CSRF token added; success flash wired. Status `<select>`'s already-correct `name="pin_status"` UNCHANGED (it was never corrupted — see file's own header). |
| `src/app/admin/(shell)/pin-code-list/page.tsx` | Switched from `@/lib/demo/admin` to live `spaks_dev` read (`PinCodeRepository.findAllDescending`) — avoids the "writes succeed but the list doesn't show them" half-migrated trap `docs/M5-PREFLIGHT-AUDIT.md` §10 explicitly warned M5-E about. Success flash wired. Preserved mislabel ("Name" over the pincode value) UNCHANGED. |
| `tests/auth/routeProtection.test.ts` | Added 5 new structural tests: 3 new pincode routes call `requireAdminSession`; `save-pincode`/`update-pincode` are in the CSRF `PROTECTED_ROUTES` list; `destroy-pincode` is in `EXEMPT_GET_ROUTES`; `add-pin-code`/`edit-pincode` pages are in `FORMS_WITH_REAL_TOKEN`. |
| `docs/M3-OWNER-DECISION-RECORDS.md` | DR-03 marked RESOLVED (status banner + ADDENDUM 3, append-only — original analysis text unedited); summary table row updated. |
| `MIGRATION-CONTRACT.md` | §9.3 Approved Fix Register: added FIX-001, FIX-002 — **the first entries this register has ever received.** |

**No other file was touched.** `src/lib/demo/admin/pincodes.ts` (the demo
fixture, `getAllAdminPinCodes`/`getAdminPinCodeByLegacyId`) is left in
place, now unreferenced by any live page — NOT deleted, per NN-8/G-2 (file
deletion requires justification and is normally zero), same precedent as
`src/lib/demo/cart.ts` being left in place after M5-Cart superseded it.
Every other repository (`userRepository.ts`, `enquiryRepository.ts`,
`appointmentRepository.ts`, `productRepository.ts`, `categoryRepository.ts`,
etc.), every auth module, every existing route.ts, and all Laravel source
— confirmed unmodified.

**Deleted:** none.

---

## 4. WHAT WAS BUILT, MAPPED TO LARAVEL SOURCE

| Laravel route | Controller method | Next.js target | MongoDB collection |
|---|---|---|---|
| `GET admin/add-pin-code` (`admin.php:96`) | `AdminController@AddPinCode` | `admin/(shell)/add-pin-code/page.tsx` (pre-existing, this session: wired for real) | none (form only) |
| `GET admin/pin-code-list` (`admin.php:97`) | `AdminController@PinCodeList` | `admin/(shell)/pin-code-list/page.tsx` | `pinCodes` (read, `orderBy id desc`) |
| `POST admin/save-pincode` (`admin.php:98`) | `AdminController@SavePinCode` | `admin/save-pincode/route.ts` (new) | `pinCodes` (write — DR-03 Option 2) |
| `GET admin/edit-pincode/{id}` (`admin.php:99`) | `AdminController@EditPinCode` | `admin/(shell)/edit-pincode/[id]/page.tsx` (pre-existing, this session: live data) | `pinCodes` (read, no B-09 defect — reads by `id`) |
| `POST admin/update-pincode` (`admin.php:100`) | `AdminController@UpdatePinCode` | `admin/update-pincode/route.ts` (new) | `pinCodes` (write — DR-03 Option 2) |
| `GET admin/destroy-pincode/{id}` (`admin.php:101`) | `AdminController@DestroyPinCode` | `admin/destroy-pincode/[id]/route.ts` (new) | `pinCodes` (delete, no B-09 defect — `where id`) |

### DR-03 / B-09 — RESOLVED (Fix Register FIX-001)

Source's `SavePinCode`/`UpdatePinCode` write `pin_code`/`pin_address`/
`pin_status` — columns confirmed absent from the live `pin_codes` table
(real columns: `pincode`/`location`/`country`/`uid`/`status`), producing a
SQL error on every real submission. Per the owner-approved fix, this
port's write path targets the REAL columns and succeeds. This is a
disclosed, Fix-Register-recorded deviation from B-09's literal failure —
not silent, and not a violation of NN-4 (which explicitly permits repair
via an Approved Fix Register entry).

`EditPinCode`/`DestroyPinCode` (`WHERE id = $id`) have **no B-09 defect at
all** — `id` is a real column; the mismatch is confined to the two write
methods' `insert`/`update` column lists. Verified directly this session,
not assumed.

### FIX-002 — corrupted `pin_status` attribute on Add, corrected

`add-pin-code.blade.php:108`'s `name="'pin_status"` (stray leading
single-quote, genuinely part of the rendered HTML, not a template
artifact) previously meant the Status field's value was never observable
under Laravel's own broken write path either (the SQL error fired before
the field name could matter). Under FIX-001, this would have become a new,
silent Add-specific gap (Status never saves on Add even though it now
works on Edit) had it not been separately raised and resolved. Corrected
to `name="pin_status"` per the owner's explicit approval (§0.3) — **this
correction required its own authorization, distinct from FIX-001**,
because it is not itself part of B-09/DR-03's scope (a database-column
mismatch) but a separate HTML-attribute defect this project's own code
previously called its flagship "never fix this" example.

### CSRF protection

Both `add-pin-code.blade.php` and `edit-pincode.blade.php` carry
`{{csrf_field()}}` on their forms (verified directly this session) — both
`save-pincode` and `update-pincode` are CSRF-protected, consistent with
M5-B's established pattern. `destroy-pincode` is GET (source: IR-3
preserves GET-based destructive operations as GET) and correctly exempt,
matching `cancel-order`'s precedent — Laravel's `VerifyCsrfToken`/
`isReading()` exempts GET/HEAD/OPTIONS entirely.

### Admin session guard

All 6 pincode routes sit inside `admin.php`'s `userAuth` group (verified
by line number, `admin.php:6` opens the group, lines 96-101 are all
inside it). The 3 read pages are gated by the pre-existing `(shell)`
layout guard (unchanged, unmodified). The 3 new `route.ts` files sit
OUTSIDE `(shell)` (matching every other admin route.ts precedent, e.g.
`admin/user-login/route.ts`), so each calls `requireAdminSession()`
independently — verified structurally (§7) and by direct code reading.

---

## 5. LIVE DATA MIGRATION (avoiding the half-migrated trap)

`docs/M5-PREFLIGHT-AUDIT.md` §5 explicitly warned that switching only the
write path to live data while list/edit pages keep reading demo fixtures
would produce "a half-migrated state where writes succeed but the list
view doesn't show them." Both `pin-code-list/page.tsx` and
`edit-pincode/[id]/page.tsx` were switched to live `spaks_dev` reads this
session, alongside the write path, specifically to avoid that trap. This
is the first admin list/detail page in this codebase to read live data
instead of `@/lib/demo/admin` — a precedent for the remaining M5-E
sub-slices (categories/blogs/posts/sliders/products) to follow, not a
one-off.

---

## 6. PRESERVED DEFECTS VERIFIED

| ID | Defect | Reproduced | Evidence |
|---|---|---|---|
| Flagship mislabel — "Name" header over the pincode value | Cosmetic display defect, distinct from B-09 | **Preserved** — unchanged, `pin-code-list/page.tsx` |
| Status column capitalized "Active"/"Inactive", varchar comparison | Preserved | **Preserved** — unchanged |
| B-09 (`pin_code`/`pin_address`/`pin_status` column mismatch) | Was BROKEN, now an Approved Fix (FIX-001) | **Deliberately NOT reproduced**, per owner decision — disclosed here and in the Fix Register, not silent |

**No item was found silently repaired.** Both deviations from strict
"broken stays broken" (B-09's own resolution, and the corrupted attribute
correction) carry explicit, dated Fix Register entries per contract §9.3
— this is the correct mechanism for exactly this situation, not a
violation of it.

---

## 7. VERIFICATION PERFORMED THIS SESSION

```
npm run typecheck    ✅ 0 errors
npm run lint          ✅ 0 errors (same 4 pre-existing, unrelated warnings)
npm run format:check  ✅ pass
npm run test          ✅ 398/398 passed, 47 test files, 0 regressions
                          (383 pre-existing + 15 new: 9 pinCodeRepository.test.ts
                          + 5 new structural cases in routeProtection.test.ts;
                          one fixture bug — a shared-object mutation across
                          test cases — found and fixed during this session's
                          own test-writing, not left in)
npm run build          ✅ pass — all 6 pincode routes compile correctly:
                          /admin/add-pin-code, /admin/pin-code-list,
                          /admin/save-pincode, /admin/edit-pincode/[id],
                          /admin/update-pincode, /admin/destroy-pincode/[id]
                          all ƒ (Dynamic)
```

**Live Atlas verification: ATTEMPTED, BLOCKED.**
`REAL ATLAS VERIFICATION: NOT TESTED — environment TLS/network
limitation.` Consistent with every session since `GATE-REPORT-M5-CART.md`
§6 — not re-debugged this session, per explicit instruction. No fake,
weakened, or bypassed verification was substituted. This report's evidence
for the pincode write/read logic rests on the FIXTURE-level tests (§2, 9
new tests covering insert/update/delete/find/sort/no-op-on-missing-id) and
the `npm run build` compilation check — the same evidentiary standard
`GATE-REPORT-M5-CART.md` and `GATE-REPORT-M5-C.md` both used for their own
still-open live-verification gaps.

**No `spaks_dev` mutation was performed this session** — all repository
logic was verified against the in-memory fixture only; no live insert/
update/delete against real `spaks_dev.pinCodes` was attempted (blocked by
the same TLS limitation that blocks all live verification currently).

---

## 8. AUTHORIZATION/OWNERSHIP CHECKS

Pincode admin CRUD has no per-resource ownership concept in Laravel
(unlike buyer orders' `view-order`/`cancel-order`) — any authenticated
admin (`utype=1`) may add/edit/delete any pincode, matching source exactly
(`AdminController`'s own `userAuth`-group-level gate is the only
authorization check Laravel applies here). Verified: no ownership check
was added beyond `requireAdminSession()`, consistent with source.

---

## 9. ERROR / VALIDATION CHECKS

Source performs **zero server-side validation** on any of the 3 pincode
fields (`pin_code`/`pin_address`/`pin_status` are read via
`$request->pin_code` etc. with no `$request->validate()` call anywhere in
`SavePinCode`/`UpdatePinCode` — confirmed by reading the full method
bodies). Reproduced faithfully: `save-pincode/route.ts` and
`update-pincode/route.ts` perform no validation on these fields either —
an empty submission writes empty strings, matching source's own absence of
validation (IR-5: "where validation is absent, it stays absent").

---

## 10. ROUTE CHECKS

All 6 routes verified against `routes/admin.php:96-101` by exact line
number this session (§1). Paths, HTTP verbs, and the `userAuth` group
membership all confirmed to match source exactly. No route was renamed,
added beyond the 6 source defines, or had its verb changed.

---

## 11. REGRESSION CHECK — M3/M4/M5 SURFACE

`npm run test` confirms all 383 pre-existing tests (M0 through M5-C) still
pass unchanged alongside the 15 new this session — zero regressions. No
file under `src/lib/auth/`, `src/lib/mongodb/client.ts`,
`src/lib/mongodb/environmentGuard.ts`, any existing schema, or any
pre-existing repository/route/page outside the pincode surface was
modified.

---

## 12. NEW FINDINGS THIS SESSION

None beyond what §0.3 already surfaced and resolved (the corrupted
`pin_status` attribute). No other defect was discovered in the 6 pincode
controller methods beyond what was already documented in
`schemas/pinCode.ts`'s pre-existing header and `docs/M3-APPLICATION-MAPPING.md`.

---

## 13. DEVIATIONS

| Type | Item | Authorization |
|---|---|---|
| Fix Register entry | FIX-001 — B-09 pincode write path now succeeds | `MIGRATION-CONTRACT.md` §9.3; §0.3 above |
| Fix Register entry | FIX-002 — corrected corrupted `pin_status` attribute | `MIGRATION-CONTRACT.md` §9.3; §0.3 above |
| Pre-approved (§5.2) | List/edit pages switched to live `spaks_dev` reads | Mechanical extension of the write-path change; no SQL/rendered-output change to the pincode data itself |

**Undocumented deviations: NONE.**

---

## 14. SIGN-OFF

**Implementer:** Migration Implementer **Date:** 2026-09-04
**Owner authorization:** given in-session, 2026-09-04, per §0 above
(M5-D deferral confirmed; M5-E/pincode scoping approved; DR-03 resolved;
FIX-002 approved).

**M5-E (pincode sub-slice) status: GATE CLOSED** for its own scope.
**M5-E overall remains PARTIAL** — categories, blogs, posts, sliders, and
products all remain unbuilt, each its own future sub-slice per this
project's established "small, independently verifiable slices"
discipline. M5-D (seller registration) remains explicitly DEFERRED,
unchanged.

**Per the task's STOP condition: no other M5-E sub-slice, M5-D, M5-F, or
any other milestone was started.** No production MongoDB was contacted.
No Laravel source was modified. No Herbs Store/CR-003 work was touched.
Waiting for explicit owner authorization before starting the next
sub-slice.

---

## ADDENDUM (2026-09-04, found during the blog-categories sub-slice) — FIX-004

**Append-only. Nothing above this line is altered, deleted, or superseded.**

`update-pincode/route.ts` (§4 above) originally set `updatedAt: new
Date()` on every update. This was found to be an unauthorized fidelity
deviation — `pin_codes.updated_at` has no `ON UPDATE current_timestamp()`
clause and source's raw `update([...])` call never sets it either, so on
real Laravel it is set once at creation and never changes again. Corrected
in the blog-categories sub-slice; recorded as Fix Register FIX-004
(`MIGRATION-CONTRACT.md` §9.3). Full disclosure:
`docs/GATE-REPORT-M5-E-BLOG-CATEGORIES.md` §5. No other claim in this
report is affected — §7's test/build verification results were accurate
at the time; this addendum documents a subsequent correction, not a
retraction of what passed then.

---

*End of Gate Report M5-E (Pin Codes), including this addendum.*
