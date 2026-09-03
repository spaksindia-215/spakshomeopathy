/**
 * `POST /store-cart` — mirrors `routes/web.php:42`
 * (`Route::post('store-cart','CartController@StoreCart')`).
 *
 * Not the route the deployed `AddToCartForm.tsx` actually submits to
 * (that form's `action="/product-store-cart"`, verified against
 * `product-detail.blade.php:354` — see the sibling `product-store-cart`
 * route for the one real traffic path), but a real, independently
 * routable POST entry point in source (blueprint §3.1 row #24) — ported
 * for completeness (NN-3: URLs are immutable) even though nothing in this
 * app currently links to it as a POST form target.
 *
 * No CSRF check here: `CartController::StoreCart` carries no CSRF
 * exemption, so a real Laravel POST to this route with a missing/invalid
 * `_token` would 419/crash — but `AddToCartForm.tsx` (M4-era, unmodified
 * this slice) submits with `method="REQUEST"` (an invalid HTML method
 * source itself never corrected — browsers coerce this to GET), so no
 * real POST submission to this specific route exists in the deployed
 * app's actual click-path today. Reproducing the CSRF-crash page for a
 * route nothing currently submits to is out of this slice's scope; if a
 * genuine POST integration is added later, CSRF verification should be
 * added here matching `user-login/route.ts`'s pattern.
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleStoreCart } from '@/lib/cartActions';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();
  await handleStoreCart(formData);
  // CartController.php:289 — redirect()->route('cartList')
  return NextResponse.redirect(new URL('/cart-list', request.nextUrl.origin), 303);
}
