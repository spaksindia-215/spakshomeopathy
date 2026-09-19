import type { Db } from 'mongodb';
import { ValidatedRepository } from '@/lib/mongodb/repositories/base';
import { herbOrderSchema, type HerbOrder } from './schema';

export const HERB_ORDERS_COLLECTION = 'herbOrders';

/** Same reuse rationale as `HerbProductRepository` — `ValidatedRepository`
 * is generic infrastructure, not legacy-migration-specific. */
export class HerbOrderRepository extends ValidatedRepository<HerbOrder> {
  constructor(db: Db) {
    super(db, HERB_ORDERS_COLLECTION, herbOrderSchema);
  }

  async findById(id: string): Promise<HerbOrder | null> {
    return this.findOne({ id });
  }

  async findByRazorpayOrderId(razorpayOrderId: string): Promise<HerbOrder | null> {
    return this.findOne({ razorpayOrderId });
  }

  async findAll(): Promise<HerbOrder[]> {
    return this.find({});
  }

  /** Calls `this.logMutation()` directly (CR-006 Phase 9) since this
   * bypasses the base class's own instrumented `updateOne` (an
   * upsert-by-own-`id`). */
  async upsert(order: HerbOrder): Promise<HerbOrder> {
    const validated = this.validate(order);
    await this.collection.updateOne({ id: validated.id }, { $set: validated }, { upsert: true });
    await this.logMutation('update', validated.id);
    return validated;
  }
}
