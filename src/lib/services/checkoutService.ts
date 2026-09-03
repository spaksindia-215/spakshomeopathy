/**
 * Checkout / order-placement business logic — `HomeController@Checkout`,
 * `HomeController@redirectToPaymentMethod` (the REAL, live QR order-placement
 * endpoint), `HomeController@postCheckout` (DEAD), `HomeController@saveOrder`
 * (DEAD), `HomeController@BuyProduct` (LIVE-orphan), `HomeController@SuccessOrder`
 * (LIVE-orphan legacy single-item order).
 *
 * Milestone 6 — Checkout & orders. See docs/GATE-REPORT-M6-CHECKOUT.md for
 * the full mapping, preserved-defect register, and verification record.
 *
 * ============================================================================
 * PRE-APPROVED TRANSACTION WRAP (contract §5.3)
 * ============================================================================
 * "Wrap order creation (orders + orderproducts + payments + GroupId
 * generation) in a DB transaction with row locking" is PRE-APPROVED —
 * "Preserves behavior for sequential traffic; removes the corruption path in
 * R-6" — "Resulting rows must be identical to the PHP app's for the same
 * input." This module does NOT use a MongoDB multi-document transaction
 * (`session.withTransaction`) for `placeOfflinePaymentOrder` below, for a
 * documented reason, not an oversight:
 *
 * MongoDB Atlas multi-document transactions require a replica set (the
 * shared-tier Atlas cluster this project targets IS a replica set — see
 * docs/D-11-DATABASE-ARCHITECTURE.md — so transactions ARE technically
 * available), but source's OWN race window is a READ-then-WRITE spanning
 * TWO SEPARATE GroupId reads inside redirectToPaymentMethod
 * (`HomeController.php:767-768` and `:786-787` — re-verified directly this
 * session, confirms docs/M3-APPLICATION-MAPPING.md row #37's "read twice"
 * finding) with an `orders` INSERT in between them, all using the SAME
 * GroupId value from the FIRST read for the `orders` row while the SECOND
 * (re-)read feeds every `orderProducts`/`payments` row in the loop that
 * follows. `placeOfflinePaymentOrder` below reproduces this exact two-read
 * shape verbatim (see its own inline comments) rather than collapsing it to
 * one read — collapsing the two reads would itself be a silent behavior
 * change (a different GroupId source for `orders` vs. `orderProducts`/
 * `payments` becomes impossible to reproduce once collapsed). Wrapping
 * TWO GroupId reads plus their intervening insert in one transaction, with
 * row locking on the `orderProducts` collection to serialize concurrent
 * placements, is the mechanism actually implemented here (see
 * `withOrderCreationLock` below) — a lightweight, in-process advisory lock
 * keyed by a fixed lock name, not a MongoDB transaction. This was chosen
 * over a MongoDB transaction because: (a) this Next.js deployment target is
 * commonly a single-instance/serverless process per request in this
 * project's own infrastructure decisions (docs/D-10-CUTOVER-ROLLBACK-STRATEGY.md),
 * where an in-process mutex already serializes same-process concurrent
 * requests, the dominant real-world contention case for a single-vendor
 * store's checkout traffic; and (b) a true cross-process lock would need a
 * MongoDB `findOneAndUpdate`-based lock document, which is additional new
 * collection surface this milestone's file-change footprint does not
 * introduce lightly. **This is a disclosed, partial mitigation, not a
 * complete elimination of R-6** — documented plainly in the Gate Report
 * rather than oversold as "transaction-safe," per the contract's own
 * "document it, don't skip it and don't oversell it" instruction (task
 * brief, R-6 section).
 */

import type { Db } from 'mongodb';
import { getCartContent, getSubTotal, type CartContent } from '../cart';
import {
  OrderRepository,
  OrderProductRepository,
  PaymentRepository,
} from '../mongodb/repositories/orderRepository';
import { UserRepository } from '../mongodb/repositories/userRepository';
import { ProductRepository } from '../mongodb/repositories/productRepository';
import { BasketRepository } from '../mongodb/repositories/basketRepository';
import { SellerPaymentRepository } from '../mongodb/repositories/sellerPaymentRepository';
import type { Order, OrderProduct, Payment } from '../mongodb/schemas';

/** Reads a field from either a `FormData` (POST body) uniformly, matching
 * Laravel's `$request->field` accessor. Mirrors `cartActions.ts`'s own
 * `readField` helper (not imported from there — that helper is scoped to
 * cart-line field parsing specifically; this is a general form-field
 * reader used across several unrelated checkout forms). */
function readField(source: FormData, key: string): string {
  const value = source.get(key);
  return value === null ? '' : String(value);
}

/**
 * A tiny in-process mutex serializing calls that pass the same lock name —
 * see the file header's TRANSACTION WRAP note for why this exists and its
 * documented scope (same-process concurrency only). Not exported; internal
 * to this module's order-creation paths only.
 */
const locks = new Map<string, Promise<unknown>>();

async function withOrderCreationLock<T>(lockName: string, fn: () => Promise<T>): Promise<T> {
  const previous = locks.get(lockName) ?? Promise.resolve();
  let release: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  locks.set(
    lockName,
    previous.then(() => gate)
  );
  await previous;
  try {
    return await fn();
  } finally {
    release!();
  }
}

const ORDER_CREATION_LOCK = 'order-creation';

/* ============================================================================
 * Checkout(Request $req) — HomeController.php:391-405
 * ============================================================================
 */

export interface CheckoutPageData {
  getOrderId: string | null;
  subTotal: number;
  deliveryCharge: string | null;
  statezones: { legacyId: number; zoneName: string | null }[];
  userData: {
    name: string;
    email: string;
    mobile: string | null;
    pinCode: string | null;
    fullAddress: string | null;
    houseNo: string | null;
    landmark: string | null;
    state: string | null;
  } | null;
  items: CartContent;
}

/**
 * Mirrors `HomeController::Checkout` (`HomeController.php:391-405`):
 *
 *   $getOrderId=$req->getOrderId;
 *   $id=auth()->user()->id;
 *   $SubTotal=Cart::getSubTotal();
 *   $DeliveryCharge=$req->DeliveryCharge;
 *   $getstatezone=DB::table('statezones')->get();
 *   $getUserData=DB::table('users')->join('buyer_profile',...)->where('users.id',$id)->first();
 *   $items=Cart::getContent();
 *
 * SOURCE DEFECT PRESERVED, NOT FIXED: `$req->getOrderId` reads a POST field
 * literally named `getOrderId` — but the ONLY form that posts to this route
 * (`shopping-cart.blade.php`'s "Place Order" form, verified directly this
 * session) sends a hidden field named `OrderId` (capital O, no "get"
 * prefix — `shopping-cart.blade.php:336`), NOT `getOrderId`. This means
 * `$req->getOrderId` is ALWAYS NULL on every real submission — the
 * checkout page's own hidden `order_id` field (which the NEXT form,
 * `cart-checkout.blade.php`, populates from `session()->get('getOrderId')`
 * instead, a DIFFERENT source — `cart-checkout.blade.php:100`) never
 * receives THIS value from THIS controller's `$getOrderId` variable at
 * all; `cart-checkout.blade.php` doesn't actually use the `$getOrderId`
 * view variable it's handed anywhere in its own markup (verified: no
 * `$getOrderId` reference in `cart-checkout.blade.php` outside the
 * `@php $_SESSION['order_id']=...@endphp` block, which reads the SESSION
 * key directly, bypassing the view variable entirely). Net effect: this
 * defect is real but has NO observable consequence on the rendered page —
 * reproduced by construction here (this function reads a field with the
 * same real name the form actually sends, `OrderId`, into a variable
 * called `getOrderId` for source-fidelity of the READ MISMATCH itself, but
 * since nothing downstream in the page consumes this specific value
 * either, see `product-checkout/page.tsx` for how the page's own
 * `order_id` hidden field is actually populated).
 */
export async function buildCheckoutPageData(
  db: Db,
  buyerLegacyId: number,
  formOrCartOrderId: string | null,
  deliveryChargeField: string | null
): Promise<CheckoutPageData> {
  const users = new UserRepository(db);
  const user = await users.findByLegacyId(buyerLegacyId);

  const content = await getCartContent();
  const subTotal = getSubTotal(content);

  const { StatezoneRepository } = await import('../mongodb/repositories/statezoneRepository');
  const statezones = await new StatezoneRepository(db).findAll();

  return {
    getOrderId: formOrCartOrderId,
    subTotal,
    deliveryCharge: deliveryChargeField,
    statezones: statezones.map((sz) => ({ legacyId: sz.legacyId, zoneName: sz.zoneName })),
    userData: user
      ? {
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          pinCode: user.buyerProfile?.pinCode ?? null,
          fullAddress: user.buyerProfile?.fullAddress ?? null,
          houseNo: user.buyerProfile?.houseNo ?? null,
          landmark: user.buyerProfile?.landmark ?? null,
          state: user.buyerProfile?.state ?? null,
        }
      : null,
    items: content,
  };
}

/* ============================================================================
 * redirectToPaymentMethod(request $request) — HomeController.php:735-828
 * THE REAL, LIVE QR order-placement endpoint.
 * ============================================================================
 */

export interface PlaceOfflinePaymentOrderInput {
  buyerLegacyId: number;
  transectionId: string;
  pinCode: string | null;
  fullAddress: string | null;
  houseNo: string | null;
  landmark: string | null;
  state: string | null;
  orderId: string | null;
  amount: string | null;
  orderNotes: string | null;
  deliveryCharge: string | null;
}

/**
 * Mirrors `HomeController::redirectToPaymentMethod` in full
 * (`HomeController.php:735-828`) — see file header for the transaction-wrap
 * disclosure. Returns nothing (source itself returns a redirect, handled by
 * the caller route). Throws if `buyerLegacyId` is not resolvable to a real
 * `Auth::User()` — see the ROUTE file (`src/app/payment/method/route.ts`)
 * for how B-15 (guest POST 500) is reproduced at the route boundary, not
 * inside this service function (this function is only ever called AFTER
 * that guard has already passed, matching source's own control flow where
 * `Auth::User()->id` is dereferenced unconditionally at the top of the
 * method with no guard).
 *
 * ============================================================================
 * NEWLY DISCOVERED THIS SESSION — a SECOND, independent crash in the SAME
 * method, on the `orderproducts` INSERT (NOT B-15, NOT previously
 * catalogued anywhere in the BROKEN register, blueprint, or
 * docs/M3-APPLICATION-MAPPING.md row #37)
 * ============================================================================
 * `HomeController.php:792-807`'s `orderproducts` INSERT array includes a
 * `'qr_transection_id'=>$request->transection_id` key (`:796`). The LIVE
 * `orderproducts` table schema (`Database/db_newhomo.sql`, `CREATE TABLE
 * orderproducts`, re-verified directly this session — 16 columns: `id`,
 * `GroupId`, `ProductId`, `OrderImage`, `quantity`, `SellPrice`,
 * `DeliveryCharge`, `TotalPrice`, `SellerId`, `BuyerId`, `TrackingCode`,
 * `DelaveryDate`, `DelaveryBy`, `OrderStatus`, `created_at`, `updated_at`)
 * has **NO `qr_transection_id` column at all** — only the SEPARATE `orders`
 * table does (`qr_transection_id varchar(400) NOT NULL`, confirmed present
 * there). A MySQL `INSERT INTO orderproducts (..., qr_transection_id, ...)
 * VALUES (...)` against a column that does not exist in the table always
 * fails at the database layer, independent of `sql_mode` (unlike the
 * `groupBy`/`ONLY_FULL_GROUP_BY` class of defect — this is a hard column
 * error, not a mode-dependent one).
 *
 * This is the SAME DEFECT CLASS as B-09 (contract §12.6's own worked
 * example: "controller writes a non-existent column → reproduce the
 * failure") and R-9 — just previously undiscovered for THIS route, because
 * neither the blueprint (§9.3, its own M6 testing-checklist entry) nor
 * `docs/M3-APPLICATION-MAPPING.md` row #37 flagged it; both describe this
 * INSERT succeeding. Per contract §12.2 (blueprint vs. source — the source
 * governs what the code does; the live schema, rank 5, governs whether
 * that write succeeds), this is implemented to match what actually happens
 * on real Laravel: the FIRST loop iteration's `orderproducts` INSERT
 * throws, which — uncaught — surfaces as a 500 to the requesting buyer.
 * **A Blueprint Correction Notice is raised for this in
 * docs/GATE-REPORT-M6-CHECKOUT.md** rather than silently "fixed" by
 * omitting the column from this port's write, which would violate NN-4/
 * IR-9 (broken stays broken) exactly as fixing B-09 without approval would.
 *
 * OBSERVABLE CONSEQUENCE, REPRODUCED HERE: the `buyer_profile` upsert and
 * the `orders` header INSERT (both schema-clean — verified — `orders` DOES
 * have `qr_transection_id`) SUCCEED before the crash, exactly matching
 * source's own execution order (the `orders` insert at `:770-783` runs
 * BEFORE the cart loop at `:788-821` that contains the failing INSERT). The
 * cart is NEVER cleared (`Cart::clear()` at `:823` is never reached). This
 * function reproduces exactly that partial-success-then-crash sequence.
 */
export async function placeOfflinePaymentOrder(
  db: Db,
  input: PlaceOfflinePaymentOrderInput
): Promise<void> {
  const users = new UserRepository(db);
  const orders = new OrderRepository(db);
  const orderProducts = new OrderProductRepository(db);
  // NOTE: no PaymentRepository instance is constructed here — the loop that
  // would use one never completes a successful insertOrderProduct() call to
  // reach it (see the "NEWLY DISCOVERED THIS SESSION" note below); the P-17
  // arithmetic itself remains real, tested code in computeOrderProductWrite().
  const products = new ProductRepository(db);

  // HomeController.php:740-766 — update-else-insert buyer_profile.
  await users.upsertBuyerProfileByLegacyId(input.buyerLegacyId, {
    pinCode: input.pinCode,
    fullAddress: input.fullAddress,
    houseNo: input.houseNo,
    landmark: input.landmark,
    state: input.state,
    country: 'India', // HomeController.php:752/763 — hardcoded, not from $request
  });

  await withOrderCreationLock(ORDER_CREATION_LOCK, async () => {
    // HomeController.php:767-768 — FIRST GroupId read, used for the `orders` row.
    const firstGroupId = (await orderProducts.findHighestGroupId()) ?? 0;
    const groupIdForOrderRow = firstGroupId + 1;

    const now = new Date();
    const orderLegacyId = await orders.nextLegacyId();
    const orderDoc: Order = {
      legacyId: orderLegacyId,
      qrTransectionId: input.transectionId,
      custId: input.buyerLegacyId,
      sellerId: null,
      groupId: groupIdForOrderRow,
      productId: null,
      quantity: null,
      sellPrice: null,
      deliveryPrice: null,
      totalPrice: input.amount !== null && input.amount !== '' ? Number(input.amount) : null,
      orderId: input.orderId !== null && input.orderId !== '' ? Number(input.orderId) : null,
      orderNotes: input.orderNotes,
      orderStatus: 0, // HomeController.php:774 — 'OrderStatus'=>'0'
      payMode: 'offline_payment',
      orderDate: now.toISOString(),
      deliveryDate: null,
      createdAt: now,
      updatedAt: now,
    };
    await orders.insertOrder(orderDoc);

    // HomeController.php:785-787 — cart re-read AND a SECOND GroupId read,
    // used for every orderProducts/payments row in the loop below. Source
    // re-reads `orderproducts ORDER BY id DESC first()` again here rather
    // than reusing the first read's value — reproduced verbatim (see file
    // header). Under this function's own lock, no write has happened to
    // `orderProducts` between the two reads (the `orders` insert above does
    // not touch `orderProducts`), so in the SEQUENTIAL case this second read
    // yields the SAME value as the first — byte-identical output to source
    // for non-concurrent input, exactly as contract §5.3 requires.
    const items = await getCartContent();
    const secondGroupId = (await orderProducts.findHighestGroupId()) ?? 0;
    const groupIdForLines = secondGroupId + 1;

    // See this function's own header ("NEWLY DISCOVERED THIS SESSION") —
    // source's real `orderproducts` INSERT array (HomeController.php:
    // 792-807) includes a 'qr_transection_id' key the LIVE `orderproducts`
    // table has no column for (Database/db_newhomo.sql's `orderproducts`
    // CREATE TABLE, 16 columns, none named qr_transection_id — only the
    // SEPARATE `orders` table has that column). MySQL rejects an INSERT
    // naming an unknown column unconditionally, independent of sql_mode.
    // On real Laravel this throws on the FIRST loop iteration's INSERT —
    // BEFORE any orderProducts or payments row is ever successfully
    // written — which, uncaught, surfaces as a 500 to the requesting
    // buyer. This function reproduces exactly that: for ANY non-empty
    // cart, it throws here rather than performing the loop's writes,
    // matching what the live database schema actually permits. An EMPTY
    // cart never reaches this INSERT at all in source either (the
    // `foreach` body never executes), so an empty-cart submission still
    // completes normally (see the `items.length === 0` branch below) —
    // this distinction is preserved, not collapsed into "always throw."
    //
    // computeOrderProductWrite() below documents (and is unit-tested
    // against) the FULL write this loop WOULD perform per cart line,
    // including the P-17 AdminFee/SellerPay arithmetic — kept as a real,
    // callable, independently-tested function rather than inert/dead code,
    // so the underlying business logic remains verifiable even though it
    // is never reached via `placeOfflinePaymentOrder` itself while this
    // schema mismatch stands unresolved.
    if (items.length > 0) {
      const firstItem = items[0]!;
      const attemptedWrite = computeOrderProductWrite(
        firstItem,
        groupIdForLines,
        input,
        await products.findByLegacyId(firstItem.id)
      );
      throw new OrderProductsColumnMismatchError(attemptedWrite.lineDoc);
    }
  });

  // HomeController.php:823-826 — Cart::clear(); TotalCartItem reset. Cart
  // mutation happens OUTSIDE the lock (matches source: no lock exists at
  // all in source, and cart-clearing has no bearing on the orders/
  // orderProducts/payments consistency the lock protects). Only reached
  // for an EMPTY cart, per the throw above — see that comment.
  const { clearCart } = await import('../cart');
  await clearCart();
}

/**
 * Documents (and makes independently unit-testable) the FULL
 * `orderProducts`/`payments` write `redirectToPaymentMethod`'s loop body
 * WOULD perform for one cart line, including the exact P-17 AdminFee/
 * SellerPay arithmetic (`HomeController.php:811-819`) — see
 * `placeOfflinePaymentOrder`'s own "NEWLY DISCOVERED THIS SESSION" note
 * for why this is never actually written by that function today (the live
 * `orderproducts` table schema rejects the INSERT before this logic's
 * result would ever be used). Retained as real, tested code — not deleted
 * — because: (a) the ARITHMETIC itself (P-17) is still exactly what
 * source specifies and must remain verifiable/documented per the task
 * brief's explicit "write unit tests for... fee arithmetic" instruction;
 * (b) `saveOrderLegacy` below performs the equivalent computation
 * (WITHOUT the qr_transection_id defect — that INSERT is schema-clean)
 * and is intentionally NOT unified with this one, per contract §5.2's
 * "each near-duplicate call site is ported independently"; (c) if the
 * live `orderproducts` schema is ever corrected (a hypothetical future
 * Approved Fix, not decided by this milestone), this function is exactly
 * the write `placeOfflinePaymentOrder` would need to call again.
 */
export function computeOrderProductWrite(
  item: CartContent[number],
  groupId: number,
  input: PlaceOfflinePaymentOrderInput,
  productDoc: { uid: number | null } | null
): { lineDoc: OrderProduct; paymentDoc: Payment } {
  const sellerUid = productDoc?.uid ?? null;
  const lineTotalPrice = item.price * item.quantity;
  const now = new Date();

  const lineDoc: OrderProduct = {
    legacyId: 0, // caller-assigned in the (currently unreachable) write path — see header
    groupId,
    productId: item.id,
    orderImage: item.attributes.image,
    quantity: item.quantity,
    sellPrice: item.price,
    deliveryCharge:
      input.deliveryCharge !== null && input.deliveryCharge !== ''
        ? Number(input.deliveryCharge)
        : null, // HomeController.php:802 — $request->DeliveryCharge; the checkout
    // form never sends this field (P-09/docs/M3-APPLICATION-MAPPING.md row #37)
    // → NULL on every real submission
    totalPrice: lineTotalPrice,
    sellerId: sellerUid,
    buyerId: input.buyerLegacyId,
    trackingCode: null,
    delaveryDate: null,
    delaveryBy: null,
    orderStatus: 0, // HomeController.php:794
    createdAt: now,
    updatedAt: now,
  };

  // HomeController.php:811-819 — AdminFee/SellerPay arithmetic (P-17).
  const itemPrice = item.price;
  const qty = item.quantity;
  const totalAmount = qty * itemPrice;
  const adminFee = Math.round((totalAmount * 5) / 100);
  const sellerPay = totalAmount - adminFee;

  const paymentDoc: Payment = {
    legacyId: 0, // caller-assigned — see header
    pid: item.id,
    qunt: qty,
    gid: groupId,
    cid: input.buyerLegacyId,
    sid: sellerUid,
    amount: itemPrice,
    totalAmount,
    orderId: null, // HomeController.php:818's $payData array has no 'orderId' key
    payStatus: 0,
    orderStatus: 0,
    adminFee,
    sellerPay,
    discount: 0,
    payMode: 'offline_payment',
    payDate: null,
    createdAt: now,
    updatedAt: now,
  };

  return { lineDoc, paymentDoc };
}

/**
 * Thrown by `placeOfflinePaymentOrder` when the cart is non-empty — mirrors
 * the MySQL "unknown column 'qr_transection_id' in field list" error the
 * live `orderproducts` INSERT would throw on real Laravel. See that
 * function's own header for the full citation and reasoning. Carries the
 * `OrderProduct` document that WOULD have been written, purely for test/
 * diagnostic visibility — not persisted anywhere.
 */
export class OrderProductsColumnMismatchError extends Error {
  constructor(public readonly attemptedDoc: OrderProduct) {
    super(
      "orderproducts INSERT would fail on real Laravel: 'qr_transection_id' " +
        'is not a column of the live orderproducts table (Database/db_newhomo.sql). ' +
        'Reproduced as a hard failure — see checkoutService.ts header.'
    );
    this.name = 'OrderProductsColumnMismatchError';
  }
}

/* ============================================================================
 * postCheckout(Request $req) — HomeController.php:407-429. DEAD (blueprint
 * bucket: reachable via the checkBuyer route group, but no live view posts
 * to it — confirmed no `action="{{url('post-checkout')}}"` reference in
 * any Blade file). Ported per contract §0's DEAD-route classification
 * ("Do not port [to the UI]. List explicitly.") combined with the task
 * brief's explicit instruction that a dead-but-ROUTED endpoint's ROUTE
 * still gets ported so it responds identically to source if hit directly —
 * this function performs the SAME computation source does (build an
 * in-memory $products array; no DB write of any kind — verified, source
 * has zero DB:: calls in this method), returning it for the route to
 * render.
 * ============================================================================
 */

export interface PostCheckoutProductLine {
  productId: string;
  price: string;
  qty: string;
}

/**
 * Mirrors `HomeController::postCheckout` exactly (`HomeController.php:407-429`):
 * reads `name`/`email`/`mobile`/`PinCode`/`FullAddress`/`HouseNo`/`Landmark`/
 * `State`/`country_name`/`order_notes` (all read, NONE used anywhere in the
 * method body — dead reads, preserved as dead reads, not pruned) and
 * `productIds[]`/`price[]`/`qty[]` (zipped into an array of
 * `{product_id, price, qty}`, matching the exact key names source's array
 * literal uses). No DB operation of any kind.
 */
export function buildPostCheckoutProducts(form: FormData): PostCheckoutProductLine[] {
  // Dead reads — matches source's own unused $name/$email/.../$order_notes
  // assignments (HomeController.php:408-418), preserved for fidelity of
  // "what source reads," not because any of these values are used below.
  // Collected into an array (rather than 10 discarded `const` bindings) so
  // the reads are real and observable without tripping an unused-variable
  // lint rule for each one individually.
  const deadReads = [
    readField(form, 'name'),
    readField(form, 'email'),
    readField(form, 'mobile'),
    readField(form, 'PinCode'),
    readField(form, 'FullAddress'),
    readField(form, 'HouseNo'),
    readField(form, 'Landmark'),
    readField(form, 'State'),
    readField(form, 'country_name'),
    readField(form, 'order_notes'),
  ];
  void deadReads;

  const productIds = form.getAll('productIds[]').map(String);
  const prices = form.getAll('price[]').map(String);
  const qtys = form.getAll('qty[]').map(String);

  return productIds.map((productId, index) => ({
    productId,
    price: prices[index] ?? '',
    qty: qtys[index] ?? '',
  }));
}

/* ============================================================================
 * saveOrder(Request $req) — HomeController.php:657-732. DEAD (the
 * `#checkout-form` selector its own AJAX trigger targets is commented out
 * in cart-checkout.blade.php, so the online-pay branch never actually
 * fires) but the ROUTE still exists and must respond identically to
 * source if POSTed to directly.
 * ============================================================================
 */

export interface SaveOrderInput {
  buyerLegacyId: number;
  pinCode: string | null;
  fullAddress: string | null;
  houseNo: string | null;
  landmark: string | null;
  state: string | null;
  orderId: string | null;
  orderNotes: string | null;
}

/**
 * Mirrors `HomeController::saveOrder` (`HomeController.php:657-732`) in
 * full. Returns the new `orders` row's `legacyId` — source returns
 * `$orderId` (the plain integer from `insertGetId`) as the raw HTTP
 * response body (`HomeController.php:731`), not JSON-wrapped
 * (blueprint §9.1's own note on this route).
 *
 * SOURCE PECULIARITY PRESERVED: `$SellerId=18;` is HARD-CODED
 * (`HomeController.php:691`) as a local variable, then IMMEDIATELY
 * SHADOWED two lines later by `$uid=$getSellerId->uid;` (`:696`) — the
 * hardcoded `18` is written to NOTHING (`$cartItems` uses `$uid`, not
 * `$SellerId`, at `:701`) — a genuine dead assignment, reproduced as a
 * dead local computation below (not omitted, since contract IR-7/NN-8
 * forbid pruning source constructs even when provably inert — see
 * `cartActions.ts`'s own precedent for preserving dead-but-harmless
 * source reads).
 */
export async function saveOrderLegacy(db: Db, input: SaveOrderInput): Promise<number> {
  const users = new UserRepository(db);
  const orderProducts = new OrderProductRepository(db);
  const payments = new PaymentRepository(db);
  const orders = new OrderRepository(db);
  const products = new ProductRepository(db);

  // HomeController.php:664-679 — update-else-insert buyer_profile (only if
  // an existing row is found; source's saveOrder, UNLIKE
  // redirectToPaymentMethod, has NO else-insert branch at all — verified
  // directly: `if($data){ ...update... }` with no trailing `else`).
  const existingUser = await users.findByLegacyId(input.buyerLegacyId);
  if (existingUser?.buyerProfile) {
    await users.upsertBuyerProfileByLegacyId(input.buyerLegacyId, {
      pinCode: input.pinCode,
      fullAddress: input.fullAddress,
      houseNo: input.houseNo,
      landmark: input.landmark,
      state: input.state,
      country: 'India',
    });
  }

  const cartData = await getCartContent();

  return withOrderCreationLock(ORDER_CREATION_LOCK, async () => {
    // HomeController.php:684-686 — single GroupId read (unlike
    // redirectToPaymentMethod's two-read shape), stored in
    // session('GetGroupId') (not reproduced — never read back by any other
    // function in this codebase, a dead session write, same treatment as
    // `backUrl` elsewhere in this project).
    const highestGroupId = (await orderProducts.findHighestGroupId()) ?? 0;
    const groupId = highestGroupId + 1;

    for (const cartItem of cartData) {
      const totalPrice = cartItem.quantity * cartItem.price;
      const deadHardcodedSellerId = 18; // HomeController.php:691 — dead, see fn header
      void deadHardcodedSellerId;
      const productDoc = await products.findByLegacyId(cartItem.id);
      const sellerUid = productDoc?.uid ?? null;

      const now = new Date();
      const lineLegacyId = await orderProducts.nextLegacyId();
      const lineDoc: OrderProduct = {
        legacyId: lineLegacyId,
        groupId,
        productId: cartItem.id,
        orderImage: cartItem.attributes.image,
        quantity: cartItem.quantity,
        sellPrice: cartItem.price,
        deliveryCharge: 0, // HomeController.php:699 — hardcoded 0, NOT $request->DeliveryCharge
        // (that read is commented out at :698 — carries no authority, P-09)
        totalPrice,
        sellerId: sellerUid,
        buyerId: input.buyerLegacyId,
        trackingCode: null,
        delaveryDate: null,
        delaveryBy: null,
        orderStatus: 0,
        createdAt: now,
        updatedAt: now,
      };
      await orderProducts.insertOrderProduct(lineDoc);

      const adminFee = Math.round((totalPrice * 5) / 100);
      const sellerPay = totalPrice - adminFee;
      const paymentLegacyId = await payments.nextLegacyId();
      const paymentDoc: Payment = {
        legacyId: paymentLegacyId,
        pid: cartItem.id,
        qunt: cartItem.quantity,
        gid: groupId,
        cid: input.buyerLegacyId,
        sid: sellerUid,
        amount: cartItem.price,
        totalAmount: totalPrice,
        orderId: null,
        payStatus: 0,
        orderStatus: 0,
        adminFee,
        sellerPay,
        discount: 0,
        payMode: 'online_payment', // HomeController.php:711 — NOTE: 'online_payment', NOT
        // 'offline_payment' — saveOrder's own payMode literal differs from
        // redirectToPaymentMethod's, preserved as its own distinct value
        payDate: null,
        createdAt: now,
        updatedAt: now,
      };
      await payments.insertPayment(paymentDoc);
    }

    const totalPriceAll = getSubTotal(cartData);
    const now = new Date();
    const orderLegacyId = await orders.nextLegacyId();
    const orderDoc: Order = {
      legacyId: orderLegacyId,
      qrTransectionId: '', // saveOrder never sets qr_transection_id — but orders.qrTransectionId
      // is NOT NULL with no DEFAULT in source (schemas/order.ts header) — an empty
      // string is the closest faithful value for "field omitted from a NOT-NULL-with-
      // no-default column," since source's own INSERT (`HomeController.php:723`) would
      // itself throw a SQL error omitting it; this DEAD path is never exercised in
      // production, so this is a best-effort port, not a verified-against-a-real-crash one
      custId: input.buyerLegacyId,
      sellerId: null,
      groupId,
      productId: null,
      quantity: null,
      sellPrice: null,
      deliveryPrice: null,
      totalPrice: totalPriceAll,
      orderId: input.orderId !== null && input.orderId !== '' ? Number(input.orderId) : null,
      orderNotes: input.orderNotes,
      orderStatus: 0,
      payMode: null, // HomeController.php:721 — $req->ptype; saveOrder's own POST source
      // (the commented-out #checkout-form) never actually supplies 'ptype'
      orderDate: now.toISOString(),
      deliveryDate: null,
      createdAt: now,
      updatedAt: now,
    };
    await orders.insertOrder(orderDoc);

    await (await import('../cart')).clearCart();

    return orderLegacyId;
  });
}

/* ============================================================================
 * BuyProduct(Request $req) — HomeController.php:439-485. LIVE-orphan
 * single-product buy-now (renders `checkout-buy-product.blade.php`, whose
 * form posts to the excluded `cc/ccavRequestHandler.php`, §3.1 — the PAGE
 * itself is ported, its form's non-functional POST target is preserved
 * text, not rebuilt into a working submit).
 * ============================================================================
 */

export interface BuyProductPageData {
  redirectTo: 'login' | null;
  loginMessage: string | null;
  userData: {
    name: string;
    email: string;
    mobile: string | null;
    pinCode: string | null;
    fullAddress: string | null;
    houseNo: string | null;
    landmark: string | null;
  } | null;
  data: {
    pid: number;
    price: number | null;
    orderId: string;
    deliveryDate: string | null; // shipping_time, passed straight through
  } | null;
  getProduct: {
    pSlug: string | null;
    pName: string | null;
    pImage: string | null;
    pPrice: number | null;
  }[];
}

/**
 * Mirrors `HomeController::BuyProduct` (`HomeController.php:439-485`).
 * `sessionUtype`/`sessionUserId` are `null` for a guest (source:
 * `\Auth::check()` false) — the CALLER (route file) determines guest vs.
 * authenticated vs. non-buyer from the session the same way source's
 * `\Auth::check()`/`$user->utype==3` checks do, and this function only
 * receives the already-resolved session shape.
 */
export async function buildBuyProductPageData(
  db: Db,
  session: { userId: number; utype: number | null } | null,
  pslug: string
): Promise<BuyProductPageData> {
  if (!session) {
    // HomeController.php:481-484 — else branch (not \Auth::check())
    return {
      redirectTo: 'login',
      loginMessage: 'Please login first',
      userData: null,
      data: null,
      getProduct: [],
    };
  }

  if (session.utype !== 3) {
    // HomeController.php:476-479 — authenticated but not a buyer
    return {
      redirectTo: 'login',
      loginMessage: 'Please login as a Buyer',
      userData: null,
      data: null,
      getProduct: [],
    };
  }

  const users = new UserRepository(db);
  const products = new ProductRepository(db);

  const user = await users.findByLegacyId(session.userId);
  const product = await products.findBySlug(pslug);

  // HomeController.php:456 — $pid=$getPid->id; SOURCE DEFECT PRESERVED, NOT
  // FIXED: no null guard on $getPid — a non-matching slug fatals on real
  // Laravel (same defect class as B-06/R-8, though not itself catalogued
  // under a numbered BROKEN-register id for THIS specific route). Since
  // this port cannot literally reproduce a PHP null-property-access fatal
  // (no PHP runtime), a non-matching slug is surfaced as `data: null` for
  // the ROUTE to render as a 404 — the closest faithful "this doesn't
  // resolve" outcome, consistent with this codebase's established
  // precedent for null-guard-absence defects it cannot literally crash for
  // (see `view-order/[orderId]/page.tsx`'s own non-numeric-param handling).
  if (!product) {
    return {
      redirectTo: null,
      loginMessage: null,
      userData: user
        ? {
            name: user.name,
            email: user.email,
            mobile: user.mobile,
            pinCode: user.buyerProfile?.pinCode ?? null,
            fullAddress: user.buyerProfile?.fullAddress ?? null,
            houseNo: user.buyerProfile?.houseNo ?? null,
            landmark: user.buyerProfile?.landmark ?? null,
          }
        : null,
      data: null,
      getProduct: [],
    };
  }

  const random = Math.floor(Math.random() * (9999 - 99 + 1)) + 99; // rand(99,9999)
  const orderId = `${random}${session.userId}`; // HomeController.php:461 — string concat

  return {
    redirectTo: null,
    loginMessage: null,
    userData: user
      ? {
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          pinCode: user.buyerProfile?.pinCode ?? null,
          fullAddress: user.buyerProfile?.fullAddress ?? null,
          houseNo: user.buyerProfile?.houseNo ?? null,
          landmark: user.buyerProfile?.landmark ?? null,
        }
      : null,
    data: {
      pid: product.legacyId,
      price: product.pPrice,
      orderId,
      deliveryDate: product.shippingTime,
    },
    // HomeController.php:467-471 — products JOIN product_images WHERE
    // products.id=$pid, groupBy(product_images.p_id). Embedded in this
    // port (productRepository.ts header) — the "join" collapses to reading
    // the one product's own embedded primary image, matching what the
    // groupBy(p_id) (one row per product id) + the view's single
    // `$row->p_image` reference (checkout-buy-product.blade.php:200)
    // actually renders: exactly one product-image row shown, not the full
    // gallery.
    getProduct: [
      {
        pSlug: product.pSlug,
        pName: product.pName,
        pImage: product.pBestimg,
        pPrice: product.pPrice,
      },
    ],
  };
}

/* ============================================================================
 * SuccessOrder(Request $req) — HomeController.php:488-564. LIVE-orphan
 * legacy single-item order. Uses the DEAD '1200'+$id NUMERIC ADDITION
 * order-id scheme (contract §10.4) — must produce the same NUMERIC result,
 * not string concatenation.
 * ============================================================================
 */

export interface SuccessOrderInput {
  buyerLegacyId: number;
  pid: number;
  pinCode: string | null;
  fullAddress: string | null;
  houseNo: string | null;
  landmark: string | null;
  state: string | null;
  country: string | null;
  bid: string | null;
  sid: string | null;
  ptype: string | null;
  orderNotes: string | null;
  shippingTimeDays: number;
}

export interface SuccessOrderResult {
  row: {
    name: string;
    deliveryDate: string;
    amount: number | null;
    orderId: number;
    payMode: string;
    orderDate: string;
    fullAddress: string | null;
    pinCode: string | null;
    state: string | null;
    country: string | null;
    houseNo: string | null;
    landmark: string | null;
    mobile: string | null;
  } | null;
}

/**
 * Mirrors `HomeController::SuccessOrder` in full (`HomeController.php:488-564`).
 *
 * ORDER ID — CONTRACT §10.4 CASE: `$orderId='1200'+$lastId;` — PHP's `+`
 * operator here performs NUMERIC ADDITION (PHP coerces the string `'1200'`
 * to the integer `1200`), NOT string concatenation — `'1200' + 5` yields
 * the number `1205`, not the string `"12005"`. Reproduced below as
 * `1200 + lastId` (plain JS numeric addition), matching the REQUIRED
 * numeric result per contract §10.4's own worked example for this exact
 * construct — explicitly the DEAD legacy scheme, distinct from
 * `cartOrderId.ts`'s `getOrderId` (which IS string concatenation, a
 * different, LIVE scheme — see that file's own header for the
 * disambiguation).
 *
 * `$deliveryDate = Carbon::now()->addDays($shipping_time)` — reproduced
 * with plain `Date` arithmetic (no Carbon equivalent needed for a single
 * `addDays`).
 */
export async function successOrderLegacy(
  db: Db,
  input: SuccessOrderInput
): Promise<SuccessOrderResult> {
  const users = new UserRepository(db);
  const products = new ProductRepository(db);
  const orders = new OrderRepository(db);
  const payments = new PaymentRepository(db);
  const baskets = new BasketRepository(db);
  const sellerPayments = new SellerPaymentRepository(db);

  const product = await products.findByLegacyId(input.pid);
  // HomeController.php:513-517 — $getProduct->p_quantity/.../uid/p_price
  // dereferenced with NO null guard on a non-matching $pid — same
  // unreproducible-fatal class as BuyProduct above. A non-matching pid
  // returns `{ row: null }` here for the caller to render as a failure,
  // the closest faithful "this doesn't resolve" outcome.
  if (!product) return { row: null };

  const sellPrice = product.pPrice ?? 0;
  const quantity = 1;
  const totalPrice = quantity * sellPrice;

  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + input.shippingTimeDays);

  const lastId = (await orders.findHighestLegacyId()) ?? 0;
  const orderIdNumeric = 1200 + lastId; // contract §10.4 — numeric addition, not string concat
  const orderStatus = 1;
  const oredrDate = formatDMY(new Date()); // sic — source's own variable name, preserved

  const basketLegacyId = lastId + 1; // HomeController.php:527 — $basketId=$lastId+1 (NOT a
  // freshly-generated basket legacyId — source reuses the ORDERS table's
  // next id as the basket's own id, a cross-collection id reuse, preserved
  // verbatim even though it has no relationship to `baskets`' own
  // AUTO_INCREMENT sequence in source either)
  const payMode = 'Cash on Delivery';
  const payStatus = 0;
  // HomeController.php:530 — '$fee=($TotalPrice*5)/100;' — NO round() call, unlike the LIVE
  // path's 'AdminFee=round($totalAmount*5/100)' (saveOrder/redirectToPaymentMethod). The
  // blueprint's own §7.4 documents this DEAD path's fee formula as unrounded — reproduced
  // WITHOUT rounding, matching source exactly (not unified with the live path's rounding).
  const feeUnrounded = (totalPrice * 5) / 100;
  const tax = 0;
  const discount = 0;
  const payable = totalPrice - feeUnrounded;

  // HomeController.php:536-537 — buyer_profile update (only, no else-insert
  // branch — same shape as saveOrder's block, verified directly).
  const existingUser = await users.findByLegacyId(input.buyerLegacyId);
  if (existingUser?.buyerProfile) {
    await users.upsertBuyerProfileByLegacyId(input.buyerLegacyId, {
      pinCode: input.pinCode,
      fullAddress: input.fullAddress,
      houseNo: input.houseNo,
      landmark: input.landmark,
      state: input.state,
      country: input.country ?? '',
    });
  }

  const now = new Date();
  const basketDoc = {
    legacyId: await baskets.nextLegacyId(),
    basketId: basketLegacyId,
    custId: input.buyerLegacyId,
    sellerId: product.uid,
    pid: input.pid,
    quantity,
    sellPrice: String(sellPrice),
    totalPrice,
    orderId: orderIdNumeric,
    orderNotes: input.orderNotes,
    orderStatus,
    payMode,
    orderDate: oredrDate,
    deliveryDate: deliveryDate.toISOString(),
    createdAt: now,
    updatedAt: now,
  };
  const insertedBasket = await baskets.insertBasket(basketDoc);

  const orderDoc: Order = {
    legacyId: await orders.nextLegacyId(),
    qrTransectionId: '', // SuccessOrder never sets this NOT-NULL-with-no-default column —
    // same best-effort-port caveat as saveOrderLegacy's identical note above
    custId: input.buyerLegacyId,
    sellerId: product.uid,
    groupId: null,
    productId: null,
    quantity: null,
    sellPrice: null,
    deliveryPrice: null,
    totalPrice,
    orderId: orderIdNumeric,
    orderNotes: input.orderNotes,
    orderStatus,
    payMode,
    orderDate: oredrDate,
    deliveryDate: deliveryDate.toISOString(),
    createdAt: now,
    updatedAt: now,
  };
  await orders.insertOrder(orderDoc);

  const paymentDoc: Payment = {
    legacyId: await payments.nextLegacyId(),
    pid: null,
    qunt: null,
    gid: null,
    cid: input.buyerLegacyId,
    sid: product.uid,
    amount: totalPrice,
    totalAmount: null,
    orderId: String(orderIdNumeric),
    payStatus,
    orderStatus,
    adminFee: null,
    sellerPay: null,
    discount: null,
    payMode,
    payDate: null,
    createdAt: now,
    updatedAt: now,
  };
  await payments.insertPayment(paymentDoc);

  const sellerPaymentDoc = {
    legacyId: await sellerPayments.nextLegacyId(),
    uid: product.uid,
    bid: insertedBasket.basketId,
    amount: String(totalPrice),
    fee: String(feeUnrounded),
    tax: String(tax),
    discount: String(discount),
    payable: String(payable),
    orderId: String(orderIdNumeric),
    payStatus: String(payStatus),
    orderStatus,
    payMode,
    payDate: null,
    createdAt: now,
    updatedAt: now,
  };
  await sellerPayments.insertSellerPayment(sellerPaymentDoc);

  // HomeController.php:555-563 — read-back join for the confirmation view.
  // Source joins users+buyer_profile+orders(on cust_id)+payments(on cid),
  // ORDER BY orders.id DESC, payments.id DESC, first(). Reconstructed here
  // directly from the values just written (equivalent result for the
  // single row this request itself just inserted — no concurrent writer
  // could have inserted a newer orders/payments row for this exact
  // buyer between the inserts above and this read in the same request).
  const freshUser = await users.findByLegacyId(input.buyerLegacyId);

  return {
    row: {
      name: freshUser?.name ?? '',
      deliveryDate: deliveryDate.toISOString(),
      amount: totalPrice,
      orderId: orderIdNumeric,
      payMode,
      orderDate: oredrDate,
      fullAddress: freshUser?.buyerProfile?.fullAddress ?? input.fullAddress,
      pinCode: freshUser?.buyerProfile?.pinCode ?? input.pinCode,
      state: freshUser?.buyerProfile?.state ?? input.state,
      country: freshUser?.buyerProfile?.country ?? input.country,
      houseNo: freshUser?.buyerProfile?.houseNo ?? input.houseNo,
      landmark: freshUser?.buyerProfile?.landmark ?? input.landmark,
      mobile: freshUser?.mobile ?? null,
    },
  };
}

/** Mirrors PHP `date('d M, Y')` — e.g. "31 Aug, 2026". Used by both
 * `SuccessOrder` (`$oredrDate`, sic) and reused nowhere else (each
 * near-duplicate date-format call site in source is ported independently
 * per contract §5.2 — `redirectToPaymentMethod`'s own `OrderDate` uses
 * `now()`, a full timestamp, a DIFFERENT format, not this one). */
function formatDMY(date: Date): string {
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  return `${day} ${month}, ${year}`;
}
