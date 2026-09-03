/**
 * `GET /cart-remove-iteam/{id}` (named route `cart-remove-iteam`, "iteam"
 * — preserved typo, NN-3) — mirrors `routes/web.php:49`
 * (`Route::get('cart-remove-iteam/{id}','CartController@RemoveCart')
 * ->name('cart-remove-iteam')`), same underlying `RemoveCart` method as
 * `/remove-cart/{id}` (blueprint §3.1 row #29) — a second URL bound to
 * the identical controller method, per MIGRATION-CONTRACT.md §5.2's
 * "mechanical extraction... same emitted output" allowance, NOT a
 * consolidation of the routes themselves (both URLs remain independently
 * routable, per NN-3).
 */

import { NextRequest, NextResponse } from 'next/server';
import { removeFromCart } from '@/lib/cart';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  await removeFromCart(Number(id));
  return NextResponse.redirect(new URL('/cart-list', request.nextUrl.origin), 303);
}
