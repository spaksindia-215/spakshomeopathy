/**
 * Shared cart-mutation handlers, extracted so both `/store-cart` (POST)
 * and `/product-store-cart` (GET) route files can call the SAME logic —
 * mirroring source, where both URLs are bound to the identical
 * `CartController@StoreCart` method (`routes/web.php:42-43`):
 *
 *   Route::post('store-cart','CartController@StoreCart');
 *   Route::get('product-store-cart','CartController@StoreCart');
 *
 * Per MIGRATION-CONTRACT.md §5.2, this is mechanical extraction of one
 * shared implementation behind two route entry points — NOT a
 * consolidation of two different behaviors, since source itself already
 * treats them as one method.
 */

import { addToCart, type CartItem } from './cart';
import { getDb } from './mongodb/client';
import { generateCartOrderId } from './cartOrderId';
import { setCartOrderId } from './cartOrderIdCookie';

/** Reads a field from either a `FormData` (POST body) or `URLSearchParams`
 * (GET query string) uniformly, matching Laravel's `$request->field`
 * accessor, which is transport-agnostic in exactly the same way. */
function readField(source: FormData | URLSearchParams, key: string): string {
  const value = source.get(key);
  return value === null ? '' : String(value);
}

/**
 * Mirrors `CartController::StoreCart` (`CartController.php:76-291`) in
 * full: reads `id`/`uid`/`p_name`/`p_price` plus the 9 additional
 * `p_name{N}`/`p_image{N}` slots (each defaulted to `''` if empty/absent,
 * exactly matching source's own `if ($req->p_imageN != '') ... else ''`
 * ladder), builds one cart line with `quantity` hardcoded to `1`
 * (`CartController.php:240`), adds it via `Cart::add()`, updates
 * `TotalCartItem`, generates and stores `getOrderId`, then redirects to
 * `cartList` (`route('cartList')`, i.e. `/cart-list` —
 * `CartController.php:289`; the unreachable `return view(...)` on
 * `CartController.php:290` is dead code after the `return redirect()` on
 * the line before it, not reproduced since it can never execute in PHP
 * either).
 */
export async function handleStoreCart(
  source: FormData | URLSearchParams
): Promise<{ orderId: string }> {
  const id = Number(readField(source, 'id'));
  const uid = readField(source, 'uid');
  const price = Number(readField(source, 'p_price'));
  const quantity = 1; // CartController.php:240 — hardcoded, not user-supplied

  const item: CartItem = {
    id,
    price: Number.isFinite(price) ? price : 0,
    quantity,
    name: readField(source, 'p_name'),
    attributes: {
      image: readField(source, 'p_image'),
      image2: readField(source, 'p_image2'),
      image3: readField(source, 'p_image3'),
      image4: readField(source, 'p_image4'),
      image5: readField(source, 'p_image5'),
      image6: readField(source, 'p_image6'),
      image7: readField(source, 'p_image7'),
      image8: readField(source, 'p_image8'),
      image9: readField(source, 'p_image9'),
      // CartController.php:150-155 — the p_image10 branch's OWN condition
      // is `if ($req->p_image != '')` (a copy-paste bug re-checking
      // p_image instead of p_image10), reproduced exactly rather than
      // corrected — see the matching name10 note below.
      image10: readField(source, 'p_image') !== '' ? readField(source, 'p_image10') : '',
      name2: readField(source, 'p_name2'),
      name3: readField(source, 'p_name3'),
      name4: readField(source, 'p_name4'),
      name5: readField(source, 'p_name5'),
      name6: readField(source, 'p_name6'),
      name7: readField(source, 'p_name7'),
      name8: readField(source, 'p_name8'),
      name9: readField(source, 'p_name9'),
      // CartController.php:224-229 — same copy-paste bug: the name10
      // branch's condition checks `$req->p_name` (not `p_name10`).
      // Preserved verbatim per NN-4/IR-9 (broken stays broken) — this is
      // a genuinely observable behavior (name10 is populated whenever
      // p_name is non-empty, i.e. on every real add-to-cart submission,
      // regardless of whether a 10th name value was actually sent).
      name10: readField(source, 'p_name') !== '' ? readField(source, 'p_name10') : '',
      uid,
    },
  };

  await addToCart(item);

  const db = await getDb();
  const orderId = await generateCartOrderId(db);
  await setCartOrderId(orderId);

  return { orderId };
}
