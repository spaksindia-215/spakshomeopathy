# CR-006 Phase 9 — Implementation Plan: Audit Log + Admin Users/Roles

**Status:** ✅ IMPLEMENTED — see `GATE-REPORT-CR006-PHASE-9.md` for the
final, as-built record, including two significant corrections made
during implementation: (1) the original `AsyncLocalStorage`-in-
`requireAdminSession()` design for actor attribution did not actually
work (verified before writing any code) and was replaced with a
wrap-the-route-handler-body pattern; (2) end-to-end testing found that
~9 existing repositories' custom write methods bypass the base class's
instrumented methods entirely, so "centralized logging" initially missed
roughly a dozen real write paths — closed by exposing a protected
`logMutation()` any repository can call directly. Both are explained in
full in the gate report.
**Depends on:** `GATE-REPORT-CR006-PHASE-8.md` (Phase 8 complete).
**Scope confirmed by owner decision (2026-09-16):** (1) covers BOTH the
audit log AND the admin-users/roles-assignment UI — `rbac-guard.ts`'s own
header names both as Phase 9's job, not audit logging alone; (2) audit
logging is CENTRALIZED in the shared base repository
(`ValidatedRepository`), not threaded as an explicit parameter through
every one of the ~24 existing write-capable repositories' call sites.

---

## 0. Scoping check against this CR's recurring pattern — read first

Unlike most prior phases, `CR-006-ANALYSIS-PHASE1.md`'s "fully new" call
for the audit log itself is CORRECT, confirmed by direct inspection: no
`spatie/activitylog`-style package in `composer.json`/`composer.lock`,
no log/audit/history-shaped table anywhere in the 34-table legacy
schema, zero logging calls in any of the 7 live Laravel controllers.

**What Phase 1 didn't (and couldn't) anticipate:** Phase 2's own RBAC
mechanism, built 7 phases before this one, already deferred a SECOND
piece of work to "Phase 9" in its own comments — not just the audit log.
`src/lib/auth/rbac-guard.ts`'s header states: *"When Phase 9 introduces a
real roles collection, [`resolveRole()`] is the single function that
changes."* `src/lib/auth/permissions.ts`'s header: *"no mechanism to
assign a role to [a second admin], exists yet (that is Phase 9, 'Admin
Users / Roles & Permissions', per the approved phase order)."* Both
files were written with this exact moment in mind. Confirmed this
phase: `userSchema` (`src/lib/mongodb/schemas/user.ts`) has NO `role`
field today, and exactly one admin account exists in the migrated data
(818 of 819 users are `utype=3`/buyer) — there is no existing "create
admin" flow anywhere to reuse.

**The decisive structural finding for the audit log itself:** every
write-capable repository built across Phases 2–8 (24 classes, confirmed
by `grep`) extends one shared class, `ValidatedRepository`
(`src/lib/mongodb/repositories/base.ts`), and every write funnels
through exactly four methods: `insertOne`, `updateOne`, `deleteOne`,
`upsertByLegacyId`. This makes centralized logging genuinely feasible —
instrumenting those four methods once captures every admin write path
built so far (homeopathy, categories, herbs, wellness categories, pages,
redirects, blogs, posts, sliders, pin codes, appointments, orders, etc.)
without editing ~20+ individual route handlers' business logic.

## 1. What this phase actually covers, precisely separated

| Item | Classification | Action this phase |
|---|---|---|
| Audit log collection + write path | Genuinely new | New: `auditLog` collection, written automatically by `ValidatedRepository`'s base methods (§2.1). |
| Audit log admin UI (view/filter) | Genuinely new | New: `/admin/audit-log`, gated by the already-existing `AUDIT_LOG_VIEW` permission. |
| `role` field on `users` | Genuinely new — no such field exists | New: additive, optional field on the governed `userSchema` (D-11-style justification, §2.2). |
| Admin-user create/list/role-assignment UI | Genuinely new — no "create admin" flow exists anywhere | New: `/admin/admin-users-list`, `/admin/add-admin-user`, role-assignment on edit. |
| `resolveRole()` (`rbac-guard.ts`) | Hardcoded placeholder, explicitly named by its own header as this phase's job | Changed: looks up the real stored role instead of always returning `SUPER_ADMIN`. |
| Every existing `requirePermission()` call site (all of Phases 3–8's admin routes) | Already correctly wired to permission constants | **Untouched** — per `rbac-guard.ts`'s own design, `resolveRole()` is "the single function that changes"; no other file needs to change for roles to become real. |

## 2. Design

### 2.1 Audit log — new collection, centralized write path

New collection `auditLog` (own module tree, `src/lib/audit/`, same
"no Laravel table to trace to, kept separate from the governed
`src/lib/mongodb/schemas/`" precedent Phases 6–8 established):

```
auditLogEntrySchema = z.object({
  id: z.string().min(1),
  actorUserId: z.number().int().nullable(),   // session.userId, or null if unavailable
  actorEmail: z.string().nullable(),
  action: z.enum(['insert', 'update', 'delete', 'upsertByLegacyId']),
  collectionName: z.string().min(1),           // which Mongo collection was written
  targetId: z.string().nullable(),             // legacyId/id/slug of the affected document, as a string
  changedFields: z.array(z.string()).optional(), // top-level keys present in an update's $set, when known
  timestamp: z.string(),
})
```

- **Actor identity, without threading a parameter through every
  repository METHOD SIGNATURE:** a request-scoped "current admin"
  context (Node's `AsyncLocalStorage`). `base.ts`'s
  `insertOne`/`updateOne`/`deleteOne`/`upsertByLegacyId` read from this
  context when writing a log entry — no method SIGNATURE changes, so
  `RedirectRepository.upsert()`, `HomeopathyMasterRepository.
  insertHomeopathy()`, and every other repository-specific method built
  across Phases 2–8 needs NO changes at all.
- **CORRECTION MADE DURING PLANNING, BEFORE ANY CODE WAS WRITTEN:** the
  original idea — set the context once inside `requireAdminSession()`,
  before it returns — does NOT work. Verified directly:
  `AsyncLocalStorage`'s context only exists for the synchronous extent of
  its `.run(callback)` invocation (and whatever is awaited inside that
  callback); it does NOT survive past the function that called `.run()`
  returning. Since `requireAdminSession()` returns before the caller's
  later repository write happens, a context set only inside it would
  already be gone by write time — confirmed with a standalone Node
  script before proceeding.
- **Actual mechanism, owner-approved 2026-09-16:** each of the ~34
  existing route handlers that call `requireAdminSession()` gets ONE
  additional line — wrapping the REST of that handler's body in
  `runWithActor(session, async () => { ... })`. This is a small,
  mechanical, one-line addition per file (not a redesign of any
  handler's business logic), and it's still true that NO repository or
  `base.ts` method signature changes — the trade-off is real (more files
  touched than originally hoped) but the alternative (an explicit actor
  parameter threaded through every repository call) touches even more
  call sites for less benefit.
- **Failure mode:** a logging write that fails (e.g. transient DB error)
  is caught and swallowed, never allowed to fail the underlying business
  write it's describing — an audit-log outage must not become a
  site-wide admin-write outage. Logged to console only.
- **What's NOT captured:** the specific before/after VALUES of a changed
  field (only which top-level keys were present in an `update`'s `$set`
  payload) — capturing full value diffs would mean serializing arbitrary
  document content into the log, a larger design decision (storage
  growth, PII exposure risk) not raised or authorized here. Named
  explicitly as a limitation (§6), not silently reduced scope.
- **Admin UI:** `/admin/audit-log` — a read-only, paginated, filterable
  (by collection, by actor) list. No edit/delete UI for the log itself
  (an audit log admins can edit isn't an audit log).

### 2.2 `role` field on `users` — additive, D-11-style justification

Add ONE new, additive, optional field to the EXISTING `userSchema`:

```
role: z.enum(['SUPER_ADMIN', 'ADMIN', 'CATALOG_MANAGER', 'CONTENT_MANAGER', 'ORDER_MANAGER']).optional()
```

- **Why additive, not a new collection:** the original request's own
  five roles (`permissions.ts`) are a closed, small set naturally
  attached to the account that holds them — same "always read together"
  criterion Phase 5 used to justify `diseaseCategoryIds` living on
  `products` rather than a join collection. A `role` is inherently a
  property of a user, not an independent entity with its own lifecycle.
- **Why optional:** every EXISTING user document (818 buyers, 1 admin)
  predates this field; `.optional()` means none of them fail validation
  on read — same "don't tighten validation beyond what's populated"
  convention as every prior additive field in this CR.
- **The one real admin account:** `resolveRole()` (§2.3) falls back to
  `SUPER_ADMIN` when `role` is absent AND `utype === 1` — so the
  existing single admin account keeps working exactly as it does today
  (implicit `SUPER_ADMIN`) without requiring a backfill write to set its
  `role` field explicitly. A NEW admin account created through this
  phase's UI, by contrast, always has `role` set explicitly at creation.

### 2.3 `resolveRole()` — the one function `rbac-guard.ts` named

```
export function resolveRole(session: SessionPayload, user: User | null): Role | null {
  if (session.utype !== ADMIN_UTYPE) return null;
  if (user?.role) return user.role as Role;
  return ROLES.SUPER_ADMIN; // pre-Phase-9 admin account, or a fetch failure — fail toward the
                              // permissive default that already describes today's one real admin,
                              // not toward a silent lockout.
}
```

`requirePermission()`/`can()` (unchanged signatures otherwise) now need
the `User` document, not just the session — every existing call site
already has `db`/`getDb()` in scope (they're all Server Components or
route handlers with a Mongo connection already open), so this is a
small, mechanical change per call site, not a redesign. Actually
touching all of Phases 3–8's `requirePermission()` call sites to pass
the extra argument IS in scope for this phase (unlike the audit log,
this one genuinely can't be avoided — a role lookup needs the user
document) — see §3 for the honest file-count.

### 2.4 Admin-user management UI

- `/admin/admin-users-list` — lists every `users` document with
  `utype === 1` (today: exactly 1), showing name/email/role.
- `/admin/add-admin-user` — creates a NEW `users` document with
  `utype: 1` and an explicitly-chosen `role`, reusing the EXISTING
  `hashPassword` utility (`src/lib/auth/password.ts`) for the password
  field — no new hashing logic.
- Role assignment on an existing admin user — a simple `role` dropdown
  update via the existing `UserRepository`'s generic update capability
  (no new repository method needed beyond what `updateProfileByLegacyId`
  or an equivalent narrow method already provides).
- Gated by `PERMISSIONS.USERS_MANAGE`/`ROLES_MANAGE` (already defined,
  unused until now).

## 3. Files to create/modify (if the above design is approved as-is)

| File | Change |
|---|---|
| `src/lib/audit/schema.ts` (new) | `auditLogEntrySchema` per §2.1. |
| `src/lib/audit/repository.ts` (new) | `AuditLogRepository` — `findAll` (paginated, filterable), `insertEntry`. |
| `src/lib/audit/context.ts` (new) | `AsyncLocalStorage`-based "current admin" context — `runWithActor()`, `getCurrentActor()`. |
| `src/lib/mongodb/repositories/base.ts` | `insertOne`/`updateOne`/`deleteOne`/`upsertByLegacyId` each gain a call to a new, private `logMutation()` helper that reads the actor context and writes an `auditLog` entry. No method SIGNATURE changes. |
| Every existing route handler that calls `requireAdminSession()` (~34 files, per direct count) | Mechanical: wrap the handler's post-auth body in `runWithActor(session, async () => { ... })` — see §2.1's correction. No business logic inside any handler changes. |
| `src/app/admin/(shell)/audit-log/page.tsx` (new) | Read-only, paginated, filterable admin UI. |
| `src/lib/mongodb/schemas/user.ts` | ADD `role: z.enum([...]).optional()` per §2.2. No other field touched. |
| `src/lib/auth/rbac-guard.ts` (`resolveRole`/`requirePermission`/`can`) | Signature change per §2.3 — now takes the `User` document, not just the session. |
| Every existing `requirePermission()` call site (Phases 3–8's admin pages/routes — estimated ~20+ files) | Mechanical update: fetch the `User` document (most already have `db`/`getDb()` in scope) and pass it to `requirePermission()`. |
| `src/app/admin/(shell)/admin-users-list/page.tsx`, `add-admin-user/page.tsx` + form (new) | Admin-user management UI per §2.4. |
| `src/app/admin/save-admin-user/route.ts`, `update-admin-user-role/route.ts` (new) | Write handlers, same POST/GET-route convention as every prior phase. |
| `src/components/admin/AdminSidebar.tsx` | Add "Audit Log" and "Admin Users" links. |

## 4. What Phase 9 delivers vs. explicitly does not

**Delivers:**
- An automatic, centralized audit trail for every admin write built
  across Phases 2–8, requiring no changes to those phases' own business
  logic.
- A real roles system: a second admin account can be created, assigned
  one of the 5 existing roles, and have that role actually enforced
  (not just checked against a hardcoded `SUPER_ADMIN` default).
- Admin UI to view the audit log and manage admin users.

**Does NOT deliver:**
- Before/after VALUE diffs in the audit log (§2.1) — only actor,
  action, collection, target id, and (for updates) which fields changed.
- Any audit trail for non-repository actions (e.g. a login attempt
  itself, a permission check that was DENIED) — scoped to WRITES only,
  matching `permissions.ts`'s own "no audit trail of permission checks
  exists" framing from Phase 2's gate report.
- Password reset / account recovery for admin users — out of scope,
  no such flow exists for buyers either (P-level parity, not a new gap).
- Deleting/deactivating an admin account — create + role-assign only,
  per the narrowest slice that makes the roles system real.

## 5. Risks

| Risk | Mitigation |
|---|---|
| `AsyncLocalStorage`-based actor context is new territory — a bug here silently mis-attributes or drops log entries | Fails toward "no actor recorded" (nullable fields), never toward blocking the underlying write; covered by dedicated tests (§6). |
| Updating ~20+ existing `requirePermission()` call sites for the signature change touches a large, already-shipped surface area | Purely mechanical (fetch `User`, pass it in) — no business logic in any of those files changes; full test suite re-run after, not just the new tests. |
| A logging failure blocking a real admin write | Explicitly caught and swallowed (§2.1) — verified by a dedicated test that a write still succeeds when the log write throws. |
| Granting `role` write access broadens who can grant themselves more permissions | Only `USERS_MANAGE`/`ROLES_MANAGE` (currently `SUPER_ADMIN`-only, since no other role is assignable until this phase ships) can reach the admin-user screens — same trust model this codebase already places in every other admin screen. |

## 6. Testing

- `auditLogEntrySchema`: valid/invalid action enum, optional
  `changedFields`.
- `AuditLogRepository`: fixture tests (`insertEntry`, `findAll` with
  filters) — same pattern as every prior phase's new repository.
- Base repository logging: a fixture test confirming `insertOne`/
  `updateOne`/`deleteOne` write both the target document AND an audit
  entry; a second test confirming the underlying write still succeeds
  even when the audit write throws (§2.1's fail-open behavior).
- `resolveRole()`: pre-Phase-9 admin (no `role` field) still resolves to
  `SUPER_ADMIN`; a new admin with an explicit `role` resolves to that
  role; a non-admin `utype` resolves to `null`.
- Full existing suite (599 tests as of Phase 8) re-run to confirm zero
  regression from the `requirePermission()` signature change across
  every prior phase's call sites.

## 7. Decisions needed before implementation

1. **Confirm the `auditLog` and `role`-on-`users` schema designs** (§2.1/
   §2.2) — or propose alternatives.
2. **`requirePermission()` signature change, confirmed necessary but
   worth flagging its size:** this is the one place this phase touches
   many existing files (~20+, mechanically). Acceptable as scoped, or
   should call sites be updated incrementally across a follow-up slice
   instead of all at once in this phase?
3. **Audit log retention/pruning:** no limit is proposed this phase (the
   collection grows unbounded). Acceptable for now, or should a retention
   policy (e.g. keep N days) be designed here too?

---

**Awaiting explicit "Proceed with Phase 9" (and answers to §7) before any
file listed in §3 is created or modified.**
