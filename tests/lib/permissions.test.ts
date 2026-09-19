/**
 * `@/lib/auth/permissions` tests — CR-006 Phase 2. This is a NEW,
 * additive module (no Laravel equivalent) — see `permissions.ts`'s own
 * header and `docs/CR-006-ANALYSIS-PHASE1.md` §3.
 */

import { describe, it, expect } from 'vitest';
import { PERMISSIONS, ROLES, hasPermission, getPermissionsForRole } from '@/lib/auth/permissions';

describe('permissions', () => {
  it('grants SUPER_ADMIN every defined permission', () => {
    for (const permission of Object.values(PERMISSIONS)) {
      expect(hasPermission(ROLES.SUPER_ADMIN, permission)).toBe(true);
    }
  });

  it('grants ADMIN every defined permission', () => {
    for (const permission of Object.values(PERMISSIONS)) {
      expect(hasPermission(ROLES.ADMIN, permission)).toBe(true);
    }
  });

  it('scopes CATALOG_MANAGER to catalog/inventory permissions only', () => {
    expect(hasPermission(ROLES.CATALOG_MANAGER, PERMISSIONS.PRODUCTS_EDIT)).toBe(true);
    expect(hasPermission(ROLES.CATALOG_MANAGER, PERMISSIONS.DISEASES_CREATE)).toBe(true);
    expect(hasPermission(ROLES.CATALOG_MANAGER, PERMISSIONS.INVENTORY_EDIT)).toBe(true);
    expect(hasPermission(ROLES.CATALOG_MANAGER, PERMISSIONS.ORDERS_UPDATE)).toBe(false);
    expect(hasPermission(ROLES.CATALOG_MANAGER, PERMISSIONS.CONTENT_EDIT)).toBe(false);
    expect(hasPermission(ROLES.CATALOG_MANAGER, PERMISSIONS.SETTINGS_UPDATE)).toBe(false);
  });

  it('scopes CONTENT_MANAGER to content/media/SEO permissions only', () => {
    expect(hasPermission(ROLES.CONTENT_MANAGER, PERMISSIONS.CONTENT_EDIT)).toBe(true);
    expect(hasPermission(ROLES.CONTENT_MANAGER, PERMISSIONS.MEDIA_MANAGE)).toBe(true);
    expect(hasPermission(ROLES.CONTENT_MANAGER, PERMISSIONS.SEO_MANAGE)).toBe(true);
    expect(hasPermission(ROLES.CONTENT_MANAGER, PERMISSIONS.PRODUCTS_EDIT)).toBe(false);
    expect(hasPermission(ROLES.CONTENT_MANAGER, PERMISSIONS.ORDERS_VIEW)).toBe(false);
  });

  it('scopes ORDER_MANAGER to orders/customers/coupons permissions only', () => {
    expect(hasPermission(ROLES.ORDER_MANAGER, PERMISSIONS.ORDERS_VIEW)).toBe(true);
    expect(hasPermission(ROLES.ORDER_MANAGER, PERMISSIONS.ORDERS_UPDATE)).toBe(true);
    expect(hasPermission(ROLES.ORDER_MANAGER, PERMISSIONS.CUSTOMERS_VIEW)).toBe(true);
    expect(hasPermission(ROLES.ORDER_MANAGER, PERMISSIONS.COUPONS_MANAGE)).toBe(true);
    expect(hasPermission(ROLES.ORDER_MANAGER, PERMISSIONS.PRODUCTS_EDIT)).toBe(false);
    expect(hasPermission(ROLES.ORDER_MANAGER, PERMISSIONS.CONTENT_EDIT)).toBe(false);
  });

  it('getPermissionsForRole returns exactly the permissions hasPermission agrees with', () => {
    for (const role of Object.values(ROLES)) {
      const granted = getPermissionsForRole(role);
      for (const permission of Object.values(PERMISSIONS)) {
        expect(granted.includes(permission)).toBe(hasPermission(role, permission));
      }
    }
  });
});
