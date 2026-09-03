/**
 * Session cart — mirrors `darryldecode/cart` (package default config) as
 * used by `CartController.php`, per blueprint §7.2 and
 * MIGRATION-CONTRACT.md §5.1 ("`darryldecode/cart` → Custom implementation
 * ... Same semantics").
 *
 * SOURCE EQUIVALENCE, NOT A REDESIGN
 * -----------------------------------
 * Laravel's cart package stores its content in the server-side session
 * (`Cart::getContent()` / `Cart::add()` / `Cart::update()` /
 * `Cart::remove()`), keyed by a package-internal session key. Per DR-05
 * (`docs/M3-OWNER-DECISION-RECORDS.md` — RESOLVED 2026-08-31: the
 * HMAC-signed cookie in `src/lib/auth/session.ts` is the permanent
 * session-store mechanism for this migration), this module follows the
 * exact same pattern: cart content lives in a dedicated, HMAC-signed,
 * self-contained cookie (`spaks_cart`) — not a `carts` MongoDB collection.
 * This matches source's own architecture: `CartController`'s constructor
 * comment block and `blueprint.md` §6.5 both confirm the cart is
 * SESSION-ONLY in Laravel too — no `carts` table exists in the 34-table
 * schema, and no code path ever persists cart content to the database.
 * Building a `carts` collection here would be inventing persistence
 * source never had, not preserving behavior.
 *
 * COOKIE NAME: `spaks_cart` — deliberately distinct from `spaks_session`
 * (auth) and the `spaks_flash_*` cookies — same signing primitive
 * (`sign()`/`safeEqual()` pattern from `session.ts`), independent cookie,
 * independent of login state (P-11: "Cart is global to the session, not
 * per-user; survives login" — blueprint §7.2 / MIGRATION-CONTRACT.md
 * P-11). Because it is NOT keyed to `userId`, a shared browser/session
 * naturally shares one cart between whoever uses it — matching source's
 * documented anonymous/global-to-session behavior exactly, not narrowed
 * to "per authenticated user."
 *
 * QUANTITY SEMANTICS (darryldecode/cart default, package source verified
 * against composer.lock's pinned `darryldecode/cart: ^4.0`): adding an
 * item whose `id` already exists in the cart INCREMENTS that line's
 * quantity by the newly-added quantity (never replaces the line or adds a
 * second line for the same id) — reproduced in `addToCart` below via
 * `existing.quantity += quantity`, not `push`.
 *
 * PRICE ON RE-ADD: darryldecode/cart's default `add()` does not touch
 * `price`/`name`/`attributes` on an existing line — only `quantity`
 * changes. `StoreCart` always submits `quantity=1` (`CartController.php:240`
 * — hardcoded), so in practice the ONLY thing that changes on a re-add is
 * quantity; this module preserves that exact package behavior (existing
 * line's price/name/attributes are left untouched on a repeat add) rather
 * than "helpfully" updating them to the newly-submitted values, which
 * would silently diverge from the real package's semantics.
 */

import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';
import { getCryptoConfig } from './env';

export const CART_COOKIE_NAME = 'spaks_cart';

/**
 * One cart line. Field names mirror `darryldecode\Cart\ItemCollection`'s
 * own attribute contract exactly (verified against
 * `shopping-cart.blade.php` and `CartController::StoreCart`'s `$data`
 * array, `CartController.php:242-271`) — `id`/`price`/`quantity`/`name`
 * at the top level, everything else (the 9 additional image/name slots
 * plus `uid`) inside `attributes`, matching the package's own
 * `id`/`name`/`price`/`quantity`/`attributes` item shape.
 */
export interface CartItem {
  /** Product id (`products.id` / `legacyId`). darryldecode/cart uses this
   * as the line's dedup key — see QUANTITY SEMANTICS above. */
  id: number;
  name: string;
  price: number;
  quantity: number;
  attributes: {
    image: string;
    image2: string;
    image3: string;
    image4: string;
    image5: string;
    image6: string;
    image7: string;
    image8: string;
    image9: string;
    image10: string;
    name2: string;
    name3: string;
    name4: string;
    name5: string;
    name6: string;
    name7: string;
    name8: string;
    name9: string;
    name10: string;
    /** `$req->uid` — the seller/vendor id slot inherited from the
     * marketplace-vestige data model (blueprint §5.1 / §1.2's "no ORM"
     * note). Passed through unmodified, not resolved to anything. */
    uid: string;
  };
}

export type CartContent = CartItem[];

function sign(data: string): string {
  const { sessionSecret } = getCryptoConfig();
  return createHmac('sha256', sessionSecret).update(data).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function encode(content: CartContent): string {
  const json = Buffer.from(JSON.stringify(content)).toString('base64url');
  const signature = sign(json);
  return `${json}.${signature}`;
}

function decode(cookieValue: string): CartContent {
  const parts = cookieValue.split('.');
  if (parts.length !== 2) return [];
  const json = parts[0];
  const signature = parts[1];
  if (json === undefined || signature === undefined) return [];
  const expectedSignature = sign(json);
  if (!safeEqual(signature, expectedSignature)) return [];

  try {
    const parsed = JSON.parse(Buffer.from(json, 'base64url').toString('utf-8'));
    if (!Array.isArray(parsed)) return [];
    return parsed as CartContent;
  } catch {
    return [];
  }
}

/**
 * Cart cookie has no independent lifetime concept in source — Laravel's
 * cart package rides the SAME session as everything else (120-minute
 * `SESSION_LIFETIME`, blueprint §5.4). Reusing `sessionLifetimeMinutes`
 * here (not a new, separately-configured value) preserves that coupling.
 */
async function writeCart(content: CartContent): Promise<void> {
  const { sessionLifetimeMinutes } = getCryptoConfig();
  const cookieStore = await cookies();
  if (content.length === 0) {
    cookieStore.delete(CART_COOKIE_NAME);
    return;
  }
  cookieStore.set(CART_COOKIE_NAME, encode(content), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: sessionLifetimeMinutes * 60,
  });
}

/** Mirrors `Cart::getContent()`. */
export async function getCartContent(): Promise<CartContent> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(CART_COOKIE_NAME)?.value;
  if (!raw) return [];
  return decode(raw);
}

/** Mirrors `Cart::getSubTotal()` — sum of `price * quantity` across all lines. */
export function getSubTotal(content: CartContent): number {
  return content.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

/**
 * Mirrors `session('TotalCartItem')` as set by every cart-mutating action
 * (`$req->session()->put('TotalCartItem', $totalCart)`, computed as
 * `Cart::getContent()->count()` — P-08: DISTINCT LINE COUNT, not summed
 * quantity). `CartController.php`'s constructor never itself recomputes
 * this — every mutating method (`StoreCart`, `RemoveCart`) does, so this
 * helper is called after every write, not read lazily from a stale value.
 */
export function getTotalCartItem(content: CartContent): number {
  return content.length;
}

/**
 * Mirrors `Cart::add($data)` (`CartController::StoreCart`,
 * `CartController.php:274`) — adds one line, or increments quantity if
 * `id` already exists (see QUANTITY SEMANTICS in the file header).
 */
export async function addToCart(newItem: CartItem): Promise<CartContent> {
  const content = await getCartContent();
  const existingIndex = content.findIndex((item) => item.id === newItem.id);

  let next: CartContent;
  if (existingIndex === -1) {
    next = [...content, newItem];
  } else {
    next = content.map((item, i) =>
      i === existingIndex ? { ...item, quantity: item.quantity + newItem.quantity } : item
    );
  }

  await writeCart(next);
  return next;
}

/** Mirrors `Cart::remove($id)` (`CartController::RemoveCart`,
 * `CartController.php:295`). */
export async function removeFromCart(id: number): Promise<CartContent> {
  const content = await getCartContent();
  const next = content.filter((item) => item.id !== id);
  await writeCart(next);
  return next;
}

/**
 * Mirrors `Cart::clear()` — used at the end of every real order-placement
 * path (`HomeController::redirectToPaymentMethod`, `HomeController.php:823`;
 * `HomeController::saveOrder`, `HomeController.php:727`;
 * `HomeController::paymentSuccess`/`paymentFailed`, both DEAD). Added M6
 * (checkout & orders) — M5's cart module had no caller needing a full clear
 * until now. Empties the cart entirely, matching the package's own
 * `clear()` semantics (not a per-item removal loop).
 */
export async function clearCart(): Promise<void> {
  await writeCart([]);
}

/**
 * Mirrors `Cart::update($pid, ['quantity' => ['relative' => false, 'value'
 * => $quantity]])` (`CartController::update`, `CartController.php:332`,
 * and `UpdateCartByAjax`, `CartController.php:393-397`) — ABSOLUTE
 * quantity set, not relative/incremental (the package also supports
 * `relative: true`, which source never uses on this path). A quantity
 * `<= 0` is passed through unmodified — source performs no floor/validation
 * here either (`Cart::update` accepts whatever the package itself allows;
 * no guard exists in `CartController.php`), so this does not add one.
 */
export async function updateCartQuantity(id: number, quantity: number): Promise<CartContent> {
  const content = await getCartContent();
  const next = content.map((item) => (item.id === id ? { ...item, quantity } : item));
  await writeCart(next);
  return next;
}

/**
 * Mirrors `CartController::UpdateCart` (`CartController.php:337-344`) —
 * same absolute-quantity semantics as `updateCartQuantity` above (the
 * package call is identical in substance: `Cart::update($pid, ['quantity'
 * => $quantity])`, which the package treats as an absolute set when not
 * wrapped in the `relative` array form — verified against
 * darryldecode/cart's `Cart::update()` source, which defaults to absolute
 * unless `relative` is explicitly `true`). Kept as a separate export
 * (rather than reusing `updateCartQuantity`) only because it is a
 * DIFFERENT route (`POST/GET /update-cart` vs. `GET /cart/update`) in
 * source with its own controller method — the call sites must stay
 * independently traceable per MIGRATION-CONTRACT.md §5.2 ("Near-duplicate
 * queries... differ subtly... Each call site is ported independently").
 */
export const updateCart = updateCartQuantity;
