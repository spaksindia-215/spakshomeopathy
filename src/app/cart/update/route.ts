/**
 * `GET /cart/update` — mirrors `routes/web.php:48`
 * (`Route::get('cart/update','CartController@update')`),
 * `CartController::update` (`CartController.php:328-336`):
 *
 *   $pid = $request->rowid;
 *   $quantity = $request->newqty;
 *   Cart::update($pid, ['quantity' => ['relative' => false, 'value' => $quantity]]);
 *   return redirect()->back();
 *
 * NOTE THE FIELD NAMES: `rowid`/`newqty` — DIFFERENT from `/update-cart`'s
 * `id`/`quantity` (`CartController::UpdateCart`) and `/update-cart-ajax`'s
 * `id`/`quantity` (`CartController::UpdateCartByAjax`). Three distinct
 * field-name conventions for "which cart line, what quantity" across
 * three routes in source — preserved independently, not normalized to one
 * shared shape (MIGRATION-CONTRACT.md §5.2: near-duplicate call sites are
 * ported independently, not consolidated).
 *
 * `redirect()->back()` has no exact Next.js equivalent without a
 * `Referer` header read — reproduced via the `Referer` header when
 * present (matching what `back()` actually resolves to at the HTTP
 * level), falling back to `/cart-list` (the one real page this action is
 * ever invoked from) if absent.
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateCart } from '@/lib/cart';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const pid = Number(request.nextUrl.searchParams.get('rowid'));
  const quantity = Number(request.nextUrl.searchParams.get('newqty'));
  await updateCart(pid, quantity);

  const referer = request.headers.get('referer');
  const target = referer ?? new URL('/cart-list', request.nextUrl.origin).toString();
  return NextResponse.redirect(target, 303);
}
