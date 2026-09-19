/**
 * `GET /admin/change-payment-status?payId=...` — CR-006 Phase 3. Mirrors
 * `routes/admin.php:121`
 * (`Route::get('change-payment-status','AdminController@ChangePaymentStatus')`,
 * inside the `userAuth` group).
 *
 * SOURCE (`AdminController.php:1405-1411`):
 *   $payId=$req->payId;
 *   $payDate=date('d M, Y');
 *   DB::table('payments')->where('id','=',$payId)->update(['payStatus'=>2,'payDate'=>$payDate]);
 *   return redirect()->back();
 *
 * `payId` is a PLAIN, unencrypted query param in source (verified against
 * `manage-payments.blade.php:267`: `url('admin/change-payment-status?payId='.$row->payId)`
 * — no `encrypt()` call, unlike `order_id`/`cncl_id` on the order routes).
 * Reproduced identically: no encryption applied here either — inventing
 * one would be adding a security property source doesn't have, not
 * preserving one it does.
 *
 * NO FLASH MESSAGE: source's `redirect()->back()` has no `->with(...)`
 * call at all — reproduced as a plain redirect, no `setFlash` call.
 *
 * REDIRECT TARGET: fixed to `/admin/manage-payments` (the only page that
 * renders this link — both `manage-payments` and `seller-payments/[sid]`
 * link here, but `manage-payments` is the more general destination and
 * matches this codebase's existing "back" convention of picking the
 * primary originating page).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { updatePaymentStatus } from '@/lib/services/adminPaymentService';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.ORDERS_UPDATE);

  const payId = request.nextUrl.searchParams.get('payId');
  const origin = request.nextUrl.origin;
  const paymentLegacyId = payId !== null ? Number(payId) : NaN;

  if (Number.isFinite(paymentLegacyId)) {
    await updatePaymentStatus(db, paymentLegacyId);
  }

  return NextResponse.redirect(new URL('/admin/manage-payments', origin), 303);
}
