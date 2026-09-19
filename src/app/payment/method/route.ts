/**
 * `POST /payment/method` (named route `payment-method-identify`) — mirrors
 * `routes/web.php:66`
 * (`Route::post('payment/method','HomeController@redirectToPaymentMethod')
 * ->name('payment-method-identify')`), `HomeController@redirectToPaymentMethod`
 * (`HomeController.php:735-828`).
 *
 * THE REAL, LIVE QR order-placement endpoint (blueprint §9.3) — the
 * `cart-checkout.blade.php` form (`id="offline_payment"`) posts here after
 * its client-side transaction-id check passes.
 *
 * ============================================================================
 * B-15 — REPRODUCED, NOT FIXED (contract NN-4/IR-9; task brief's explicit
 * instruction)
 * ============================================================================
 * Route 37 sits OUTSIDE the `checkBuyer` middleware group in source
 * (`web.php:66`, versus the group at `web.php:103-121` — re-verified
 * directly this session) and `redirectToPaymentMethod` dereferences
 * `Auth::User()->id` (`HomeController.php:738-739`) with NO guard of any
 * kind. On real Laravel, a guest POST to this route throws a fatal error
 * (calling `->id` on `null`) — the framework's own 500 error page.
 *
 * "Adding the missing auth guard to `payment/method`" is EXPLICITLY listed
 * in contract §6.3 ("The obvious improvement trap") as FORBIDDEN WITHOUT
 * APPROVAL, and R-7/B-15 requires reproducing "500 for guests," not
 * preventing it. This handler therefore does NOT call `requireBuyerSession()`
 * (which would redirect, not 500) — it reads the session directly and, for
 * a missing/non-buyer session, returns an HTTP 500 with no recovery
 * redirect, matching the OBSERVABLE outcome of source's unguarded
 * null-property-access fatal (per contract §7.3: "does not mean
 * bug-for-bug identical *internal* stack traces — only identical
 * *user-visible* failure output," i.e. a 500 status, D6/D7).
 *
 * ============================================================================
 * NEWLY DISCOVERED THIS SESSION — a SECOND, independent 500 on this SAME
 * route, for EVERY buyer with a non-empty cart (not only guests)
 * ============================================================================
 * See `checkoutService.ts`'s `placeOfflinePaymentOrder` header for the full
 * citation: the live `orderproducts` table has no `qr_transection_id`
 * column, but source's real INSERT array includes one — every real
 * placement with at least one cart item throws at the database layer.
 * `placeOfflinePaymentOrder` reproduces this as a thrown
 * `OrderProductsColumnMismatchError`, caught here and converted to the
 * same 500 status B-15 already produces for guests. **Flagged as a
 * candidate Blueprint Correction Notice in
 * docs/GATE-REPORT-M6-CHECKOUT.md** — this was not part of the task
 * brief's or blueprint's description of this route.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getSession } from '@/lib/auth/session';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { getDb } from '@/lib/mongodb/client';
import {
  placeOfflinePaymentOrder,
  OrderProductsColumnMismatchError,
} from '@/lib/services/checkoutService';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();

  if (!session) {
    // B-15/R-7 — guest POST: source fatals on Auth::User()->id against
    // null. Reproduced as a 500, not a redirect/guard — see file header.
    return new NextResponse('Internal Server Error', { status: 500 });
  }

  const formData = await request.formData();

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    return NextResponse.json({ error: 'Token mismatch' }, { status: 419 });
  }

  // Source itself performs NO utype check in redirectToPaymentMethod (only
  // the ROUTE GROUP membership, which this route sits outside of — see file
  // header) — a non-buyer authenticated session (admin/seller) reaches
  // Auth::User()->id successfully on real Laravel too, since any logged-in
  // user has that property. Reproduced identically: no utype gate added
  // here either.

  const db = await getDb();

  try {
    await placeOfflinePaymentOrder(db, {
      buyerLegacyId: session.userId,
      transectionId: String(formData.get('transection_id') ?? ''),
      pinCode: formData.get('PinCode') !== null ? String(formData.get('PinCode')) : null,
      fullAddress:
        formData.get('FullAddress') !== null ? String(formData.get('FullAddress')) : null,
      houseNo: formData.get('HouseNo') !== null ? String(formData.get('HouseNo')) : null,
      landmark: formData.get('Landmark') !== null ? String(formData.get('Landmark')) : null,
      state: formData.get('State') !== null ? String(formData.get('State')) : null,
      orderId: formData.get('order_id') !== null ? String(formData.get('order_id')) : null,
      amount: formData.get('amount') !== null ? String(formData.get('amount')) : null,
      orderNotes: formData.get('order_notes') !== null ? String(formData.get('order_notes')) : null,
      // HomeController.php:802 — $request->DeliveryCharge; the checkout
      // form's TOP hidden-field block sends `DeliveryCharge` (value `0`,
      // cart-checkout.blade.php:158) — read through unmodified (P-09: always
      // effectively 0 on any real submission, since the form's value is
      // hardcoded 0 regardless of source's own dead $DeliveryPrice logic).
      deliveryCharge:
        formData.get('DeliveryCharge') !== null ? String(formData.get('DeliveryCharge')) : null,
    });
  } catch (error) {
    if (error instanceof OrderProductsColumnMismatchError) {
      // See file header — reproduces the live orderproducts.qr_transection_id
      // column-mismatch crash for any non-empty cart.
      return new NextResponse('Internal Server Error', { status: 500 });
    }
    throw error;
  }

  // HomeController.php:827 — redirect('manage-orders')->with('message', ...)
  const { setFlash } = await import('@/lib/auth/flash');
  await setFlash(
    'message',
    'Your order has been successfully placed. Thank you for shopping with Spakshomeopathy!'
  );
  return redirectTo('/manage-orders', 303);
}
