/**
 * Order-group data access — `orders`, `orderProducts`, `payments`.
 *
 * DR-01 (APPROVED): three separate collections, queried and joined at the
 * APPLICATION level (this file), exactly mirroring how the Laravel source
 * reconstructs an order today — a multi-query/join pattern, not a
 * single-document read. See docs/M3-DATABASE-MAPPING.md §1.4,
 * docs/M3-OWNER-DECISION-RECORDS.md DR-01 for the full reasoning.
 *
 * IMPORTANT IMPLEMENTATION RULE (owner instruction, DR-01 approval):
 * "Do not blindly translate SQL joins into inefficient MongoDB queries...
 * design the data access layer so that application behavior remains
 * equivalent to Laravel. Document every intentional MongoDB-specific
 * implementation difference." Every function below states which Laravel
 * source line(s) it mirrors, and any deliberate MongoDB-specific technique
 * (e.g. using `$in` to batch-fetch instead of N sequential queries) is
 * called out explicitly as a documented difference, not a silent one.
 *
 * NO WRITE METHODS ARE IMPLEMENTED IN THIS FILE. M3-A's authorized scope is
 * the data-access LAYER, not checkout/order-placement business logic — see
 * the owner's M3-A boundary ("checkout implementation... NOT allowed yet").
 * Only read reconstruction (mirroring buyer/admin order-VIEW behavior,
 * which is what M3-A's "repositories/data-access layer" item covers) is
 * built here.
 */

import type { Db } from 'mongodb';
import { ValidatedRepository } from './base';
import { COLLECTIONS } from '../collections';
import {
  orderSchema,
  orderProductSchema,
  paymentSchema,
  type Order,
  type OrderProduct,
  type Payment,
} from '../schemas';

/**
 * The reconstructed shape of "everything belonging to one order" — the
 * application-level equivalent of the Laravel ★ join
 * (BuyerController.php:75-76: `orderproducts JOIN orders ON GroupId`) plus
 * the separate GroupId-filtered payments lookup used elsewhere
 * (BuyerController.php:99, AdminController.php:1355).
 *
 * This type does NOT get persisted anywhere — it exists only as this
 * repository's return shape, assembled at read time from the three
 * separate collections. This is the "MongoDB-specific implementation
 * difference" the owner's instruction asks to be documented: Laravel
 * builds this via one SQL join; here it is built via three separate
 * queries combined in application code (see `getOrderByGroupId` below).
 */
export interface ReconstructedOrder {
  order: Order | null;
  lines: OrderProduct[];
  payments: Payment[];
}

export class OrderRepository extends ValidatedRepository<Order> {
  constructor(db: Db) {
    super(db, COLLECTIONS.orders, orderSchema);
  }

  /** Mirrors `DB::table('orders')->where('GroupId', $GroupId)->update(['OrderStatus'=>$status])`
   * (`BuyerController.php:98`) — the `orders` header row is exactly one
   * document per GroupId, so `updateOne` matches source's own effective
   * single-row update. */
  async updateStatusByGroupId(groupId: number, orderStatus: number): Promise<void> {
    await this.collection.updateOne({ groupId } as Partial<Order>, { $set: { orderStatus } });
  }

  /**
   * Mirrors `DB::table('orders')->orderBy('id','DESC')->first()`
   * (`CartController::StoreCart`, `CartController.php:283`) — the single
   * highest `legacyId` currently in `orders`, used only for
   * `getOrderId` generation (blueprint §7.5): `IncrementId = MAX(id) + 1`.
   * Returns `null` on an empty collection (source would instead fatal on
   * `$lastOrderId->id` against a null object in that case — a genuinely
   * unreachable case in a live database with existing orders, not
   * reproduced here since M5's scope is the cart, not that edge case).
   */
  async findHighestLegacyId(): Promise<number | null> {
    const docs = await this.collection.find({}).sort({ legacyId: -1 }).limit(1).toArray();
    const first = docs[0];
    if (first === undefined) return null;
    return this.validate(first).legacyId;
  }

  /**
   * NEW-DOCUMENT `legacyId` STRATEGY — same continuation-of-AUTO_INCREMENT
   * approach as `UserRepository.nextLegacyId()` (`userRepository.ts`), applied
   * to `orders`. A genuinely new order has no MariaDB row to inherit an id
   * from; the most faithful continuation of that identifier space is one more
   * than the current maximum `legacyId` in this collection, computed live
   * (not a cached counter). See `userRepository.nextLegacyId()`'s header for
   * the full reasoning (including the disclosed, unhardened concurrent-race
   * note) — identical reasoning applies here, not repeated in full.
   */
  async nextLegacyId(): Promise<number> {
    const highest = await this.findHighestLegacyId();
    return (highest ?? 0) + 1;
  }

  /**
   * Mirrors the `orders` INSERT in `redirectToPaymentMethod`
   * (`HomeController.php:770-783`) / `saveOrder` (`HomeController.php:723`) /
   * `SuccessOrder` (`HomeController.php:544`) — one `orders` header row per
   * placed order. Caller supplies every field (including `legacyId`,
   * `createdAt`/`updatedAt`) — this method performs no defaulting, matching
   * `base.ts`'s "data access only, no business logic" scope.
   */
  async insertOrder(doc: Order): Promise<Order> {
    return this.insertOne(doc);
  }
}

export class OrderProductRepository extends ValidatedRepository<OrderProduct> {
  constructor(db: Db) {
    super(db, COLLECTIONS.orderProducts, orderProductSchema);
  }

  /** Mirrors `DB::table('orderproducts')->where('GroupId', $GroupId)->update(['OrderStatus'=>$status])`
   * (`BuyerController.php:97`) — `updateMany`, NOT `updateOne`: one
   * GroupId can have MULTIPLE orderProducts lines (one per cart line in
   * that order, per `orderProductSchema`'s own header), and Laravel's
   * `->update()` on a `WHERE GroupId = ...` clause updates every matching
   * row, not just the first — `updateOne` here would silently leave
   * additional lines uncancelled, a real correctness bug this method
   * exists to avoid. */
  async updateStatusByGroupId(groupId: number, orderStatus: number): Promise<void> {
    await this.collection.updateMany({ groupId } as Partial<OrderProduct>, {
      $set: { orderStatus },
    });
  }

  /**
   * Mirrors `DB::table('orderproducts')->orderBy('id','DESC')->first()`
   * (`HomeController::redirectToPaymentMethod`, `HomeController.php:767` AND
   * `:786` — SOURCE READS THIS TWICE, see `findHighestGroupId`'s own callers
   * for why both reads are preserved rather than deduplicated; also
   * `HomeController::saveOrder`, `HomeController.php:684`). Returns the
   * highest `legacyId` row's `groupId` (source: `$GetGId->GroupId`), or
   * `null` on an empty collection (a genuinely unreachable case against a
   * live database with existing order lines).
   */
  async findHighestGroupId(): Promise<number | null> {
    const docs = await this.collection.find({}).sort({ legacyId: -1 }).limit(1).toArray();
    const first = docs[0];
    if (first === undefined) return null;
    return this.validate(first).groupId;
  }

  /** Same continuation-of-AUTO_INCREMENT strategy as
   * `OrderRepository.nextLegacyId()` — see that method's header. */
  async nextLegacyId(): Promise<number> {
    const docs = await this.collection.find({}).sort({ legacyId: -1 }).limit(1).toArray();
    const first = docs[0];
    const highest = first === undefined ? null : this.validate(first).legacyId;
    return (highest ?? 0) + 1;
  }

  /** Mirrors the `orderproducts` INSERT inside `redirectToPaymentMethod`'s
   * per-cart-line loop (`HomeController.php:792-807`) / `saveOrder`'s
   * equivalent loop (`HomeController.php:701-702`). */
  async insertOrderProduct(doc: OrderProduct): Promise<OrderProduct> {
    return this.insertOne(doc);
  }
}

export class PaymentRepository extends ValidatedRepository<Payment> {
  constructor(db: Db) {
    super(db, COLLECTIONS.payments, paymentSchema);
  }

  /** Mirrors `DB::table('payments')->where('gid', $GroupId)->update(['orderStatus'=>$status])`
   * (`BuyerController.php:99`) — one `payments` row exists per order LINE
   * (per `paymentSchema`'s own header: "one row per cart line's payment
   * record"), so like `OrderProductRepository`, `updateMany` is required,
   * not `updateOne`. */
  async updateStatusByGroupId(groupId: number, orderStatus: number): Promise<void> {
    await this.collection.updateMany({ gid: groupId } as Partial<Payment>, {
      $set: { orderStatus },
    });
  }

  /** Same continuation-of-AUTO_INCREMENT strategy as
   * `OrderRepository.nextLegacyId()` — see that method's header. */
  async nextLegacyId(): Promise<number> {
    const docs = await this.collection.find({}).sort({ legacyId: -1 }).limit(1).toArray();
    const first = docs[0];
    const highest = first === undefined ? null : this.validate(first).legacyId;
    return (highest ?? 0) + 1;
  }

  /** Mirrors the `payments` INSERT inside `redirectToPaymentMethod`'s
   * per-cart-line loop (`HomeController.php:818-819`) / `saveOrder`'s
   * equivalent (`HomeController.php:711-712`). */
  async insertPayment(doc: Payment): Promise<Payment> {
    return this.insertOne(doc);
  }
}

/**
 * Reconstructs "everything belonging to one order," mirroring the ★ join:
 * BuyerController.php:75-76
 * (`orderproducts JOIN orders ON orders.GroupId = orderproducts.GroupId`)
 * plus the separate GroupId-filtered payments lookup used elsewhere
 * (BuyerController.php:99, AdminController.php:1355).
 *
 * DOCUMENTED DIFFERENCE: the Laravel source performs the order+lines join
 * as one SQL join. Here it is three separate `find`/`findOne` calls against
 * three collections, combined in application code — this is DR-01 Option
 * B's explicit trade-off (docs/M3-OWNER-DECISION-RECORDS.md DR-01), not an
 * oversight. The RESULT must be equivalent (same order header, same set of
 * lines, same set of payments for the same GroupId) even though the
 * MECHANISM differs.
 *
 * A free function, not a repository method, because it coordinates across
 * three repositories rather than belonging to any single one of them.
 */
export async function getOrderByGroupId(db: Db, groupId: number): Promise<ReconstructedOrder> {
  const orderRepo = new OrderRepository(db);
  const lineRepo = new OrderProductRepository(db);
  const paymentRepo = new PaymentRepository(db);

  const [order, lines, payments] = await Promise.all([
    orderRepo.findOne({ groupId }),
    lineRepo.find({ groupId }),
    paymentRepo.find({ gid: groupId }),
  ]);

  return { order, lines, payments };
}

/**
 * Mirrors the buyer order-list query (BuyerController.php's `ManageOrders`
 * — filters orderproducts/orders by the buyer's own id). Returns the
 * distinct GroupIds belonging to a buyer, ORDERED to match source's
 * `orderBy('orderproducts.id', 'DESC')` (`BuyerController.php:78`) —
 * newest order-line first, deduplicated by GroupId while preserving that
 * ordering (a GroupId's position reflects its NEWEST line, matching what
 * a DESC-sorted, then-grouped result would show first).
 *
 * DOCUMENTED DIFFERENCE: fetches distinct GroupIds for a buyer via the
 * `orderProducts` collection's `buyerId` field (matching
 * BuyerController.php:74-78's filter column) rather than a SQL
 * `SELECT DISTINCT`. Sorted in application code after fetching (M4
 * buyer-orders slice; the M4-PREP version of this function did not sort
 * at all — that gap is closed here, not left as a REQUIRES-FOLLOW-UP,
 * since the owner's instruction this slice explicitly asks for it
 * "where verifiable," and source ordering IS directly verifiable from
 * `orderproducts.id DESC`, i.e. this collection's own `legacyId` DESC).
 * Pagination (source: `->paginate(20)`) is NOT implemented — see
 * `orderService.ts`'s header for why (real production order-history
 * depth per buyer, verified this session, never exceeds 20, making
 * pagination UI-invisible for any real account; flagged, not silently
 * dropped).
 */
export async function getOrderGroupIdsForBuyer(db: Db, buyerId: number): Promise<number[]> {
  const lineRepo = new OrderProductRepository(db);
  const lines = await lineRepo.find({ buyerId });
  // Sort by the underlying line's own legacyId DESC (== orderproducts.id
  // DESC in source) BEFORE deduplicating, so the first occurrence of each
  // GroupId in the deduplicated list is that GroupId's most recent line.
  const sortedLines = [...lines].sort((a, b) => b.legacyId - a.legacyId);
  const seen = new Set<number>();
  const orderedGroupIds: number[] = [];
  for (const line of sortedLines) {
    if (line.groupId === null || seen.has(line.groupId)) continue;
    seen.add(line.groupId);
    orderedGroupIds.push(line.groupId);
  }
  return orderedGroupIds;
}

/**
 * Ownership-checked order-detail lookup for a buyer — wraps
 * `getOrderByGroupId` with an EXPLICIT ownership check the caller can
 * trust, rather than leaving "does this GroupId belong to this buyer" to
 * be re-derived ad hoc at every call site. Checked against
 * `orderProducts.buyerId` (the same field `ManageOrders`'/this
 * repository's own buyer-list query already filters by — the one field
 * source itself treats as "this buyer's own" for order lines), NOT
 * `orders.custId` (present in the `orders` schema but never the field
 * `ManageOrders`/`ViewOrder` filter buyer ownership by in source — using
 * it instead would be inventing a check source doesn't perform, not
 * preserving one).
 *
 * Returns `null` if the GroupId does not exist OR does not belong to this
 * buyer — the caller cannot distinguish "wrong owner" from "doesn't
 * exist" from this return value alone, which is deliberate: leaking
 * "this order exists but isn't yours" vs. "this order doesn't exist" is
 * exactly the kind of enumeration surface B-12's correction should not
 * introduce, even though source itself (via its crash) never had to make
 * this choice either way.
 */
export async function getOwnedOrderByGroupId(
  db: Db,
  groupId: number,
  buyerId: number
): Promise<ReconstructedOrder | null> {
  const reconstructed = await getOrderByGroupId(db, groupId);
  const ownsThisOrder = reconstructed.lines.some((line) => line.buyerId === buyerId);
  if (!ownsThisOrder) return null;
  return reconstructed;
}

/**
 * Mirrors `BuyerController::CancelOrder`'s three-collection write
 * (`BuyerController.php:93-100`) EXACTLY: `OrderStatus`/`orderStatus` set
 * to `4` in ALL THREE collections uniformly (re-verified directly this
 * session against the live source — the buyer cancel path has NO
 * cross-collection status-value inconsistency; that inconsistency
 * belongs to the SEPARATE admin cancel path,
 * `AdminController.php:1352/1355`, which writes 5 to
 * orders/orderProducts but 4 to payments — a different controller, not
 * touched by this slice, and NOT the source of `orderSchema.ts`'s P-03
 * comment as it applies here).
 *
 * OWNERSHIP CHECK — A DELIBERATE, OWNER-AUTHORIZED ADDITION BEYOND
 * SOURCE: `BuyerController::CancelOrder` itself performs NO ownership
 * check at all (verified directly: it decrypts `GroupId` from the
 * request and updates by `GroupId` alone, with no `WHERE buyerId = ...`
 * clause anywhere in the three updates) — on real Laravel, any
 * authenticated buyer who obtains another buyer's encrypted `cncl_id`
 * could cancel that buyer's order. This is a genuine, pre-existing
 * authorization gap in source, not introduced by this migration. The M4
 * buyer-orders-slice task explicitly REQUIRES "verify ownership before
 * cancellation" and lists "buyer A cannot cancel buyer B's order" as a
 * mandatory security test — an explicit owner instruction to close this
 * gap, not a silent unauthorized deviation from source. Documented here
 * and in `docs/B-12-RESOLUTION.md`, not hidden.
 *
 * Returns `false` (no write performed) if the GroupId doesn't exist or
 * doesn't belong to this buyer; `true` if the write was performed.
 * Source's own status-preservation logic (or lack of it — CancelOrder
 * unconditionally overwrites orderStatus regardless of its prior value,
 * verified directly) is preserved: this function does not add a "was it
 * already cancelled/completed" guard either, matching source's own
 * unconditional-overwrite behavior exactly.
 */
const CANCELLED_STATUS = 4; // BuyerController.php:96 — `$data=array('OrderStatus'=>4)`

export async function cancelOwnedOrder(db: Db, groupId: number, buyerId: number): Promise<boolean> {
  const orderRepo = new OrderRepository(db);
  const lineRepo = new OrderProductRepository(db);
  const paymentRepo = new PaymentRepository(db);

  const lines = await lineRepo.find({ groupId });
  const ownsThisOrder = lines.some((line) => line.buyerId === buyerId);
  if (!ownsThisOrder) return false;

  // Mirrors BuyerController.php:96-99's three sequential updates. Run in
  // parallel here (three independent collections, no ordering dependency
  // between them — source's own sequential ordering carries no
  // transactional guarantee either, each is its own unguarded UPDATE).
  await Promise.all([
    orderRepo.updateStatusByGroupId(groupId, CANCELLED_STATUS),
    lineRepo.updateStatusByGroupId(groupId, CANCELLED_STATUS),
    paymentRepo.updateStatusByGroupId(groupId, CANCELLED_STATUS),
  ]);
  return true;
}
