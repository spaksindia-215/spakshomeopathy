/**
 * `GET /admin/change-order-status?order_id=...` — CR-006 Phase 3. Mirrors
 * `routes/admin.php:94`
 * (`Route::get('change-order-status','AdminController@ChangeOrderStatus')`,
 * inside the `userAuth` group).
 *
 * SOURCE (`AdminController.php:1381-1386`):
 *   $orderId=decrypt($req->order_id);
 *   DB::table('orderproducts')->where('GroupId','=',$orderId)->update(['OrderStatus'=>3]);
 *   return redirect()->back()->with('message', 'Order shipped successfully!!');
 *
 * `order_id` is `encrypt($row->GroupId)` at the link's origin
 * (`order-list.blade.php:105`) despite the query param's name — it is the
 * GroupId, not a distinct "order id" field. Decrypted here via
 * `decryptGroupId` (`src/lib/auth/orderToken.ts`), the same mechanism the
 * buyer-side `cancel-order/route.ts` already established — not a new one.
 *
 * WRITE: `shipOrder()` (`adminOrderService.ts`) — `orderProducts` ONLY,
 * preserving the asymmetry versus cancel (which touches all three
 * collections). See that function's own header.
 *
 * FLASH MESSAGE: source's EXACT text, verbatim (`'Order shipped
 * successfully!!'`, double exclamation mark preserved).
 *
 * REDIRECT TARGET: source's `redirect()->back()` — fixed to
 * `/admin/order-list`, the only page that renders this link, matching
 * this codebase's established "back" convention (see buyer-side
 * `cancel-order/route.ts`'s own header for the same reasoning).
 *
 * RBAC: `requirePermissionForSession(db, session, PERMISSIONS.ORDERS_UPDATE)`
 * — first real use of Phase 2's mechanism for a write action. Role
 * resolution became real in Phase 9 (`rbac-guard.ts`); before that, every
 * admin session implicitly resolved to Super Admin, so this check had no
 * observable effect on the one real admin account.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { decryptGroupId } from '@/lib/auth/orderToken';
import { shipOrder } from '@/lib/services/adminOrderService';
import { setFlash } from '@/lib/auth/flash';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.ORDERS_UPDATE);

  const orderId = request.nextUrl.searchParams.get('order_id');

  const groupId = orderId !== null ? decryptGroupId(orderId) : null;
  if (groupId === null) {
    // No source branch to mirror — decrypt() failure has no observable
    // outcome worth reproducing literally (same reasoning as the
    // buyer-side cancel-order route's header). A minimal rejection,
    // not an invented business feature.
    await setFlash('message', 'Invalid or expired request.');
    return redirectTo('/admin/order-list', 303);
  }

  await shipOrder(db, groupId);

  await setFlash('message', 'Order shipped successfully!!');
  return redirectTo('/admin/order-list', 303);
}
