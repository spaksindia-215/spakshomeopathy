/**
 * `POST`/`GET /update-cart` — mirrors `routes/web.php:50-51`
 * (`Route::post('update-cart',...)` and `Route::get('update-cart',...)`,
 * both to `CartController@UpdateCart`), `CartController::UpdateCart`
 * (`CartController.php:337-350`):
 *
 *   $pid = $req->id;
 *   $quantity = $req->quantity;
 *   Cart::update($pid, ['quantity' => $quantity]);
 *   return view('shopping-cart', ['items'=>..., 'SubTotal'=>...]);
 *
 * DISCLOSED DEVIATION (D6 — protocol/URL), owner-approved this slice:
 * source renders the `shopping-cart` view DIRECTLY at this URL (no
 * redirect) — the browser's address bar stays on `/update-cart` (or
 * shows the POSTed-to URL). Next.js Route Handlers return a `Response`
 * (JSON/redirect/raw text), not a React Server Component tree, so
 * rendering the real `CartPageContent` page (with its shared
 * header/footer/layout chrome) directly from this handler is not
 * available the way a `page.tsx` render is. This handler instead performs
 * the same mutation (`Cart::update`, absolute quantity) then 303-redirects
 * to `/cart-list`, which shows the SAME updated cart content
 * (`CartPageContent`, fed by the same `getCartContent()`/`getSubTotal()`
 * this handler itself just mutated) — same visible outcome, different
 * URL than source. Not a silent fix: this is the option the owner
 * selected when presented with the alternative (server-rendering a raw
 * HTML string to keep the URL identical) during this milestone.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { updateCart } from '@/lib/cart';

async function handle(request: NextRequest): Promise<NextResponse> {
  let id: number;
  let quantity: number;

  if (request.method === 'POST') {
    const formData = await request.formData();
    id = Number(formData.get('id'));
    quantity = Number(formData.get('quantity'));
  } else {
    id = Number(request.nextUrl.searchParams.get('id'));
    quantity = Number(request.nextUrl.searchParams.get('quantity'));
  }

  await updateCart(id, quantity);
  return redirectTo('/cart-list', 303);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handle(request);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handle(request);
}
