# CR-006 Phase 2 — Implementation Plan: Auth/RBAC Shell

**Status:** 📋 PLAN ONLY — awaiting the explicit instruction "Proceed with
Phase 2." Nothing in this document has been implemented.
**Depends on:** `CR-006-ANALYSIS-PHASE1.md` (approved), owner approval
message of 2026-09-12 (Option A, full phased build).
**Scope:** New, additive RBAC layer only. Does **not** touch existing
login/session/utype behavior.

---

## 0. Governing constraint (read first)

The existing admin auth (`src/lib/auth/{session,guard}.ts`,
`src/lib/services/authService.ts`) is not a gap — it is a carefully,
already-verified 1:1 port of Laravel's `UserAuth` middleware, with its own
extensive fidelity documentation (dead-write analysis, disclosed gaps,
`GATE-REPORT-M4-AUTH.md`). It correctly implements the live schema's
**only** access-control signal: `users.utype` (1=admin, 2=vestigial,
3=buyer). There is no roles/permissions table in Laravel, and none is
being retrofitted into it.

**Phase 2 therefore does not modify `utype`, `session.ts`, `guard.ts`, or
`authService.ts` in any way that changes their existing behavior.** RBAC
is new, additive infrastructure that sits *on top of* the existing
`requireAdminSession()` result: today's single real admin account becomes
the implicit "Super Admin" (all permissions), and the new roles/permissions
system only matters once a second admin user is created — which itself
does not happen in Phase 2 (see §6, out of scope).

This keeps Phase 2 reversible and zero-risk to the migration: if RBAC were
deleted tomorrow, every existing admin route continues working exactly as
it does today, gated by the same `requireAdminSession()` call already in
`(shell)/layout.tsx`.

---

## 1. Files to create

| File | Purpose |
|---|---|
| `src/lib/auth/permissions.ts` | Defines the permission constant set (e.g. `products.view`, `orders.update`, …) and the built-in role→permission map (Super Admin, Admin, Catalog Manager, Content Manager, Order Manager) as an in-code table — **not** database-driven in Phase 2 (see §6). Exports `hasPermission(role, permission)`. |
| `src/lib/auth/rbac-guard.ts` | `requirePermission(session, permission)` — thin wrapper that resolves the session's role (today: always "Super Admin", since only one admin account exists) and throws/redirects on a missing permission. Composes with, does not replace, `requireAdminSession()`. |
| `docs/CR-006-PHASE-2-RBAC-DESIGN.md` | Written design record: permission list, role table, and explicit statement of what's deferred to a database-backed model (Phase 8/9) vs. what's hardcoded now. |

## 2. Files to modify

| File | Change | Why |
|---|---|---|
| `src/app/admin/(shell)/layout.tsx` | None functionally — `requireAdminSession()` call stays exactly as-is. Optionally: thread the resolved role onto a context/prop so page-level components can read it without re-deriving it. **If this turns out to be unnecessary for Phase 2's actual UI needs, this file is not touched at all.** | Avoid duplicate session reads per page if role display is needed in the header; not required for permission enforcement itself, which happens server-side per route regardless. |
| `src/components/admin/AdminHeader.tsx` | Additive only: display the admin's role label (e.g. "Super Admin") next to the existing profile info, if a place for it already exists in the ported markup. **Skipped if no such slot exists in the source Blade markup** — Phase 2 does not add new UI chrome that didn't exist in Laravel just to show a role badge. | Cosmetic, optional — confirm against real ported markup before touching. |

**Nothing else is modified.** No existing route file, no existing
component beyond the two conditional items above, no `session.ts`,
`guard.ts`, or `authService.ts` changes.

## 3. Routes

**No new user-facing routes.** Phase 2 is a library-level permission layer,
not new pages. The only "route-shaped" change is that a later phase's new
admin route (e.g. Phase 3's `/admin/order-list`) will call
`requirePermission(session, 'orders.view')` in addition to
`requireAdminSession()` — that wiring happens in Phase 3, not Phase 2.
Phase 2 itself ships the permission library unused by any route yet,
verified by its own unit tests (§9).

## 4. APIs

**None.** No new API route, no new `route.ts` file. This is pure
application-layer logic (a TypeScript module), not a network-facing
surface.

## 5. Database impact

**Zero.** No new collection, no schema change, no MongoDB write of any
kind. The role→permission map is a hardcoded TypeScript object in
`permissions.ts` for Phase 2 — explicitly *not* the "Admin Users / Roles &
Permissions" database-backed management UI the original request describes
(that UI requires an actual `roles`/`admin_users` collection, which needs
its own D-11-gated schema-design authorization — deferred to Phase 9,
named explicitly in §6 below so it isn't lost).

## 6. What Phase 2 explicitly does NOT do (deferred, named so nothing is lost)

- Does **not** create an `admin_users`, `roles`, or `permissions`
  collection — that's Phase 9 (System), and requires the D-11 follow-up
  authorization `CR-006-ANALYSIS-PHASE1.md` §8 Item 4 already flagged as
  ungranted.
- Does **not** allow creating a second admin account or assigning roles to
  one — there is exactly one admin today (`utype=1`), and this phase does
  not add a UI to manage that.
- Does **not** build the "Admin Users" or "Roles & Permissions" list/edit
  screens from the original request — those are Phase 9 UI, backed by the
  Phase 9 database model.
- Does **not** change `utype`'s meaning, values, or the login/session
  branch logic in `authService.ts`.
- Does **not** add audit logging (Phase 9).

**What Phase 2 does do:** ships the *permission vocabulary and enforcement
mechanism* so that Phases 3–9's routes can each declare which permission
they require, from day one, without retrofitting every module later once
the real database-backed roles system (Phase 9) exists. When Phase 9 adds
the real `admin_users`/`roles` collections, `rbac-guard.ts`'s role
resolution swaps from "hardcoded Super Admin" to "read the user's actual
assigned role" — a single, localized change, not a rewrite of every route
guard added in the interim.

## 7. Authentication changes

**None to the authentication mechanism itself.** Login, session issuance,
session verification, and logout are unchanged. The only new concept is
**authorization** (what an authenticated admin may do), layered after
authentication (who they are) — which is exactly the existing
`requireAdminSession()` → (new) `requirePermission()` composition
described in §1.

## 8. RBAC design (summary — full detail in the created design doc, §1)

Roles (matching the original request's five named roles), Phase 2 scope:

| Role | Status in Phase 2 |
|---|---|
| Super Admin | **Only role that actually exists today** — the current single admin account resolves to this, implicitly, since `utype=1` has no further subdivision in the live schema. All permissions. |
| Admin | Defined in the permission map (for Phase 9 forward-compatibility) but **unassignable to anyone in Phase 2** — no second account exists to assign it to. |
| Catalog Manager | Same as above — defined, unassignable in Phase 2. |
| Content Manager | Same. |
| Order Manager | Same. |

Permission list follows the original request's dot-notation examples
(`products.view/create/edit/delete/publish`, `categories.*`, `diseases.*`,
`orders.view/update`, `content.*`, `settings.view/update`) plus entries for
every module this CR's phases will introduce (herbs, media, SEO, etc.) —
enumerated in full in the created design doc, not restated here to avoid
two drifting copies.

**Enforcement is server-side only**, per contract §36 and the original
request's own instruction ("do not rely only on hiding UI elements") —
`requirePermission()` runs in Server Components/Route Handlers, never as a
client-side visibility toggle alone.

## 9. Testing

- Unit tests for `permissions.ts` (role→permission resolution, unknown
  permission handling) and `rbac-guard.ts` (allow/deny paths), added under
  `tests/lib/` alongside this project's existing `tests/lib/` auth
  coverage — extending, not duplicating, whatever pattern already covers
  `guard.ts`/`session.ts` there.
- No existing test is modified. No existing test should change behavior,
  since no existing code path changes.

## 10. Risks

| Risk | Mitigation |
|---|---|
| Temptation to "just add a `role` field to the session payload now" to make Phase 2 feel more complete | Explicitly not done — `SessionPayload` (session.ts) stays exactly as documented today (`userId`, `utype`, `email`, `issuedAt`). Role resolution happens in `rbac-guard.ts` by checking `utype === 1` (today, trivially "the one admin = Super Admin"), not by adding new session state. Keeps `session.ts` — a file with careful, already-gated fidelity documentation — untouched. |
| Scope creep into building the Roles/Permissions admin UI now, since it's "just" a CRUD screen | Explicitly deferred to Phase 9 per §6 — no `admin_users`/`roles` collection exists yet, and building UI for data that can't be persisted would be exactly the "fake admin panel" anti-pattern the original request itself warned against. |
| Permission list drifting out of sync with what later phases actually need | The design doc (§1) is treated as a living reference, revised at each subsequent phase's plan if a phase discovers it needs a permission not yet listed — not frozen after Phase 2. |

## 11. Existing functionality that remains untouched

- Admin login (`/admin/login`, `/admin/user-login`), logout
  (`/admin/user-logout`), session issuance/verification/expiry — byte-for-byte
  unchanged.
- Every currently-ported admin route (products, categories, blog, sliders,
  herbs, pincodes, enquiries, users list) — unaffected; none of them call
  the new `requirePermission()` in Phase 2 (that wiring is each module's
  own later phase's job, e.g. Phase 3 for Orders, Phase 4 for catalog).
- `(shell)/layout.tsx`'s existing `requireAdminSession()` gate — unchanged
  in behavior; at most receives a non-functional prop-threading addition
  (§2), which does not alter what it currently does.
- Public site — completely unaffected; Phase 2 touches only
  `src/lib/auth/*` (new files) and, possibly, one admin-only display
  component.

---

**Awaiting explicit instruction "Proceed with Phase 2" before any file
listed in §1/§2 is created or modified.**
