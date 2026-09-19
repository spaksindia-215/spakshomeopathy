# CR-006 Phase 10 — Implementation Plan: Testing / Hardening Pass

**Status:** ✅ IMPLEMENTED — see `GATE-REPORT-CR006-PHASE-10.md` for the
final, as-built record. This phase found and fixed a real, previously
undetected production bug affecting all 43 admin list pages
(`readAndClearFlash()` throwing a 500 whenever a flash message cookie
was actually present) — exactly the kind of thing a genuine
testing/hardening pass exists to catch. Full account in the gate report.
**Depends on:** `GATE-REPORT-CR006-PHASE-9.md` (Phase 9 complete). This is
the FINAL phase in CR-006's approved order.
**Scope confirmed by owner decision (2026-09-16):** both halves — (1)
targeted unit/fixture coverage for currently-untested, security-relevant
route/middleware files, and (2) a new, small Playwright suite covering
admin CMS flows built across Phases 2–9 (login/RBAC/CRUD), mirroring the
existing `test:e2e:herbs` pattern.

---

## 0. Why this phase is different from every prior one

Every prior phase had a named feature to investigate against Laravel
source and prior CR-006 work. Phase 10 does not — both scoping docs give
it exactly one unelaborated line each:

> `CR-006-ANALYSIS-PHASE1.md`: "Testing/hardening pass | — | All prior"
> `CR-006-FULL-ADMIN-CMS-PLATFORM.md`: "Testing/hardening pass across all phases"

No test-plan or QA-strategy document exists anywhere in `docs/` to
inherit scope from (confirmed by search). So this phase's scope is
derived from direct measurement of the current test suite, not from a
misread prior document — there's no "Phase 1 got this wrong" correction
to make here, just a gap assessment.

**Current state, measured directly this phase:**
- 620 tests, 70 files, ALL FIXTURE-level (fake in-memory MongoDB) except
  one pre-CR-006 migration-validation test. This is a deliberate project
  convention, not a gap — `vitest.config.ts`'s own header states fidelity
  is measured by baseline diffing, not coverage percentage, and no
  coverage threshold is configured anywhere.
- **Zero tests import or exercise a `page.tsx` or `route.ts` module
  directly** — every test today covers the repository/service/schema/
  guard layer, one level down from the actual admin surface. 63 admin
  pages and 59 route handlers across Phases 2–9 have no direct coverage.
- Playwright infrastructure exists (`playwright.config.ts` — Laravel
  screenshot-parity for buyer pages; `playwright.herbs.config.ts` — CR-003
  herbs storefront functional tests) but **no spec anywhere touches the
  admin CMS** built in Phases 2–9 — not login, not RBAC, not a single
  admin CRUD flow.
- No CI pipeline exists (`.github/workflows` absent) — tests run locally
  only, on demand.

## 1. What this phase actually covers, precisely separated

| Item | Classification | Action this phase |
|---|---|---|
| Repository/service/schema FIXTURE coverage | Already strong (620 tests) | Untouched — not re-litigated, not expanded for its own sake. |
| `src/middleware.ts` (the redirect-serving gate, Phase 8) | Zero direct coverage | New: FIXTURE-level unit tests exercising the exported `middleware` function directly (not just the redirect-lookup logic it calls, which `redirectRepository.test.ts` already covers). |
| `src/app/api/redirects/route.ts` (Phase 8, called BY middleware) | Zero direct coverage | New: unit test for the `GET` handler, including its fail-open behavior on a DB error. |
| A handful of named admin mutation routes with real security/data-integrity weight and zero direct coverage | Zero direct coverage | New: targeted tests — NOT blanket coverage of all 59 route handlers (see §4 for the explicit "not doing" list and why). |
| Admin CMS end-to-end flows (login → RBAC → CRUD) across Phases 2–9 | Zero e2e coverage at all | New: a small Playwright suite, new config/testDir, mirroring the herbs-e2e precedent exactly. |
| A coverage-percentage target | Not requested by any doc; contradicts `vitest.config.ts`'s own stated philosophy | **Explicitly not done** — named here so it isn't assumed forgotten. |
| Real-database integration tests (replacing the FIXTURE convention) | Would be a scope change to an established project-wide convention, not a continuation | **Explicitly not done**, except where Playwright's own e2e tests necessarily run against a real dev server/database (a different, already-precedented category — herbs-e2e already does this). |

## 2. Design

### 2.1 Unit-level gap-filling — which files, and why these specifically

Not all 59 untested route handlers are in scope — that would be a much
larger, less targeted effort than "testing/hardening" implies, and most
of them (e.g. `save-homeopathy`, `update-category`) are already
indirectly exercised through their repository's own FIXTURE tests plus
8 phases of "full suite re-run, zero regressions" gates. The files
selected below are the ones where either (a) the file itself contains
real logic beyond "parse form, call repository" (middleware's caching
and matcher behavior; the redirects API route's fail-open contract), or
(b) Phase 9's own experience showed that logic living outside a
repository class is exactly where a real, previously-invisible bug hid
(the bypass-method gap, `GATE-REPORT-CR006-PHASE-9.md` §1.3):

1. **`src/middleware.ts`** — the ONE file in this entire codebase that
   runs on every public page request. Tested today only indirectly
   (`redirectRepository.test.ts` covers the lookup; nothing calls the
   exported `middleware` function itself). New tests: a request matching
   a cached redirect rule returns the correct 301/302 + `Location`; a
   non-matching request passes through; the 60s in-memory cache is
   actually respected (a second call within the TTL doesn't re-fetch);
   `/admin/*` and `/api/*` paths are correctly excluded by the matcher
   config itself (a config-shape test, not just a runtime behavior test).
2. **`src/app/api/redirects/route.ts`** — new test: returns the real
   rule set when the DB is reachable; returns `{ rules: [] }` (not a 500)
   when the DB throws, since `middleware.ts`'s own fail-open guarantee
   depends on this endpoint never erroring.
3. **A small, named set of admin mutation routes** — one representative
   handler per phase's write pattern, not every handler:
   `update-review/.../route.ts` (Phase 7's positional-array-update
   pattern), `update-admin-user-role/route.ts` (Phase 9's RBAC-adjacent
   write, the newest and least-exercised code path in the whole CR).
   Both are small (≤55 lines) and self-contained enough to test with the
   same FIXTURE-`Db` pattern already used everywhere else — not a new
   testing technique.

### 2.2 Playwright — new admin suite, same shape as herbs-e2e

New `playwright.admin.config.ts` (a THIRD config, not a project added to
an existing one) — same reasoning `playwright.herbs.config.ts`'s own
header already gives for why herbs got its own file rather than joining
the parity suite: the admin CMS is functional/interaction testing, a
fundamentally different category from screenshot-parity diffing, and
must not risk being accidentally run alongside it.

**Authentication, without a real password:** the session cookie
(`src/lib/auth/session.ts`) is a self-signed HMAC value — no server-side
session store to seed. A new test-only helper constructs a valid,
correctly-signed cookie directly (reusing `SESSION_SECRET` from the same
`.env.local` the dev server already reads) for the one real admin
account confirmed present in the dev database this phase
(`legacyId: 1`, implicit `SUPER_ADMIN`) and sets it via Playwright's
`context.addCookies()` before each admin test — skipping the login FORM
submission (which would need a real password this phase doesn't have
and shouldn't need), while still exercising the REAL
`requireAdminSession()`/`requirePermissionForSession()` guard chain on
every subsequent request, since the cookie itself is indistinguishable
from one the real login flow would have produced.

**Flows covered** (one representative round-trip per phase, not
exhaustive CRUD coverage of every admin screen):
- Unauthenticated access to an admin route redirects to `/admin/login`
  (no cookie set — the negative case).
- Authenticated access to `/admin/home` succeeds (the positive case,
  proves the cookie-injection technique itself works).
- One CRUD round-trip: create a redirect via `/admin/add-redirect`,
  confirm it appears on `/admin/redirects-list`, confirm the audit log
  (`/admin/audit-log`) shows the resulting entry, then delete it —
  deliberately chosen because it's the one flow that touches Phase 8
  (redirects), Phase 9 (audit log), and the RBAC guard chain (Phase 2/9)
  all in one pass, rather than adding three separate shallow tests.
- One read-only screen per remaining phase group, confirming each
  actually renders without error when authenticated: `/admin/order-list`
  (Phase 3), `/admin/homeopathy-list` (Phase 4), `/admin/wellness-categories`
  (Phase 6), `/admin/pages-list` (Phase 7), `/admin/media-library`
  (Phase 8), `/admin/admin-users-list` (Phase 9).

**Not covered**, named explicitly: full CRUD (create AND edit AND
delete) for every admin module — the redirects round-trip above is the
one deep flow; everything else is a shallow "does it render, does auth
gate it" check. A deeper suite is a reasonable future investment, not
this phase's job per the owner-approved scope (a "small suite," not
exhaustive e2e coverage).

## 3. Files to create/modify (if the above design is approved as-is)

| File | Change |
|---|---|
| `tests/mongodb/middleware.test.ts` (new) | FIXTURE-level tests for `src/middleware.ts` per §2.1.1. |
| `tests/mongodb/redirectsApiRoute.test.ts` (new) | Tests for `src/app/api/redirects/route.ts` per §2.1.2. |
| `tests/mongodb/updateReviewRoute.test.ts` (new) | Test for the Phase 7 review-status route handler. |
| `tests/mongodb/updateAdminUserRoleRoute.test.ts` (new) | Test for the Phase 9 role-assignment route handler. |
| `playwright.admin.config.ts` (new) | Third Playwright config, per §2.2. |
| `tests/admin-e2e/auth.ts` (new) | Test-only signed-cookie helper (reused by every admin e2e spec). |
| `tests/admin-e2e/rbac.spec.ts` (new) | Unauthenticated-redirect + authenticated-success cases. |
| `tests/admin-e2e/redirects-crud.spec.ts` (new) | The one deep create→list→audit-log→delete round-trip. |
| `tests/admin-e2e/smoke.spec.ts` (new) | The 6 read-only "does it render" checks, one per remaining phase. |
| `package.json` | New scripts: `test:e2e:admin`, `test:e2e:admin:ui` (mirrors `test:e2e:herbs`/`test:e2e:herbs:ui` exactly). |

## 4. What Phase 10 delivers vs. explicitly does not

**Delivers:**
- Direct test coverage for the two files with the most real logic
  outside a repository class (`middleware.ts`, the redirects API route)
  and two representative admin mutation routes.
- The FIRST end-to-end browser-level test of the admin CMS's
  authentication/RBAC chain, and the first e2e proof that a full
  create→read→audit-log→delete cycle actually works through a real
  browser against a real dev server/database — not just FIXTURE-level
  unit tests asserting the same behavior in isolation.
- A reusable pattern (signed-cookie injection) any FUTURE phase or CR
  can extend for its own admin e2e coverage, without needing real
  admin credentials.

**Does NOT deliver:**
- Blanket unit-test coverage of all 63 pages / 59 routes — an explicit,
  reasoned scope boundary (§2.1), not an oversight.
- A coverage-percentage target or tooling change to `vitest.config.ts`.
- Full CRUD e2e coverage of every admin module — one deep flow, six
  shallow smoke checks, named explicitly (§2.2).
- Any CI pipeline — no `.github/workflows` is added; out of scope,
  never named by any CR-006 doc.
- Resolution of the still-open "does this project have a git repo or
  not" contradiction Phase 8/9 flagged — unrelated to testing, not
  addressed here.

## 5. Risks

| Risk | Mitigation |
|---|---|
| Signed-cookie injection could be misread as a security weakening if reused outside tests | The helper lives under `tests/admin-e2e/` only, imports nothing from `src/app/`, and is never referenced by application code — same isolation every other test-only fixture in this codebase already has. |
| Playwright admin tests running against the real dev database could leave test data behind if a test fails mid-run | The redirects CRUD spec cleans up in an `afterEach` (delete-by-id), not only on the happy path — same discipline the manual smoke-test scripts used in Phases 8/9 already followed. |
| A new Playwright config accidentally running alongside the parity or herbs suites | Separate `testDir`, separate `outputDir`, separate npm script — exact structural isolation `playwright.herbs.config.ts` already established as this project's pattern for exactly this concern. |

## 6. Decisions needed before implementation

1. **Confirm the specific file list in §2.1/§3** — or name different
   files if a different subset seems higher-value.
2. **Confirm the signed-cookie e2e-auth approach** (§2.2) — the
   alternative (asking for real admin credentials to submit the login
   form) was ruled out as unnecessary and unwise to request, but flagging
   the alternative existed in case a real-login-flow test is specifically
   wanted for its own sake (e.g. to catch a regression in the login form
   itself, which cookie-injection would never exercise).
3. **Confirm the "6 shallow smoke checks + 1 deep flow" e2e scope**
   (§2.2) — not exhaustive per-module CRUD, as agreed ("a small suite").

---

**Awaiting explicit "Proceed with Phase 10" (and answers to §6) before
any file listed in §3 is created or modified. This is the last plan
document in CR-006's approved phase order.**
