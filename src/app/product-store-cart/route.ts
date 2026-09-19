/**
 * `GET /product-store-cart` — mirrors `routes/web.php:43`
 * (`Route::get('product-store-cart','CartController@StoreCart')`).
 *
 * THE ACTUAL REAL TRAFFIC PATH (blueprint §3.1 row #25 — "GET — actual
 * path used"): `AddToCartForm.tsx`'s `action="/product-store-cart"` with
 * `method="REQUEST"` (browsers coerce an unrecognized method to GET),
 * so every real "Add To Cart" click in the deployed app hits THIS route,
 * with the form's hidden fields carried as a query string, not a POST
 * body.
 *
 * A GET route with a side effect (mutates the cart) is itself a
 * preserved, pre-existing defect (no CSRF possible on GET; source's own
 * `web.php` routes this way) — not something to "fix" by moving it to
 * POST, per NN-3.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { handleStoreCart } from '@/lib/cartActions';

export async function GET(request: NextRequest): Promise<NextResponse> {
  await handleStoreCart(request.nextUrl.searchParams);
  // CartController.php:289 — redirect()->route('cartList')
  return redirectTo('/cart-list', 303);
}
