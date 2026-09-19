# GATE REPORT — CR-006 Phase 9 (Audit Log + Admin Users/Roles)

**Status:** ✅ COMPLETE, with two significant design corrections made
during implementation (both caught before or via end-to-end testing
against the real database, not left latent) and one mechanical
signature-change touching ~26 existing files across Phases 2–8.
**Next step:** Awaiting separate, explicit approval before Phase 10
(Testing — the final phase in the approved order). No Phase 10 work has
begun.

---

## 1. What changed

### 1.1 Scoping — audit log genuinely new; admin-users/roles was pre-staged

`CR-006-ANALYSIS-PHASE1.md`'s "fully new" call for the audit log was
correct, confirmed by direct inspection (no `spatie/activitylog`-style
package, no log/audit/history table among the 34 legacy tables, zero
logging calls anywhere in Laravel). What Phase 1 couldn't have
anticipated: Phase 2's own RBAC mechanism (7 phases earlier) had already
deferred a SECOND piece of work to "Phase 9" in its own code comments —
`rbac-guard.ts`'s header literally said *"When Phase 9 introduces a real
roles collection, this is the single function that changes."* Per owner
decision, this phase covers both. Full record in
`CR-006-PHASE-9-PLAN.md` §0.

### 1.2 Correction #1 — actor-context design didn't work as planned

The plan's original design: set a request-scoped "current admin" context
once inside `requireAdminSession()`, before it returns, so every
downstream repository write could read it with zero changes to any
existing route handler. **Verified false before writing any application
code**, via a standalone Node script: `AsyncLocalStorage`'s store only
exists for the synchronous extent of `.run(callback)` and whatever is
`await`ed inside that callback — it does NOT survive past the function
that called `.run()` returning. Since `requireAdminSession()` returns
before the caller's later repository write happens, a context set only
inside it would already be gone by write time.

**Resolution, per owner direction:** each of the ~34 existing route
handlers that call `requireAdminSession()` gained one additional line —
wrapping the REST of that handler's body in
`runWithActor(session, async () => { ... })`
(`src/lib/audit/context.ts`). No repository or `base.ts` method
signature changed; the trade-off is real (more files touched than
originally hoped) but every alternative touched even more call sites for
less benefit.

### 1.3 Correction #2 — centralized logging initially missed ~9 repositories' custom write methods

End-to-end testing against the real dev database (inserting a real
`redirects` document via `RedirectRepository.upsert()`) found **zero**
audit-log entries were created, despite `base.ts`'s `insertOne`/
`updateOne`/`deleteOne`/`upsertByLegacyId` all being correctly
instrumented. Root cause: `RedirectRepository.upsert()` — like roughly a
dozen other custom write methods across `pages`, `herbs` (both
`herbProductRepository` and `wellnessCategoryRepository`),
`motherTincture`, `herbs/orders`, the legacy `orderRepository`, the
legacy `productRepository`'s Phase-7 `updateReviewStatus`, and 5 methods
on `userRepository` — calls `this.collection.updateOne/insertOne/
deleteOne` **directly** (the raw MongoDB driver method), bypassing the
instrumented base-class methods entirely. Most of these exist because
the base class's `insertOne`/`updateOne` don't support upsert-by-
arbitrary-key (they assume a caller already has a document to insert or
a MongoDB-shaped filter), so every repository that needed "insert-or-
replace keyed by my own id/slug/key" wrote its own method.

**Resolution, per owner direction:** exposed `logMutation()` as a
`protected` instance method on `ValidatedRepository`
(`src/lib/mongodb/repositories/base.ts`) that any subclass's own custom
write method can call directly, right after its own direct collection
call. Applied to all ~14 identified bypass call sites across 9 files.
Re-verified end-to-end afterward: the same real-database test now
produces a real, correctly-attributed audit-log entry for both the
upsert and a subsequent delete.

**A consequence of both corrections, disclosed rather than hidden:** the
originally-planned "instrument 4 base methods, touch nothing else"
design was not achievable as scoped. The actual design still centralizes
the LOGGING LOGIC itself (one `logMutationImpl()` function, one schema,
one collection) but requires each write method — base or custom — to
call it, which is a materially larger footprint than the plan's opening
framing implied. Full list of touched files in §1.5/§1.6 below.

### 1.4 Admin users / roles — real, not implicit

`schemas/user.ts` gained one additive, optional `role` field.
`rbac-guard.ts`'s `resolveRole()` now looks up that field, falling back
to `SUPER_ADMIN` only when absent (true for the one pre-Phase-9 admin
account, so its access is unchanged). `requirePermission()`/`can()`
signatures changed to take the `User` document, not just the session — a
role lookup genuinely needs it, unlike the audit-log actor context.

### 1.5 New files (11)

- `src/lib/audit/schema.ts` — `auditLogEntrySchema`.
- `src/lib/audit/context.ts` — `AsyncLocalStorage`-based actor context
  (`runWithActor`/`getCurrentActor`), per §1.2's corrected design.
- `src/lib/audit/repository.ts` — `AuditLogRepository` (read-only from
  the admin UI's perspective; writes go through `base.ts` directly, not
  this class, to avoid a circular write).
- `src/app/admin/(shell)/audit-log/page.tsx` — read-only, filterable
  admin UI.
- `src/app/admin/(shell)/admin-users-list/page.tsx`,
  `add-admin-user/page.tsx`, `edit-admin-user/[id]/page.tsx` — admin-user
  management UI.
- `src/app/admin/save-admin-user/route.ts`,
  `update-admin-user-role/route.ts` — write handlers.
- `tests/mongodb/auditLogging.test.ts` — 8 tests covering the centralized
  logging mechanism itself (actor attribution, self-logging prevention,
  fail-open behavior, context leak-proofing).
- `tests/lib/auditLogRepository.test.ts` — 9 tests.

### 1.6 Modified files (~40)

- `src/lib/mongodb/repositories/base.ts` — `insertOne`/`updateOne`/
  `deleteOne`/`upsertByLegacyId` instrumented; new `protected
  logMutation()` method exposed for subclass use (§1.3).
- 9 repository files' custom write methods (§1.3) — each gained one
  `this.logMutation(...)` call after its own direct collection write:
  `src/lib/redirects/repository.ts`, `src/lib/pages/repository.ts`,
  `src/lib/herbs/db/herbProductRepository.ts`,
  `src/lib/herbs/db/wellnessCategoryRepository.ts`,
  `src/lib/motherTincture/db/motherTinctureProductRepository.ts`,
  `src/lib/herbs/orders/orderRepository.ts`,
  `src/lib/mongodb/repositories/orderRepository.ts`,
  `src/lib/mongodb/repositories/productRepository.ts`,
  `src/lib/mongodb/repositories/userRepository.ts` (5 call sites, plus 2
  new methods: `findAllAdmins`, `updateRoleByLegacyId`).
- `src/lib/mongodb/schemas/user.ts` — additive `role` field (§1.4).
- `src/lib/auth/rbac-guard.ts` — `resolveRole`/`requirePermission`/`can`
  signature change; new `requirePermissionForSession()` convenience
  wrapper (fetches the `User` document, then calls `requirePermission`)
  so each of the ~26 existing call sites' update is a single line instead
  of three.
- **~24 existing admin route handlers/pages** (Phases 3–8's own work —
  10 route handlers, 14 pages) — mechanically updated to call
  `requirePermissionForSession(db, session, PERMISSIONS.X)` instead of
  the old 2-arg `requirePermission`. Applied by a subagent under direct
  instruction to make ONLY this mechanical change; independently
  re-verified via `npm run typecheck` and a full diff review of the
  disk-change notifications this session received. No permission
  constant was changed in any file; no business logic was touched.
  2 stale doc-comment references (prose only, not code) were also
  corrected by hand afterward.
- `tests/mongodb/fakeDb.ts` (the shared FIXTURE test helper) and 8
  individual test files with their own local fake `Db` copies — each
  updated to route `collection('auditLog')` to a separate, unasserted
  bucket instead of the same array the test's own assertions check,
  since the new `logMutation()` calls would otherwise silently pollute
  those arrays. Found in two passes: the first when the base-class
  instrumentation alone broke 4 tests; the second, larger pass when
  §1.3's bypass-method fix surfaced the same issue in 4 more files whose
  custom `upsert`/`deleteById` methods hadn't been exercised by the
  first pass.
- `tests/auth/rbac-guard.test.ts` — rewritten for the new 2/3-arg
  signatures, with new coverage for explicit-role resolution (not just
  the old implicit-SUPER_ADMIN-only cases).
- `src/components/admin/AdminSidebar.tsx` — added "Audit Log" and "Admin
  Users" under a new "System" tree.

## 2. What was tested

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ Clean |
| `npm run lint` | ✅ 0 errors, 4 pre-existing warnings (unchanged since Phase 2) |
| `npx vitest run` — full suite | ✅ **620/620 passed, 70/70 test files** — zero regressions (up from 599/68 before this phase) |
| `npm run build` (production) | ✅ Clean; all 6 new admin-user/audit-log routes present in the build manifest; middleware still registers correctly |
| End-to-end audit-log smoke test against the real dev database (twice — once revealing the §1.3 gap, once confirming the fix) | ✅ First run: a real `RedirectRepository.upsert()` produced ZERO audit-log entries (the bug). Second run, after the fix: the same write produced a correctly-attributed entry (`action: 'update'`, `collectionName: 'redirects'`, `targetId`, `actorUserId`, `actorEmail` all correct), and a subsequent `deleteById()` produced a matching `action: 'delete'` entry. Test artifacts removed after use. |

## 3. Files changed

**Created (11):** listed in §1.5.
**Modified (~40):** listed in §1.6 (exact count not hand-tallied given
the breadth of the mechanical `requirePermission` update — every touched
file is named or grouped above).
**Deleted:** none (several throwaway verification/smoke-test scripts
were created and removed after use — not part of the shipped change
set).

## 4. What Phase 9 explicitly does NOT do

- Before/after field VALUES in the audit log — only actor, action,
  collection, target id, and (for updates) which field NAMES changed.
  Explicitly verified passwords are logged by field name only, never by
  value.
- Audit trail for non-write actions (login attempts, denied permission
  checks) — scoped to writes only, per the plan's own framing.
- Audit log retention/pruning — the collection grows unbounded; no
  policy was designed or requested this phase.
- Redirect/collision/loop detection — unrelated to this phase, unchanged
  from Phase 8.
- Admin-user delete/deactivate, or password reset for admin accounts —
  create + role-assign only, the narrowest slice that makes the roles
  system real, per the plan's own §4.
- Editing an admin user's name/email/password after creation — role
  assignment only, on the `edit-admin-user` screen.

## 5. Files intentionally left untouched

- Every one of Phases 3–8's admin business logic — the `requirePermission`
  signature update was purely mechanical (fetch `User`, pass it in); no
  file's actual read/write/validation logic changed.
- `WellnessCategoryRepository.hide()` — already routed through the base
  class's own instrumented `updateOne`, so it needed no change (confirmed
  by inspection, not assumed).
- `tests/mongodb/failureHandling.test.ts`,
  `tests/services/profileService.test.ts` — write-capable local fakes
  that turned out to already tolerate the new `logMutation` calls (one
  uses a `Map` keyed lookup unaffected by an extra array entry; the other
  has no `insertOne` at all, so the log write's error is silently
  swallowed exactly as designed) — verified by running each in isolation
  before deciding no change was needed, not assumed safe.

## 6. Limitations / known gaps carried forward

- The audit log has no UI-level pagination beyond a fixed 200-entry cap
  — acceptable at current data volume, flagged for a future phase if
  volume grows.
- No collision/loop detection was added to anything by this phase
  (carried forward from Phase 8, unrelated).
- This phase's own real-database testing found and fixed the bypass-
  method gap (§1.3), but did not exhaustively audit every write path in
  the codebase for a THIRD kind of gap (e.g. a raw `db.collection(...)`
  call made from a route handler or Server Action, entirely outside any
  repository class) — none were found during this phase's `grep`-based
  survey, but that survey was not a formal completeness proof.
- No git repository status was re-checked this phase — Phase 8's gate
  report already flagged that a real git repo exists, contradicting this
  project's stated "no git repo" convention; still unresolved as of this
  phase.

---

**Awaiting explicit approval before Phase 10 (Testing — the final phase
in the approved order). No Phase 10 work has begun.**
