/**
 * `POST /update-cart-ajax` (named route `updateCartByAjax`) — mirrors
 * `routes/web.php:65`
 * (`Route::post('update-cart-ajax','CartController@UpdateCartByAjax')
 * ->name('updateCartByAjax')`), `CartController::updateCartByAjax`
 * (`CartController.php:391-402`):
 *
 *   Cart::update($request->id, ['quantity' => ['relative' => false, 'value' => $request->quantity]]);
 *   $items = Cart::getContent();
 *   return $items;
 *
 * Laravel implicitly JSON-encodes a returned `Collection`
 * (`Cart::getContent()`'s `ItemCollection`) when it's the controller's
 * return value — reproduced here as an explicit `NextResponse.json()` of
 * the same cart-content shape. This is the ONE cart endpoint the deployed
 * app's own client JS actually calls
 * (`shopping-cart.blade.php`'s `.updateCart` click handler, reproduced
 * verbatim in `CartPageContent.tsx`'s inline `<script>`): on success it
 * does `window.location.href = '{{route('cartList')}}'` itself — the
 * client-side script performs the navigation, not this endpoint, so this
 * handler correctly returns JSON, not a redirect, matching source exactly
 * (contract V-11: "`update-cart-ajax` consumable by the existing
 * `shopping-cart` JS unchanged").
 *
 * PAYLOAD ENCODING: jQuery's `$.ajax({ data: {...} })` with a plain
 * object and no explicit `contentType` (verified directly against
 * `CartPageContent.tsx`'s inline script, which matches
 * `shopping-cart.blade.php`'s own inline script verbatim) serializes as
 * `application/x-www-form-urlencoded` — the SAME encoding as a native
 * HTML form POST, not JSON — so this handler reads `request.formData()`,
 * matching how Laravel's `$request->id`/`$request->quantity` accessors
 * read it too.
 *
 * CSRF: the calling script DOES send `_token` in its payload
 * (`'_token': "{{csrf_token()}}"` in source; `''` unchanged in the demo
 * script this slice does not touch) — verified via `csrf.ts`'s existing
 * `verifyCsrfToken`, matching `user-login/route.ts`'s precedent exactly,
 * now that the payload is confirmed form-encoded and therefore readable
 * the same way.
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateCart } from '@/lib/cart';
import { verifyCsrfToken } from '@/lib/auth/csrf';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    // CartController::UpdateCartByAjax has no explicit failure-response
    // shape for a CSRF mismatch beyond Laravel's own uncaught
    // TokenMismatchException — matching `user-login/route.ts`'s
    // established "no observable value in a debug crash page" reasoning,
    // a clean 419 status (Laravel's own CSRF-failure status code) is
    // returned instead of a stack trace.
    return NextResponse.json({ error: 'Token mismatch' }, { status: 419 });
  }

  const id = Number(formData.get('id'));
  const quantity = Number(formData.get('quantity'));

  const items = await updateCart(id, quantity);
  return NextResponse.json(items);
}
