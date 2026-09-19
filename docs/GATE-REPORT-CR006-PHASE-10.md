# GATE REPORT — CR-006 Phase 10 (Testing / Hardening Pass)

**Status:** ✅ COMPLETE. Found and fixed one real, severe, previously
undetected production bug (§1.3) — the exact outcome a genuine testing/
hardening phase is meant to produce.
**This is the FINAL phase in CR-006's approved order.** No further
CR-006 phases remain; Settings stays under separately-scoped CR-002, not
opened by this CR.

---

## 1. What changed

### 1.1 Scoping — no hidden prior work to discover, genuinely open-ended

Unlike every prior phase, `CR-006-ANALYSIS-PHASE1.md`/
`CR-006-FULL-ADMIN-CMS-PLATFORM.md` give Phase 10 exactly one
unelaborated line each ("Testing/hardening pass") and no document
anywhere defines a concrete deliverable. Scope was derived from direct
measurement rather than a misread prior document: 620 tests existed
pre-Phase-10, all FIXTURE-level, zero touching any `page.tsx`/`route.ts`
directly; Playwright infrastructure existed (buyer-page parity, herbs
storefront) but nothing touched the admin CMS built in Phases 2–9. Per
owner decision, this phase delivered both halves: targeted unit coverage
for the highest-risk untested files, and a new small Playwright suite
for admin CMS flows. Full record in `CR-006-PHASE-10-PLAN.md` §0.

### 1.2 Unit-level gap-filling

Added FIXTURE-level tests for 4 files with real logic living outside a
repository class (exactly the category Phase 9's own bypass-method bug
showed was previously invisible to this project's test suite):

- `src/middleware.ts` — first-ever test of the module itself, not just
  the redirect-lookup logic underneath. Covers: 301/302 redirect
  behavior, pass-through on no match, fail-open on fetch error/non-ok
  response, the 60s in-memory cache actually not re-fetching within its
  window, and the matcher config's own exclusion list.
- `src/app/api/redirects/route.ts` — proves the specific contract
  `middleware.ts`'s fail-open behavior depends on: this endpoint returns
  `200 { rules: [] }`, never an error status, when its database
  dependency fails.
- `src/app/admin/update-review/[productId]/[reviewId]/[status]/route.ts`
  (Phase 7) and `src/app/admin/update-admin-user-role/route.ts`
  (Phase 9, the newest and least-exercised write path in the CR) —
  representative admin mutation routes, including
  `update-admin-user-role`'s real CSRF-ordering and role-validation-
  fallback logic.

### 1.3 Real bug found and fixed — `readAndClearFlash()` 500s on every admin list page after a write

**Found via the new e2e suite, not by inspection.** The deep redirects
CRUD spec (create → list → audit log → delete) failed on its second
step: `/admin/redirects-list` returned a genuine HTTP 500, "Application
error: a server-side exception has occurred." Dev-server logs pinpointed
the cause exactly: `readAndClearFlash()`
(`src/lib/auth/flash.ts`) calls `cookieStore.delete(...)` — but Next.js
forbids cookie mutation from a Server Component render (only a Server
Action or Route Handler may do it), and **every one of this function's
43 real call sites is a `page.tsx` Server Component**. The delete only
throws when a flash cookie is actually present — which is true
immediately after every single create/update/delete action's route
handler calls `setFlash()` and redirects back to its own list page. This
is precisely the path no prior phase's manual verification ever
happened to exercise (visiting a list page cold, with no flash cookie
set, never triggers the bug) — the e2e suite's realistic
create-then-immediately-view-the-list flow is what first surfaced it.

**Severity:** every one of the 43 admin pages using `readAndClearFlash`
was broken in this specific, common way — an admin saving/editing/
deleting almost anything through this CMS would land on a 500 error
page instead of seeing their own success message, though the underlying
write itself had already succeeded (the exception occurs during
rendering, after the mutation completed).

**Fix (owner-approved 2026-09-16):** the `cookieStore.delete(...)` call
is now wrapped in a try/catch — best-effort, not required. The read
(and thus the message itself) still works in every context; only the
explicit early-clear is skipped when called from the forbidden
Server-Component context, which is every real call site. Trade-off,
disclosed in the function's own updated header comment: the flash
cookie's existing 60-second `maxAge` (already set by `setFlash`) becomes
the actual expiry mechanism instead of an explicit one-shot delete — a
page reload within that 60s window could show the message a second
time, instead of never. Strictly better than the 500 every affected page
was actually producing before this fix, and the alternative (moving
every one of 43 pages' flash-clearing into an accompanying route
handler) was assessed as disproportionate to the actual risk (a
double-shown success message, not a broken page) — see the plan's §6.1
correction discussion.

**Verified:** the same e2e spec, re-run after the fix, passes end to
end — create, list, audit-log, delete all succeed in one real browser
session against the real dev server and database.

### 1.4 New Playwright admin suite

`playwright.admin.config.ts` — third config, third `testDir`
(`tests/admin-e2e/`), third npm script pair (`test:e2e:admin`/
`test:e2e:admin:ui`), same structural isolation `playwright.herbs.config.ts`
already established. `fullyParallel: false` (unlike herbs) — several
specs share the one real admin account's data in the shared dev
database, so serial execution avoids cleanup/setup races.

**Authentication without a real password:** `tests/admin-e2e/auth.ts`
constructs a validly-signed session cookie directly, reusing
`SESSION_SECRET` from the same `.env.local` the dev server reads —
`session.ts`'s cookie is a self-contained HMAC-signed value, not a
lookup key into a server-side store, so a directly-constructed cookie is
cryptographically indistinguishable from one the real login form would
produce. This exercises the REAL `requireAdminSession()`/
`requirePermissionForSession()` guard chain on every request; it skips
only the login FORM submission. Verified against the one real admin
account confirmed present in the dev database this phase
(`legacyId: 1`).

**9 specs across 3 files**, all passing against the real dev server:
- `rbac.spec.ts` (2) — unauthenticated redirect to `/admin/login`;
  authenticated access succeeds (proves the cookie technique itself
  works).
- `redirects-crud.spec.ts` (1) — the one deep round-trip: create a
  redirect → appears on the list → appears on the audit log (filtered by
  collection) → delete → confirmed gone. Touches Phase 8, Phase 9, and
  the RBAC chain in one real browser flow. This is the spec that found
  §1.3's bug.
- `smoke.spec.ts` (6) — one read-only "does it render, status 200,
  correct heading" check per remaining phase (order-list, homeopathy-list,
  wellness-categories, pages-list, media-library, admin-users-list).

**Real-world timing finding, disclosed rather than hidden:**
`/admin/media-library` (Phase 8) took 30–38 seconds to load in this
environment during e2e testing — a genuine characteristic of that page's
design (a real `readdir`/`stat` filesystem scan across
`uploaded_files/products`' 1615 real files, confirmed present since
Phase 8), not a test flake. The admin config's default test timeout was
raised from Playwright's 30s default to 45s specifically to accommodate
this, with the reason documented inline in the config rather than
silently padded.

## 2. What was tested

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ Clean |
| `npm run lint` | ✅ 0 errors, 4 pre-existing warnings (unchanged since Phase 2) |
| `npx vitest run` — full suite | ✅ **639/639 passed, 74/74 test files** — zero regressions (up from 620/70 before this phase) |
| `npm run build` (production) | ✅ Clean |
| `npm run test:e2e:admin` — new Playwright suite | ✅ **9/9 passed** against the real dev server and database, including the deep CRUD round-trip that found and then confirmed the fix for §1.3's bug |

## 3. Files changed

**Created (9):** `tests/mongodb/middleware.test.ts`,
`tests/mongodb/redirectsApiRoute.test.ts`,
`tests/mongodb/updateReviewRoute.test.ts`,
`tests/mongodb/updateAdminUserRoleRoute.test.ts`,
`playwright.admin.config.ts`, `tests/admin-e2e/auth.ts`,
`tests/admin-e2e/rbac.spec.ts`, `tests/admin-e2e/redirects-crud.spec.ts`,
`tests/admin-e2e/smoke.spec.ts`.
**Modified (3):** `src/lib/auth/flash.ts` (the bug fix, §1.3),
`package.json` (2 new scripts), `.gitignore` (added the herbs/admin
Playwright output-directory patterns, a pre-existing gap fixed
incidentally while adding the admin ones).
**Deleted:** none (throwaway diagnostic scripts used during
investigation were removed after use).

## 4. What Phase 10 explicitly does NOT do

- Blanket unit-test coverage of all 63 admin pages / 59 route handlers —
  4 targeted files only, per the plan's own reasoned scope boundary.
- Full CRUD e2e coverage of every admin module — one deep flow, six
  shallow smoke checks, per the plan's explicit "small suite" framing.
- A coverage-percentage target or `vitest.config.ts` tooling change —
  the project's own documented philosophy (fidelity via baseline
  diffing, not %) was left unchanged.
- Any CI pipeline — no `.github/workflows` added; never named by any
  CR-006 doc as in scope.
- Resolution of the still-open "does this project have a git repo"
  contradiction (Phase 8/9 both flagged it; re-confirmed present again
  this phase via `git remote -v`, still unresolved — unrelated to
  testing, not addressed here).
- A deeper architectural fix for the flash-cookie mechanism (moving all
  43 pages' clearing into route handlers) — assessed and explicitly
  deferred in favor of the smaller catch-and-ignore fix, per owner
  decision (§1.3).

## 5. Files intentionally left untouched

- All 620 pre-existing tests — not re-litigated or expanded for their
  own sake.
- The other 41 pages that also call `readAndClearFlash()` — none needed
  a per-file change; the fix lives in the one shared function all of
  them call.
- `playwright.config.ts` / `playwright.herbs.config.ts` — untouched;
  the new admin config is fully separate, per design.

## 6. Limitations / known gaps carried forward

- The flash-message fix trades "exactly once" for "shown for up to 60
  seconds" — disclosed, not hidden, and assessed as an acceptable
  trade-off for a cosmetic (not data-integrity) concern.
- `/admin/media-library`'s multi-second load time (confirmed this phase,
  §1.4) is a real, unaddressed performance characteristic — flagged, not
  fixed; fixing it (e.g. paginating or caching the filesystem scan) was
  not in this phase's scope.
- The admin e2e suite runs against the one real admin account and the
  shared dev database — a future CI integration would need either a
  dedicated test database or careful isolation from real admin work
  happening concurrently; not designed for CI this phase (no CI
  pipeline exists to integrate with, per §4).
- This is the LAST phase in CR-006's approved order. No further
  CR-006-scoped work is planned; Settings remains CR-002's own,
  not-yet-opened scope.

---

**CR-006 is now complete across all 10 approved phases (2 through 10).
No further phase-plan documents are expected under this CR.**
