/**
 * `getOrderId` generation — mirrors `CartController::StoreCart`
 * (`CartController.php:283-286`), blueprint §7.5 "Cart checkout" scheme.
 *
 *   $lastOrderId = DB::table('orders')->orderBy('id','DESC')->first();
 *   $IncrementId = $lastOrderId->id + 1;
 *   $getOrderId  = rand(99,9999) . $IncrementId;   // STRING CONCATENATION
 *   session()->put('getOrderId', $getOrderId);
 *
 * NOTE THE OPERATOR: PHP's `.` here is string concatenation (NOT the `+`
 * numeric-addition case documented in MIGRATION-CONTRACT.md §10.4 for the
 * unrelated legacy `'1200' + $id` path) — `rand(99,9999)` and `$IncrementId`
 * are simply concatenated as text, e.g. `rand=4213`, `IncrementId=57` →
 * `"421357"`. Reproduced here with plain template-literal concatenation,
 * which is the exact JS equivalent of PHP's `.` for two numeric operands.
 *
 * RACE CONDITION (R-6, blueprint §7.5): this read-then-write is NOT
 * wrapped in a transaction/lock in source, and is NOT wrapped here either
 * — reproducing the race is explicitly correct per MIGRATION-CONTRACT.md
 * §5.3 (a transaction wrap is pre-approved ONLY for actual order creation
 * in M6, not for this session-only `getOrderId` stamp, which is not itself
 * a database write).
 *
 * STORAGE: source stores this in `session('getOrderId')` — this module's
 * caller (the `store-cart`/`product-store-cart` route) stores the same
 * value in the cart cookie itself (`src/lib/cart.ts`'s cart content has no
 * natural place for a session-scalar, so the route layer threads it
 * through a dedicated cookie — see that route's own header comment for the
 * exact mechanism) rather than inventing a `sessions` collection DR-05
 * already resolved against.
 */

import type { Db } from 'mongodb';
import { OrderRepository } from './mongodb/repositories/orderRepository';

/** `rand(99,9999)` — PHP's `rand()` is inclusive on both bounds. */
function randInclusive(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Mirrors `CartController.php:283-285` exactly. Returns the generated
 * order id string, e.g. `"421357"`.
 */
export async function generateCartOrderId(db: Db): Promise<string> {
  const orderRepo = new OrderRepository(db);
  const lastOrderId = await orderRepo.findHighestLegacyId();
  // Source dereferences $lastOrderId->id unconditionally (no null guard);
  // an empty `orders` collection is not a real-world case for this live
  // database (819+ historical orders exist per prior gate reports), so a
  // 0-based fallback is used only to keep this function total rather than
  // throwing on a case source itself never actually hits in production.
  const incrementId = (lastOrderId ?? -1) + 1;
  const randPart = randInclusive(99, 9999);
  return `${randPart}${incrementId}`;
}
