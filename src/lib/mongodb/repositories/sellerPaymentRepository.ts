/**
 * `sellerPayments` (was `sellerpayment`) data access.
 *
 * Written ONLY by the DEAD/LIVE-orphan `HomeController::SuccessOrder`
 * (`HomeController.php:552`: `DB::table('sellerpayment')->insert($SellerPayData)`)
 * — never read by any controller (schemas/vestigial.ts's own header). Added
 * M6 to back `checkoutService.ts`'s `successOrderLegacy()` — see
 * `basketRepository.ts`'s header for why a LIVE-orphan route's writes are
 * still ported in full.
 */

import type { Db } from 'mongodb';
import { ValidatedRepository } from './base';
import { COLLECTIONS } from '../collections';
import { sellerPaymentSchema, type SellerPayment } from '../schemas';

export class SellerPaymentRepository extends ValidatedRepository<SellerPayment> {
  constructor(db: Db) {
    super(db, COLLECTIONS.sellerPayments, sellerPaymentSchema);
  }

  /** Same continuation-of-AUTO_INCREMENT strategy as
   * `OrderRepository.nextLegacyId()` — see that method's header. */
  async nextLegacyId(): Promise<number> {
    const highest = await this.collection.find({}).sort({ legacyId: -1 }).limit(1).toArray();
    const currentMax = highest[0]?.legacyId ?? 0;
    return currentMax + 1;
  }

  /** Mirrors `DB::table('sellerpayment')->insert($SellerPayData)`
   * (`HomeController.php:552`). */
  async insertSellerPayment(doc: SellerPayment): Promise<SellerPayment> {
    return this.insertOne(doc);
  }
}
