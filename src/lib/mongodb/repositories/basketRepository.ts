/**
 * `baskets` data access.
 *
 * Written ONLY by the DEAD/LIVE-orphan `HomeController::SuccessOrder`
 * (`HomeController.php:540`: `DB::table('baskets')->insertGetId($BasketData)`)
 * — never read by any controller (schemas/vestigial.ts's own header).
 * Added M6 to back `checkoutService.ts`'s `successOrderLegacy()` (the
 * `POST /success-order` route port), which must reproduce this INSERT even
 * though the route it belongs to is a LIVE-orphan (blueprint bucket: no
 * inbound link, but reachable if hit directly) — contract §0's bucket
 * definitions require porting a LIVE-orphan route's full behavior, not
 * silently dropping it.
 */

import type { Db } from 'mongodb';
import { ValidatedRepository } from './base';
import { COLLECTIONS } from '../collections';
import { basketSchema, type Basket } from '../schemas';

export class BasketRepository extends ValidatedRepository<Basket> {
  constructor(db: Db) {
    super(db, COLLECTIONS.baskets, basketSchema);
  }

  /** Same continuation-of-AUTO_INCREMENT strategy as
   * `OrderRepository.nextLegacyId()` — see that method's header. */
  async nextLegacyId(): Promise<number> {
    const highest = await this.collection.find({}).sort({ legacyId: -1 }).limit(1).toArray();
    const currentMax = highest[0]?.legacyId ?? 0;
    return currentMax + 1;
  }

  /** Mirrors `DB::table('baskets')->insertGetId($BasketData)`
   * (`HomeController.php:540`). Source uses `insertGetId` (returns the
   * new row's auto-increment id) because `SuccessOrder` immediately reuses
   * that id as `orders.bid` (`HomeController.php:543`) — this method
   * returns the inserted document (carrying the caller-assigned
   * `legacyId`) for the same purpose. */
  async insertBasket(doc: Basket): Promise<Basket> {
    return this.insertOne(doc);
  }
}
