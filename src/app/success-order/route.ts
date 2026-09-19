/**
 * `POST /success-order` — mirrors `routes/web.php:87`
 * (`Route::post('success-order','HomeController@SuccessOrder')`),
 * `HomeController@SuccessOrder` (`HomeController.php:488-564`).
 *
 * LIVE-ORPHAN legacy single-item order path (blueprint §3.1 row #47): no
 * live view POSTs to this route (verified — `checkout-buy-product.blade.php`'s
 * own form posts to the excluded `cc/ccavRequestHandler.php`, not here),
 * but the route itself is reachable if hit directly, so it is ported per
 * contract §0's LIVE-orphan bucket ("Port exactly").
 *
 * NO GUARD, MATCHING SOURCE: `$custId=auth()->user()->id;`
 * (`HomeController.php:490`) is dereferenced with NO auth check and this
 * route sits OUTSIDE the `checkBuyer` group (`web.php:87`, outside the
 * group at `web.php:103-121` — same unguarded shape as B-15's
 * `payment/method`, though NOT itself a numbered BROKEN-register item).
 * Reproduced identically: a guest POST here also 500s, for the same
 * reason B-15 does.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/mongodb/client';
import { successOrderLegacy } from '@/lib/services/checkoutService';
import { stashSuccessOrderRow } from '@/lib/services/successOrderStash';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();

  if (!session) {
    // Same unguarded-Auth::User()->id shape as B-15's payment/method —
    // see file header.
    return new NextResponse('Internal Server Error', { status: 500 });
  }

  const formData = await request.formData();
  const db = await getDb();

  const shippingTimeRaw = formData.get('shipping_time');
  const shippingTimeDays = shippingTimeRaw !== null ? Number(shippingTimeRaw) : 0;

  const result = await successOrderLegacy(db, {
    buyerLegacyId: session.userId,
    pid: Number(formData.get('pid')),
    pinCode: formData.get('PinCode') !== null ? String(formData.get('PinCode')) : null,
    fullAddress: formData.get('FullAddress') !== null ? String(formData.get('FullAddress')) : null,
    houseNo: formData.get('HouseNo') !== null ? String(formData.get('HouseNo')) : null,
    landmark: formData.get('Landmark') !== null ? String(formData.get('Landmark')) : null,
    state: formData.get('State') !== null ? String(formData.get('State')) : null,
    country: formData.get('Country') !== null ? String(formData.get('Country')) : null,
    bid: formData.get('bid') !== null ? String(formData.get('bid')) : null,
    sid: formData.get('sid') !== null ? String(formData.get('sid')) : null,
    ptype: formData.get('ptype') !== null ? String(formData.get('ptype')) : null,
    orderNotes: formData.get('order_notes') !== null ? String(formData.get('order_notes')) : null,
    shippingTimeDays: Number.isFinite(shippingTimeDays) ? shippingTimeDays : 0,
  });

  if (!result.row) {
    // Source dereferences $getProduct->p_quantity/... with no null guard on
    // a non-matching $pid — an unreproducible PHP fatal (see
    // checkoutService.ts's successOrderLegacy header). Surfaced as a 500
    // here, the closest faithful "this request cannot be fulfilled" outcome
    // for a request shape source itself never successfully handles either.
    return new NextResponse('Internal Server Error', { status: 500 });
  }

  // HomeController.php:563 — return view('order-placed', ['row' => $row]).
  // This POST handler must itself SUPPLY the confirmation view's data
  // (matching source, which returns a view directly from a POST controller
  // method, not a redirect) — bridged here via a stashed one-request
  // payload the order-placed page reads, since a Next.js route.ts POST
  // handler cannot return JSX directly. See both
  // src/lib/services/successOrderStash.ts and src/app/order-placed/page.tsx
  // for the full reasoning — a bare GET to that route (no prior stash)
  // still reproduces B-17's crash; only this exact request sequence
  // (a just-completed POST /success-order) sees real content.
  await stashSuccessOrderRow(result.row);

  return redirectTo('/order-placed', 303);
}
