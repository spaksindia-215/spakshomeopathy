/**
 * RBAC permission vocabulary and role→permission map — CR-006 Phase 2.
 *
 * WHAT THIS IS, AND IS NOT
 * -------------------------
 * This is a NEW, additive authorization layer. It has no Laravel
 * equivalent and is not a migration of existing behavior — see
 * `docs/CR-006-ANALYSIS-PHASE1.md` §3 ("RBAC / roles / permissions... no
 * table, no route... Fully new") and `docs/CR-006-PHASE-2-PLAN.md`.
 *
 * The live application's ONLY access-control signal is `users.utype`
 * (1=admin, 2=vestigial/unusable, 3=buyer) — a single flat flag, not a
 * role/permission model. That remains completely unchanged by this file:
 * `session.ts`, `guard.ts`, and `authService.ts` are not modified, and
 * `SessionPayload` gains no new field here. See `rbac-guard.ts` for how
 * this module composes with the existing `requireAdminSession()` without
 * altering it.
 *
 * HARDCODED, NOT DATABASE-BACKED (Phase 2 scope)
 * ------------------------------------------------
 * There is no `roles` or `admin_users` collection yet — creating one
 * requires its own D-11 schema-design authorization, not granted to this
 * phase (see `CR-006-ANALYSIS-PHASE1.md` §8 item 4). The role→permission
 * map below is therefore a hardcoded, in-code table. Every admin route
 * that exists TODAY continues to work exactly as before, gated only by
 * `requireAdminSession()` — nothing in this file is wired into any
 * existing route by Phase 2 (see the Phase 2 plan §3/§11).
 *
 * Only ONE role can actually be assigned to anyone in Phase 2: the
 * current, single real admin account (`utype=1`) resolves implicitly to
 * `SUPER_ADMIN` — see `rbac-guard.ts`. The other four roles are defined
 * here for forward compatibility with later phases' route guards, but are
 * UNASSIGNABLE in Phase 2: no second admin account, and no mechanism to
 * assign a role to one, exists yet (that is Phase 9, "Admin Users / Roles
 * & Permissions", per the approved phase order).
 */

/**
 * Every permission this CR's approved phases are expected to need,
 * grouped by the module that will consume them. Dot-notation, matching
 * the original request's own examples (`products.view`, `orders.update`,
 * etc.). Adding a permission here does not grant it to any route — a
 * later phase's own route guard must call `requirePermission()` with the
 * relevant string before it has any effect.
 */
export const PERMISSIONS = {
  // Catalog (Phase 4/5)
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_EDIT: 'products.edit',
  PRODUCTS_DELETE: 'products.delete',
  PRODUCTS_PUBLISH: 'products.publish',
  CATEGORIES_VIEW: 'categories.view',
  CATEGORIES_CREATE: 'categories.create',
  CATEGORIES_EDIT: 'categories.edit',
  CATEGORIES_DELETE: 'categories.delete',
  DISEASES_VIEW: 'diseases.view',
  DISEASES_CREATE: 'diseases.create',
  DISEASES_EDIT: 'diseases.edit',
  DISEASES_DELETE: 'diseases.delete',
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_EDIT: 'inventory.edit',

  // Sales / Orders (Phase 3/4)
  ORDERS_VIEW: 'orders.view',
  ORDERS_UPDATE: 'orders.update',
  CUSTOMERS_VIEW: 'customers.view',
  COUPONS_VIEW: 'coupons.view',
  COUPONS_MANAGE: 'coupons.manage',

  // Herbs (Phase 6)
  HERBS_VIEW: 'herbs.view',
  HERBS_MANAGE: 'herbs.manage',

  // Content CMS (Phase 7)
  CONTENT_VIEW: 'content.view',
  CONTENT_CREATE: 'content.create',
  CONTENT_EDIT: 'content.edit',
  CONTENT_DELETE: 'content.delete',

  // Media / SEO / Redirects (Phase 8)
  MEDIA_MANAGE: 'media.manage',
  SEO_MANAGE: 'seo.manage',
  REDIRECTS_MANAGE: 'redirects.manage',

  // System (Phase 9)
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_UPDATE: 'settings.update',
  USERS_MANAGE: 'users.manage',
  ROLES_MANAGE: 'roles.manage',
  AUDIT_LOG_VIEW: 'audit_log.view',

  // Partner Panel feature — admin-side management of partner accounts.
  PARTNERS_MANAGE: 'partners.manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ALL_PERMISSIONS: readonly Permission[] = Object.values(PERMISSIONS);

/**
 * The five roles named in the original request. Only `SUPER_ADMIN` is
 * reachable by any real user in Phase 2 — see file header and
 * `rbac-guard.ts`.
 */
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  CATALOG_MANAGER: 'CATALOG_MANAGER',
  CONTENT_MANAGER: 'CONTENT_MANAGER',
  ORDER_MANAGER: 'ORDER_MANAGER',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/**
 * Hardcoded role→permission map. `SUPER_ADMIN` gets everything, by
 * definition — it is not simply "everything listed today" so that a
 * permission added in a later phase is automatically covered for the one
 * role that can actually be assigned right now, without this file needing
 * a matching edit every time. The other four roles' grants below are
 * scoped per the original request's own module groupings, for forward use
 * once Phase 9 makes them assignable — unused by any route in Phase 2.
 */
const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  [ROLES.SUPER_ADMIN]: ALL_PERMISSIONS,
  [ROLES.ADMIN]: ALL_PERMISSIONS,
  [ROLES.CATALOG_MANAGER]: [
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.PRODUCTS_CREATE,
    PERMISSIONS.PRODUCTS_EDIT,
    PERMISSIONS.PRODUCTS_DELETE,
    PERMISSIONS.PRODUCTS_PUBLISH,
    PERMISSIONS.CATEGORIES_VIEW,
    PERMISSIONS.CATEGORIES_CREATE,
    PERMISSIONS.CATEGORIES_EDIT,
    PERMISSIONS.CATEGORIES_DELETE,
    PERMISSIONS.DISEASES_VIEW,
    PERMISSIONS.DISEASES_CREATE,
    PERMISSIONS.DISEASES_EDIT,
    PERMISSIONS.DISEASES_DELETE,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_EDIT,
  ],
  [ROLES.CONTENT_MANAGER]: [
    PERMISSIONS.CONTENT_VIEW,
    PERMISSIONS.CONTENT_CREATE,
    PERMISSIONS.CONTENT_EDIT,
    PERMISSIONS.CONTENT_DELETE,
    PERMISSIONS.MEDIA_MANAGE,
    PERMISSIONS.SEO_MANAGE,
  ],
  [ROLES.ORDER_MANAGER]: [
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_UPDATE,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.COUPONS_VIEW,
    PERMISSIONS.COUPONS_MANAGE,
  ],
};

/** True if `role` has been granted `permission` per the hardcoded map above. */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** All permissions granted to `role` — used for diagnostics/testing, not route gating. */
export function getPermissionsForRole(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}
