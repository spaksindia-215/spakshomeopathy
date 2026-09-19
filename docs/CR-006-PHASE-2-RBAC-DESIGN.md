# CR-006 Phase 2 — RBAC Design Record

**Status:** ✅ Implemented as described here. Companion to
`CR-006-PHASE-2-PLAN.md` (the pre-implementation plan) and
`GATE-REPORT-CR006-PHASE-2.md` (the post-implementation report).

---

## Permission list

Defined in `src/lib/auth/permissions.ts` as the `PERMISSIONS` const object.
Dot-notation, grouped by the module expected to consume each one in a
later, separately-approved phase:

- **Catalog** (Phase 4/5): `products.{view,create,edit,delete,publish}`,
  `categories.{view,create,edit,delete}`, `diseases.{view,create,edit,delete}`,
  `inventory.{view,edit}`
- **Sales** (Phase 3/4): `orders.{view,update}`, `customers.view`,
  `coupons.{view,manage}`
- **Herbs** (Phase 6): `herbs.{view,manage}`
- **Content** (Phase 7): `content.{view,create,edit,delete}`
- **Media/SEO/Redirects** (Phase 8): `media.manage`, `seo.manage`,
  `redirects.manage`
- **System** (Phase 9): `settings.{view,update}`, `users.manage`,
  `roles.manage`, `audit_log.view`

Defining a permission here grants nothing by itself — a route only enforces
it once that route's own (separately approved) phase calls
`requirePermission(session, PERMISSIONS.X)`. No currently-ported route does
this as of Phase 2 (verified — see Gate Report §"Files changed").

## Role table

| Role | Permissions (Phase 2) | Assignable to a real user in Phase 2? |
|---|---|---|
| `SUPER_ADMIN` | All | **Yes** — implicitly, to the one existing `utype=1` account |
| `ADMIN` | All | No — defined for Phase 9 forward-compat only |
| `CATALOG_MANAGER` | Catalog + inventory permissions | No |
| `CONTENT_MANAGER` | Content + media + SEO permissions | No |
| `ORDER_MANAGER` | Orders + customers + coupons permissions | No |

## What is hardcoded vs. deferred to a database model

**Hardcoded now** (`permissions.ts`, in-code `ROLE_PERMISSIONS` map):
- The permission vocabulary itself.
- The five roles' grants.
- Role *resolution* for a session (`rbac-guard.ts`'s `resolveRole()`) —
  today, unconditionally `utype === 1` → `SUPER_ADMIN`.

**Deferred to Phase 9** (requires its own D-11 schema-design authorization,
not granted here):
- An `admin_users` collection allowing more than one admin account.
- A `roles` collection making `ADMIN`/`CATALOG_MANAGER`/`CONTENT_MANAGER`/
  `ORDER_MANAGER` actually assignable to a real account.
- Any UI to create/edit/assign roles ("Admin Users", "Roles & Permissions"
  screens from the original request).
- Audit logging of permission grants/denials.

When Phase 9 adds that collection, `resolveRole()` is the only function
that needs to change (to look up a real stored role instead of the
hardcoded `utype===1 → SUPER_ADMIN` mapping) — every route guard written
against `requirePermission()` in the interim keeps working unmodified.
