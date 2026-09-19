/**
 * `GET /admin/cancel-order?cncl_id=...` — CR-006 Phase 3. Mirrors
 * `routes/admin.php:133`
 * (`Route::get('cancel-order','AdminController@CancelOrder')`, inside the
 * `userAuth` group).
 *
 * A GENUINELY DIFFERENT ROUTE/BEHAVIOR FROM THE EXISTING PUBLIC
 * `src/app/cancel-order/route.ts` (buyer-side, already built) — same
 * URL basename, different path (`/admin/cancel-order` vs.
 * `/cancel-order`), different Laravel controller
 * (`AdminController@CancelOrder` vs. `BuyerController@CancelOrder`),
 * different write behavior. Kept as two entirely separate files; never
 * merged. See `adminOrderService.ts`'s header for the full disclosure of
 * exactly how the two differ.
 *
 * SOURCE (`AdminController.php:1349-1357`):
 *   $GroupId=decrypt($req->cncl_id);
 *   DB::table('orderproducts')->where('GroupId',$GroupId)->update(['OrderStatus'=>5]);
 *   DB::table('orders')->where('GroupId',$GroupId)->update(['OrderStatus'=>5]);
 *   DB::table('payments')->where('gid',$GroupId)->update(['orderStatus'=>4]);
 *   return redirect()->back()->with('message', 'Order cancelled successfully!!');
 *
 * NO OWNERSHIP CHECK — matches source exactly (an admin action over any
 * order, by design; contrast with the buyer path, which has an
 * owner-authorized ownership check added beyond source — see that
 * route's own header). Not adding one here would be inventing a
 * restriction Laravel's admin flow doesn't have.
 *
 * WRITE: `adminCancelOrder()` (`adminOrderService.ts`) — `orders`/
 * `orderProducts`=5, `payments`=4 (P-03's documented mismatch, preserved
 * verbatim).
 *
 * FLASH MESSAGE: source's EXACT text, verbatim, identical to the buyer
 * path's own success message (`'Order cancelled successfully!!'`) —
 * confirmed both controllers happen to use the same string, not a
 * transcription accident here.
 *
 * REDIRECT TARGET: fixed to `/admin/order-list` (source's `back()`
 * destination in practice), same convention as `change-order-status`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { decryptGroupId } from '@/lib/auth/orderToken';
import { adminCancelOrder } from '@/lib/services/adminOrderService';
import { setFlash } from '@/lib/auth/flash';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.ORDERS_UPDATE);

  const cnclId = request.nextUrl.searchParams.get('cncl_id');
  const origin = request.nextUrl.origin;

  const groupId = cnclId !== null ? decryptGroupId(cnclId) : null;
  if (groupId === null) {
    await setFlash('message', 'Invalid or expired request.');
    return NextResponse.redirect(new URL('/admin/order-list', origin), 303);
  }

  await adminCancelOrder(db, groupId);

  await setFlash('message', 'Order cancelled successfully!!');
  return NextResponse.redirect(new URL('/admin/order-list', origin), 303);
}
