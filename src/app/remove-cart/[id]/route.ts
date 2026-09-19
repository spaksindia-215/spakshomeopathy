/**
 * `GET /remove-cart/{id}` — mirrors `routes/web.php:47`
 * (`Route::get('remove-cart/{id}','CartController@RemoveCart')`),
 * `CartController::RemoveCart` (`CartController.php:293-317`).
 *
 * The commented-out POST variant (`CartController.php:46`, `//Route::post
 * ('remove-cart',...)`) and the commented-out alternate implementation
 * (`CartController.php:318-326`) carry no authority (contract §12.4 —
 * commented code is never a source of behavior) — not ported.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { removeFromCart } from '@/lib/cart';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  await removeFromCart(Number(id));
  // CartController.php:316 — redirect()->route('cartList')
  return redirectTo('/cart-list', 303);
}
