/**
 * Partner Panel feature. Resolves the caller of `/admin/save-product` as
 * either an authenticated admin (with `products.create` permission) or an
 * authenticated partner — narrowly scoped to this one shared route, not a
 * general multi-role framework. Redirects (never returns) if neither
 * session type matches, mirroring `requireAdminSession`/
 * `requirePartnerSession`'s own redirect-on-failure shape.
 *
 * Server-side only, by design: this is the actual enforcement boundary a
 * partner cannot bypass by crafting a direct POST, since it re-verifies
 * the session's `utype` (and, for an admin, its RBAC permission) on every
 * request regardless of what the submitted form data claims.
 */

import { redirect } from 'next/navigation';
import type { Db } from 'mongodb';
import { getSession, type SessionPayload } from './session';
import { requirePermissionForSession } from './rbac-guard';
import { PERMISSIONS } from './permissions';

export type ProductActor =
  | { kind: 'admin'; session: SessionPayload }
  | { kind: 'partner'; session: SessionPayload };

const ADMIN_UTYPE = 1;
const PARTNER_UTYPE = 5;

export async function requireProductActor(db: Db): Promise<ProductActor> {
  const session = await getSession();

  if (session?.utype === ADMIN_UTYPE) {
    await requirePermissionForSession(db, session, PERMISSIONS.PRODUCTS_CREATE);
    return { kind: 'admin', session };
  }

  if (session?.utype === PARTNER_UTYPE) {
    return { kind: 'partner', session };
  }

  redirect('/admin/login');
}
