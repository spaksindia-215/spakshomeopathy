/**
 * `POST /post-checkout` — mirrors `routes/web.php:117`
 * (`Route::post('post-checkout','HomeController@postCheckout')`, inside
 * the `checkBuyer` group, `web.php:104-119`), `HomeController@postCheckout`
 * (`HomeController.php:407-429`).
 *
 * DEAD (blueprint §3.1 row #66 — reachable via the `checkBuyer` route
 * group, but no live view POSTs here: no `action="{{url('post-checkout')}}"`
 * or `route('post-checkout')` reference exists in any Blade file, verified
 * directly this session). Per contract §0's bucket definitions, a DEAD
 * route's ROUTE is still ported (not silently dropped) so it responds
 * identically to source if hit directly — this file does that.
 *
 * ============================================================================
 * NEWLY DISCOVERED THIS SESSION — postCheckout ALSO CRASHES, INDEPENDENT OF
 * B-11/B-12/B-17 (not previously catalogued in the BROKEN register or in
 * docs/M3-APPLICATION-MAPPING.md row #66, which describes it only as doing
 * "No DB ops")
 * ============================================================================
 * `postCheckout` returns `view('cart-checkout', ['products'=>$products])`
 * (`HomeController.php:428`) — the SAME view `Checkout()` (the real
 * `/product-checkout` endpoint) renders, but supplying ONLY `$products`.
 * `cart-checkout.blade.php` unconditionally dereferences `$getUserData->name`
 * at its very first data-bound field (line 178, `<input ... name="name"
 * value="{{$getUserData->name}}" ...>` — re-verified directly this
 * session), plus `$SubTotal`, `$DeliveryCharge`, `$getstatezone` throughout
 * — NONE of which `postCheckout` supplies. On real Laravel this throws
 * `ErrorException: Undefined variable: getUserData` — the SAME failure
 * CLASS as B-17 (`order-placed.blade.php` dereferencing an unsupplied
 * `$row`), just not previously catalogued under its own BROKEN-register
 * number. Reproduced here as a 500 for the same "no Next.js equivalent
 * mechanism worth building for a literal PHP undefined-variable fatal"
 * reasoning `order-placed/page.tsx` documents — this is a Route Handler
 * (not a page component), so it responds with a 500 status directly
 * rather than throwing during a page render.
 *
 * **Flagged for the Gate Report as a candidate Blueprint Correction
 * Notice** (contract §12.2) — blueprint row #66's "No DB ops" description
 * is accurate but incomplete; it does not mention this route also crashes
 * on every real hit, independent of its DB-write behavior.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireBuyerSession } from '@/lib/auth/guard';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { buildPostCheckoutProducts } from '@/lib/services/checkoutService';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    return NextResponse.json({ error: 'Token mismatch' }, { status: 419 });
  }

  // Mirrors CheckBuyer — requireBuyerSession() redirects a guest/non-buyer
  // to /login (this route sits INSIDE the checkBuyer group in source,
  // unlike payment/method's B-15/success-order's unguarded shape).
  await requireBuyerSession();

  // Reproduces HomeController::postCheckout's own computation exactly
  // (HomeController.php:407-426) — the read is real, even though the
  // result is discarded below (the view it feeds always crashes first —
  // see file header). Built via the shared service function so this
  // behavior has the same unit-test coverage as the rest of checkoutService.
  buildPostCheckoutProducts(formData);

  // See file header — the target view crashes unconditionally on every
  // real request shape, independent of $products' content.
  return new NextResponse('Internal Server Error', { status: 500 });
}
