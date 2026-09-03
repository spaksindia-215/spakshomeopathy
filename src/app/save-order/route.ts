/**
 * `POST /save-order` — mirrors `routes/web.php:118`
 * (`Route::post('save-order','HomeController@saveOrder')`, inside the
 * `checkBuyer` group, `web.php:104-119`), `HomeController@saveOrder`
 * (`HomeController.php:657-732`).
 *
 * DEAD (blueprint §3.1 row #67): the `#checkout-form` selector this
 * route's own AJAX trigger targets
 * (`cart-checkout.blade.php:561`: `$('#checkout-form').serialize()`) is
 * COMMENTED OUT in the view (`cart-checkout.blade.php:71`:
 * `<!-- <form action="#" method="post" id="checkout-form"> -->`), so the
 * jQuery selector matches nothing and the online-pay branch's AJAX call
 * serializes an empty payload and is never meaningfully reachable via the
 * UI — verified directly this session. The ROUTE itself is ported per
 * contract §0 (DEAD routes: "port the route... List explicitly," and the
 * task brief's explicit instruction that this route "must respond
 * identically to source if hit directly").
 *
 * RESPONSE SHAPE: source `return $orderId;` (`HomeController.php:731`) —
 * Laravel implicitly casts a returned scalar to a plain-text HTTP response
 * body (NOT JSON-wrapped — blueprint §9.1's own note: "order id (plain)").
 * Reproduced as a plain-text response with the numeric legacyId as its
 * body, matching that exactly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireBuyerSession } from '@/lib/auth/guard';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { getDb } from '@/lib/mongodb/client';
import { saveOrderLegacy } from '@/lib/services/checkoutService';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    return NextResponse.json({ error: 'Token mismatch' }, { status: 419 });
  }

  const session = await requireBuyerSession();

  const db = await getDb();
  const orderId = await saveOrderLegacy(db, {
    buyerLegacyId: session.userId,
    pinCode: formData.get('PinCode') !== null ? String(formData.get('PinCode')) : null,
    fullAddress: formData.get('FullAddress') !== null ? String(formData.get('FullAddress')) : null,
    houseNo: formData.get('HouseNo') !== null ? String(formData.get('HouseNo')) : null,
    landmark: formData.get('Landmark') !== null ? String(formData.get('Landmark')) : null,
    state: formData.get('State') !== null ? String(formData.get('State')) : null,
    orderId: formData.get('order_id') !== null ? String(formData.get('order_id')) : null,
    orderNotes: formData.get('order_notes') !== null ? String(formData.get('order_notes')) : null,
  });

  // Plain-text scalar response, matching source's `return $orderId;` —
  // not NextResponse.json().
  return new NextResponse(String(orderId), {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}
