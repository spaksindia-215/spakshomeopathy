# OWNER AUTHORIZATION RECONCILIATION

**Type:** Append-only durable authorization record + read-only M4 audit +
DR-04 discrepancy report. No migration run, no production MongoDB change, no
Laravel modification, no API route created, no UI built, no route guard
added, no data-model change, no other owner decision touched.
**Date:** 2026-08-22
**Prepared following:** `docs/GATE-REPORT-STATE-RECONCILIATION.md` (2026-08-22),
which found DR-01's and M4-AUTH's owner-authorization claims to be
REPORTED-BUT-NOT-VERIFIED against this project's own established sign-off
standard.

**Legend:** **VERIFIED** (directly inspected this session or a prior
session's evidence re-confirmed) · **OWNER-APPROVED-NOW** (a new, durable
authorization the owner is giving in this exchange, recorded here for the
first time in the project's standard sign-off format) · **REPORTED**
(stated in a prior document; not independently re-verified line-by-line this
session, but not contradicted either) · **REQUIRES-FOLLOW-UP** (an open
item that needs a further owner decision or further implementation work
before it can be closed).

---

## 1. DURABLE OWNER AUTHORIZATION RECORD (OWNER-APPROVED-NOW)

Recorded in the project's established sign-off format (the genuine
`**Owner:** <name> **Date:**` pattern used in `GATE-REPORT-M0.md`, not the
unchecked-box or narrative-only patterns used elsewhere).

### 1.1 — DR-01: Orders / OrderProducts / Payments shape

> **Owner:** Muskan
> **Decision:** APPROVED
> **Scope:** DR-01 Option B — `orders`, `orderProducts`, and `payments`
> remain THREE SEPARATE MongoDB collections, joined at the application
> level (by `groupId`/`gid`), exactly matching the existing Laravel table
> structure. This is now the confirmed, durable MongoDB architecture for
> the orders group. **Do not change it to an embedded (Option A) model.**
> **Date:** 2026-08-22

This has also been appended, verbatim in substance, to
`docs/M3-OWNER-DECISION-RECORDS.md` (its own designated home for DR-series
decisions) as an append-only addendum dated 2026-08-22, immediately
following the 2026-08-21 addendum that `GATE-REPORT-STATE-RECONCILIATION.md`
flagged. Nothing in either document was deleted or rewritten — this is an
additional, independent confirmation layered on top of the existing record,
not a replacement for it.

### 1.2 — M4 Authentication: continuation authorized

> **Owner:** Muskan
> **Decision:** APPROVED
> **Scope:** M4 authentication implementation is authorized to continue.
> The existing authentication code (`src/lib/auth/`, login/register/logout
> routes, `authService.ts`, and their tests) may be **retained and
> audited**, not recreated from scratch. **M4 is explicitly NOT considered
> complete merely because this authentication code exists** — completion
> additionally requires proper route/page protection (middleware or
> equivalent) using the project's agreed architecture, not yet built (see
> §2.2/§2.4 below).
> **Date:** 2026-08-22

This has also been appended, verbatim in substance, to
`docs/GATE-REPORT-M4-AUTH.md` as an append-only addendum dated 2026-08-22,
following its original 2026-08-21 content. The original content is
unaltered.

**Explicitly not claimed by either record above:** that an earlier,
undocumented owner authorization existed prior to today. Both are recorded
as new, explicit authorizations given in this exchange — `2026-08-22` is the
authorization date, not a backdated correction. The 2026-08-21 documents'
own narrative claims remain exactly as originally written, for audit-trail
purposes, and are neither confirmed nor retracted by this record beyond
what is stated above.

---

## 2. M4 AUTHENTICATION — CURRENT-STATE AUDIT

Re-confirmed by direct file inspection this session (not by re-reading the
prior audit's conclusions alone).

### A. What is already implemented (VERIFIED)

| Component | File(s) | Status |
|---|---|---|
| Password hashing | `src/lib/auth/password.ts` | bcrypt via `bcryptjs`, 10 rounds, matches Laravel's `bcrypt()`/`Auth::attempt()`. Cross-checked in tests against a real PHP-produced hash. |
| Session mechanism | `src/lib/auth/session.ts` | Self-contained HMAC-SHA256-signed cookie (`spaks_session`), `timingSafeEqual` comparison, expiry check against `SESSION_LIFETIME_MINUTES`. `createSession` / `getSession` / `destroySession` all present and exported. |
| Flash messages | `src/lib/auth/flash.ts` | Unsigned, short-lived, read-once cookie mechanism (`message` / `AuthMsg` keys), mirroring Laravel's `session()->with(...)` flash pattern. Deletes itself on read. |
| Login logic | `src/lib/services/authService.ts` (`login()`) | Mirrors `Auth\LoginController@UserLogin`'s branch matrix (utype × backuser → redirect target), verified against `LoginController.php:44-67` per the original report. |
| Registration logic | `src/lib/services/authService.ts` (`registerBuyer()`) | Mirrors `Auth\RegisterController@UserRegister`'s utype=3 (buyer) branch only. `unique:users` application-level check, `bcrypt()` hash, `status: 1`. |
| Login route (public) | `src/app/user-login/route.ts` | `POST /user-login` — reads form data, calls `login()`, sets session cookie on success, flash message on failure, redirects. Read in full this session. |
| Login route (admin) | `src/app/admin/user-login/route.ts` | Same underlying `UserLogin` logic, admin-form entry point. |
| Register route | `src/app/save-user/route.ts` | `POST /save-user` — buyer (utype=3) only. |
| Logout routes | `src/app/logout/route.ts`, `src/app/admin/user-logout/route.ts` | `destroySession()` + redirect. |
| `nextLegacyId()` | `src/lib/mongodb/repositories/userRepository.ts` | New-document `legacyId` assignment strategy (live `MAX(legacyId)+1`), addressing the M4-PREP-flagged gap. |
| Tests | `tests/auth/password.test.ts` (4), `tests/auth/session.test.ts` (5), `tests/services/authService.test.ts` (12) | **21 tests, VERIFIED passing this session** (see §4, ran again as part of `npm run verify`). |
| Environment config | `.env.local` | `APP_KEY`, `SESSION_SECRET` present (key names only checked, no values read or printed). |

### B. What is missing (VERIFIED by absence)

1. **No `middleware.ts` anywhere in the project.** Confirmed again this
   session (`find … -iname middleware.ts` → no results). Next.js's
   conventional route-guard mechanism does not exist at all.
2. **No auth check in `src/app/admin/(shell)/layout.tsx`.** Read in full
   this session — it renders `AdminHeader`/`AdminSidebar`/`AdminFooter`/
   `AdminScripts` unconditionally, with no `getSession()` call, no redirect
   logic. Every one of the ~25 admin pages under `(shell)/` is reachable
   with no session, exactly as previously disclosed (N-29).
3. **No buyer-facing protected pages exist at all** — `/myaccount`,
   `/manage-orders`, `/seller/myaccount`, and the `/cart-list` redirect
   target that `user-login/route.ts` already points logged-in buyers toward
   are **not present** under `src/app/`. The login route redirects to
   destinations that do not yet exist as pages.
4. **Seller registration (utype=2/4) not built** — no multi-file upload
   (Aadhar/PAN/signature/bank statement) handling exists; `/seller-register`
   renders a page but is not wired to `save-user` or any equivalent route.
5. **`$errors` (Laravel ValidationException bag) not reproduced** —
   `user-login/route.ts`'s own comments (read this session) disclose that
   validation failures and genuine wrong-credential failures currently
   share the same `'message'` flash key, an acknowledged near-miss, not a
   byte-identical reproduction of Laravel's two separate mechanisms.
6. **Rate limiting / brute-force protection** — no throttling logic found
   in any login route file. Not verified whether the live Laravel
   controller has this active or disabled; not reproduced either way here.
7. **DR-05 (session-store mechanism) remains formally PENDING** — the
   HMAC-cookie approach in `session.ts` is explicitly disclosed (in its own
   header comment) as a stopgap "if DR-05 is later decided differently,
   this module is the single place that would change," not a DR-05
   resolution.

### C. What is required for M4 completion

Per the owner's own stated condition in §1.2 above, plus the gaps in §B:

1. **Route/page protection**, using "the project's agreed architecture" —
   this phrase itself is a **REQUIRES-FOLLOW-UP** item: no architecture for
   this has yet been agreed (Next.js `middleware.ts` at the project root is
   the conventional mechanism and would most directly mirror Laravel's
   `CheckBuyer`/`UserAuth` middleware pattern, but this audit is not
   selecting it — that is implementation work explicitly out of scope for
   this task).
2. Buyer account pages (`/myaccount`, `/manage-orders`, etc.) need to exist
   before there is anything for a route guard to protect on the buyer side.
3. Admin shell pages need the guard wired into
   `src/app/admin/(shell)/layout.tsx` (or a `middleware.ts` matcher covering
   `/admin/*` except `/admin/login`) — currently open with no code written.
4. A decision (or explicit deferral) on rate limiting, the `$errors` bag
   gap, and seller registration — each independently flagged, none
   blocking route-guard work specifically.
5. DR-05 remains open and independent of M4 completion — the HMAC-cookie
   mechanism is functionally sufficient for a route guard to check
   (`getSession()` already returns a verified payload or `null`); DR-05's
   resolution would only change *where* session state lives, not *whether*
   a guard can be built against the current mechanism today.

### D. Which files would need to change (for a future, separately-authorized slice — NOT done in this task)

| File | Nature of change |
|---|---|
| `middleware.ts` (new, project root) — or equivalent | New route-matcher-based guard calling `getSession()`, redirecting unauthenticated requests for protected paths. |
| `src/app/admin/(shell)/layout.tsx` | Would need a session check added if the guard is implemented at the layout level instead of/in addition to middleware. |
| `src/app/myaccount/page.tsx`, `src/app/manage-orders/page.tsx`, `src/app/seller/myaccount/page.tsx`, `src/app/cart-list/page.tsx` (buyer-side pages) | Do not yet exist; needed as the actual protected destinations `user-login/route.ts` already redirects to. |
| `src/lib/auth/session.ts` | No change needed for a guard to consume it — `getSession()` is already guard-ready. |
| `docs/M4-NEXTJS-ROUTE-MAPPING.md` / a new M4-slice gate report | Documentation update once route-guard work is actually authorized and built. |

**None of the above were created, modified, or scaffolded in this task**,
per the explicit boundary in this task's instructions ("Do NOT add route
guards yet").

### E. Security concerns (VERIFIED / disclosed)

1. **The core session primitive is sound**: HMAC-SHA256 signing with
   `timingSafeEqual` comparison and an expiry check — this is a correctly
   built mechanism as far as it goes (re-confirmed by direct code reading
   this session, not merely trusting the prior report).
2. **However, a valid, correctly-signed session cookie currently gates
   nothing** — since no middleware/layout check consumes `getSession()`
   anywhere yet, the practical security posture today is unchanged from
   having no auth at all for any *page-access* purpose, even though login/
   logout/session-issuance themselves work correctly. This is the single
   most important security fact for the owner to hold in mind: **the
   authentication mechanism works; the authorization/gating layer does
   not exist yet.**
3. **Admin demo-UI bypass**: all ~25 admin pages remain reachable with zero
   session, a pre-existing, previously-disclosed gap (N-29), unchanged by
   this task.
4. **No rate limiting** on login attempts — unverified against the live
   Laravel behavior, not reproduced here either way; a genuine open
   question, not an assumed-safe gap.
5. **Secrets handling**: `APP_KEY` and `SESSION_SECRET` values were not
   read, printed, or otherwise inspected in this task — only confirmed
   present by key name.
6. **No new security surface was introduced by this task** — this task
   made no code changes to `src/lib/auth/` or any route file; all findings
   above re-confirm the pre-existing state, not a new change.

### F. Contract constraints affecting this implementation

1. **F-22** (session lifetime) — `SESSION_LIFETIME_MINUTES` must continue
   to mirror Laravel's `SESSION_LIFETIME=120`; `session.ts` already
   respects this via `getCryptoConfig()`, unchanged.
2. **DR-05** (session-store mechanism) — remains PENDING; any future route
   guard work should be built against `getSession()`'s existing interface
   so it is unaffected if DR-05 is later resolved differently, per
   `session.ts`'s own disclosed design intent.
3. **NN-8 / NN-10** (no feature removal, no data loss) — a future route
   guard must not silently drop the seller (`utype=2/4`) or admin
   (`utype=1`) branches; the existing branch matrix in `authService.ts`
   already accounts for all three, so a guard should consume `utype` from
   the session rather than re-deriving access rules independently.
4. **Milestone discipline** (contract, repeatedly invoked across every
   gate report) — building the route guard itself is explicitly a
   separate, future-authorized slice, not bundled into this task.
5. **D-10 cutover/rollback strategy** — not implicated by anything in this
   task (no order/checkout/payment code touched).

---

## 3. DR-04 — INDEX NAMING DISCREPANCY (report only; no change applied)

**Re-confirmed this session as unchanged from the prior audit** — no
database write was made in this task.

| Aspect | Finding |
|---|---|
| Functional correctness | **VERIFIED, still correct.** Live index on `spaks_dev.users` has key spec `{ email: 1 }` and `unique: true`. |
| Actual MongoDB index name | **`email_1`** — MongoDB's auto-generated default name, not `users_email_unique`. |
| Required name | `users_email_unique`, per `docs/M3-OWNER-DECISION-RECORDS.md` DR-04 and `src/lib/mongodb/indexes.ts`'s own `ProposedIndex.name` field. |
| Root cause | `scripts/apply-dr04-index.ts`'s `createIndex(DR04_INDEX.spec, DR04_INDEX.options)` call passes only `{ unique: true }` as `options` — no `name:` key was included in the options object passed to the driver, so MongoDB fell back to its own default-name generation from the key spec. |
| Is this a data-integrity problem? | **No.** The index enforces the correct constraint on the correct field. This is purely a cosmetic/documentation-compliance mismatch between the index's *display name* and what the project's own naming convention requires it to be. |

### Smallest compliant correction (proposed, NOT applied)

MongoDB does not support renaming an index in place — the only mechanical
path is to drop the existing index and recreate it with an explicit `name`
option. This is a two-step, additive-in-effect operation (the constraint
itself is unchanged throughout):

```ts
// Proposed future correction — NOT executed in this task.
await db.collection('users').dropIndex('email_1');
await db.collection('users').createIndex(
  { email: 1 },
  { unique: true, name: 'users_email_unique' }
);
```

Equivalently, the smallest source change to prevent recurrence would be
adding `name: 'users_email_unique'` to the `options` object in
`src/lib/mongodb/indexes.ts`'s `proposedIndexes` entry, so that any future
`createIndex(spec, options)` call (including a corrected re-run of
`apply-dr04-index.ts`) produces the intended name automatically:

```ts
// src/lib/mongodb/indexes.ts — proposed, NOT applied in this task.
{
  name: 'users_email_unique',
  collection: COLLECTIONS.users,
  spec: { email: 1 },
  options: { unique: true, name: 'users_email_unique' }, // ← name added
  unique: true,
  ...
}
```

**Both of the above are proposals only.** Per this task's explicit
instruction ("Do NOT silently change the index yet"), **no drop, no
recreate, and no source-file edit was performed.** This is a
**REQUIRES-FOLLOW-UP** item: the owner should decide whether to (a) apply
the drop/recreate correction against `spaks_dev` at a convenient low-risk
moment, (b) accept `email_1` as the permanent name and instead update the
documentation/`indexes.ts` label to match reality, or (c) defer either
choice further. There is a brief window during any drop/recreate where the
constraint is briefly absent; on a low-traffic development database this is
low-risk, but it is a real operational detail worth the owner's explicit
sign-off before it is scheduled, not something to default into.

---

## 4. VERIFICATION SUITE RESULT

Ran `npm run verify` (`typecheck && lint && format:check && test`) after
completing the above — no code was changed by this task, so this run
re-confirms the same clean baseline already established, not a new result
produced by any edit made here.

```
typecheck    ✅ 0 errors
lint         ✅ 0 errors (4 pre-existing warnings, unrelated to auth: Google
                Font display/custom-font warnings in admin/login/page.tsx
                and AdminStylesheets.tsx)
format:check ✅ pass
test         ✅ 199 / 199 passed, 26 test files, 0 failures
```

No live MongoDB verification script was re-run in this task (not requested;
§3 above re-states the prior session's already-current finding rather than
re-querying `spaks_dev` again).

---

## 5. SUMMARY TABLE

| Item | Label |
|---|---|
| DR-01 Option B — technical implementation | VERIFIED |
| DR-01 Option B — durable owner authorization | **OWNER-APPROVED-NOW** (this record + append to `M3-OWNER-DECISION-RECORDS.md`) |
| M4 authentication code exists and passes tests | VERIFIED |
| M4 authentication — durable owner authorization to continue | **OWNER-APPROVED-NOW** (this record + append to `GATE-REPORT-M4-AUTH.md`) |
| M4 — "not complete merely because code exists" | **OWNER-APPROVED-NOW** (explicit condition recorded, not yet satisfied) |
| Route/page protection | **REQUIRES-FOLLOW-UP** — not built, not authorized to build in this task |
| Buyer account pages (`/myaccount`, etc.) | **REQUIRES-FOLLOW-UP** — do not exist |
| DR-04 functional correctness ({email:1}, unique:true) | VERIFIED |
| DR-04 index name (`users_email_unique` vs. actual `email_1`) | VERIFIED discrepancy; **REQUIRES-FOLLOW-UP** for correction decision |
| Prior 2026-08-21 verbal-authorization narratives (DR-01, M4) | REPORTED — left as originally written; neither confirmed nor retracted beyond what §1 states |
| DR-02, DR-03, DR-05, DR-06, DR-07 | Untouched by this task — remain exactly as `GATE-REPORT-STATE-RECONCILIATION.md` §7 described them |

---

*End of append-only reconciliation record. No migration was run, no
production MongoDB change was made, no Laravel file was touched, no API
route was created, no UI was built, no route guard was added, no data model
was changed, and no owner decision outside DR-01/M4-AUTH scope was altered.
Stopping here per instruction.*
