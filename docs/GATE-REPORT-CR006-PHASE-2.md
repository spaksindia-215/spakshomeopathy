# GATE REPORT — CR-006 Phase 2 (Auth/RBAC Shell)

**Status:** ✅ COMPLETE — implemented exactly per `docs/CR-006-PHASE-2-PLAN.md`,
under explicit owner approval dated 2026-09-12 ("Proceed with Phase 2 exactly
according to `docs/CR-006-PHASE-2-PLAN.md`").
**Scope actually implemented:** New, additive RBAC permission layer only.
No later phase's functionality was touched.
**Next step:** Awaiting separate, explicit approval before Phase 3 (Orders).
Nothing beyond Phase 2 has been started.

---

## 1. What changed

A hardcoded, in-code RBAC permission layer was added on top of the
existing, unmodified admin authentication:

- **`src/lib/auth/permissions.ts`** (new) — the permission vocabulary
  (`PERMISSIONS`, 27 entries across catalog/sales/herbs/content/media-SEO-redirects/system
  groups) and the five roles (`SUPER_ADMIN`, `ADMIN`, `CATALOG_MANAGER`,
  `CONTENT_MANAGER`, `ORDER_MANAGER`) with a hardcoded role→permission map.
  Exports `hasPermission()` and `getPermissionsForRole()`.
- **`src/lib/auth/rbac-guard.ts`** (new) — `resolveRole()` (maps a
  session's `utype===1` to `SUPER_ADMIN`; anything else to `null`),
  `requirePermission()` (redirects to `/admin/login` if the role can't be
  resolved or lacks the permission — composes with, does not replace,
  `requireAdminSession()`), and `can()` (non-redirecting boolean check for
  conditional UI, not a substitute for server-side enforcement).
- **`docs/CR-006-PHASE-2-RBAC-DESIGN.md`** (new) — the design record the
  plan called for: full permission list, role table, and an explicit
  statement of what's hardcoded now vs. deferred to Phase 9's
  database-backed model.
- **`tests/lib/permissions.test.ts`** (new) — 6 tests covering role grants
  (Super Admin/Admin get everything; Catalog/Content/Order managers are
  correctly scoped) and map/function consistency.
- **`tests/auth/rbac-guard.test.ts`** (new) — 6 tests covering role
  resolution, the non-redirecting `can()` check, and `requirePermission()`'s
  allow/redirect behavior, using the same `next/navigation` mocking pattern
  as the existing `tests/auth/guard.test.ts`.

**No existing file was modified.** Confirmed by file-modification-time
check against session start (§5) — `session.ts`, `guard.ts`,
`authService.ts`, `(shell)/layout.tsx`, `AdminHeader.tsx`,
`PublicHeader.tsx`, `PublicFooter.tsx`, and every currently-ported admin
route all have mtimes predating this session.

**No currently-ported admin route calls `requirePermission()` or
`can()`.** Confirmed by grep: outside the two new test files, nothing in
`src/` imports `rbac-guard.ts` or `permissions.ts`. The mechanism exists
and is tested in isolation but is not wired into any route — exactly as
planned (wiring a module's routes to a specific permission is that
module's own later, separately-approved phase).

## 2. What was tested

| Check | Result |
|---|---|
| `npm run typecheck` (`tsc --noEmit`) | ✅ Clean, no errors |
| `npm run lint` (`eslint .`) | ✅ 0 errors, 4 pre-existing warnings in unrelated files (`admin/login/page.tsx`, `AdminStylesheets.tsx` — Google Font warnings, present before this phase, not touched by it) |
| `npx prettier --check` on the 5 new/changed files | ✅ All pass Prettier's style |
| `npx vitest run` — targeted (`permissions.test.ts`, `rbac-guard.test.ts`, `guard.test.ts`) | ✅ 25/25 passed |
| `npx vitest run` — full suite | ✅ **524/524 passed, 57/57 test files**, including every pre-existing auth, session, order, migration, and MongoDB test — zero regressions anywhere |
| `npm run format:check` — full repo | 13 pre-existing files flagged (redesign components, homeopathy components, `PublicHeader.tsx`) — **all predate this session and are untouched by Phase 2**; not introduced by this work |

## 3. Files changed

**Created (5):**
- `src/lib/auth/permissions.ts`
- `src/lib/auth/rbac-guard.ts`
- `tests/lib/permissions.test.ts`
- `tests/auth/rbac-guard.test.ts`
- `docs/CR-006-PHASE-2-RBAC-DESIGN.md`

**Modified:** none.

**Deleted:** none.

## 4. Files intentionally left untouched (per hard requirements)

- `src/lib/auth/session.ts`, `src/lib/auth/guard.ts`,
  `src/lib/services/authService.ts` — login/session/logout/`utype`
  behavior unchanged (requirement 1).
- Every currently-ported admin route (products, categories, blog, sliders,
  herbs, pincodes, enquiries, users) — untouched (requirement 8).
- `src/app/admin/(shell)/layout.tsx` — its `requireAdminSession()` call is
  unchanged; the plan's optional prop-threading addition was judged
  unnecessary for Phase 2 (no page needs to display a role label yet) and
  was not made, per the plan's own "if unnecessary, not touched" clause.
- `src/components/admin/AdminHeader.tsx` — same reasoning; no role-badge UI
  was added, since Phase 2 has exactly one resolvable role and no route
  yet consumes permissions, so there is nothing meaningful to display.
- `src/components/layout/PublicHeader.tsx`, `PublicFooter.tsx`,
  `src/components/admin/AdminSidebar.tsx` — untouched, per CR-001 §24.5's
  standing restriction (requirement 7).
- Any Orders, Catalog, Diseases, Herbs, Content CMS, or Settings file
  (requirement 8) — none exist for CR-006 yet; none were created.
- `product_variations` — not read, queried, referenced, or wired anywhere
  in this phase (requirement 9).
- No new database collection, index, or migration (requirement 3).
- No new route or API handler (`route.ts`, `page.tsx` for a new admin
  path) (requirement 4).
- No Admin Users/Roles CRUD UI, and no UI implying roles can be persisted
  or assigned beyond the single implicit Super Admin mapping (requirement 5).
- No dependency added or version changed — `package.json`/`package-lock.json`
  untouched (requirement 10).

## 5. Verification of "no unintended changes"

File-modification-time check, run after implementation, comparing every
protected/adjacent file's mtime against session start:

```
session.ts, guard.ts, authService.ts, (shell)/layout.tsx, AdminHeader.tsx,
PublicHeader.tsx, PublicFooter.tsx  →  all predate this session (unmodified)
```

Grep confirmed zero production (`src/`) call sites import `rbac-guard.ts`
or `permissions.ts` outside the two new test files. `git`/version control
is not initialized in this repository (confirmed at session start —
`"Is a git repository: false"`), so this mtime + grep + full-suite-pass
combination is the available substitute for a diff review; no working-tree
diff tool could be used.

## 6. Limitations / things Phase 2 explicitly does not provide

Restated from the plan, now confirmed as the actual shipped state:

- Only the one real existing admin account can be authorized at all —
  it resolves to `SUPER_ADMIN` implicitly and automatically. There is no
  way to create a second admin, and no way to assign `ADMIN`,
  `CATALOG_MANAGER`, `CONTENT_MANAGER`, or `ORDER_MANAGER` to anyone —
  those roles are defined in code but dormant until Phase 9. This is a
  known, intentional Phase 2 limitation, not an oversight.
- The permission mechanism is not enforced anywhere yet — it has no effect
  on any existing or future request until a later phase's route explicitly
  calls `requirePermission()`.
- No audit trail of permission checks exists (Phase 9).
- If a future phase's implementation reveals a need for database
  persistence (e.g. an actual `admin_users` collection), a new route, or
  any change outside this additive-only layer, that must be raised as its
  own plan/approval step — this phase does not attempt to anticipate or
  pre-build for that.

---

**Awaiting explicit approval before Phase 3 (Orders: list/detail/ship/cancel/
seller-orders/payments/appointments). No Phase 3 work has begun.**
