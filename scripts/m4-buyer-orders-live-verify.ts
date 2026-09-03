/**
 * M4 buyer-orders slice — live `spaks_dev` verification, NOT a permanent
 * migration/seed script.
 *
 * Owner-authorized (this session, "M4 — BUYER ORDERS SLICE / B-12
 * DECISION") to prove `getBuyerManageOrdersView`/`getBuyerOrderDetail`/
 * `cancelBuyerOrder` (src/lib/services/orderService.ts) work end-to-end
 * against REAL `spaks_dev` data, not just fake-Db unit tests. Follows the
 * exact precedent of `scripts/m4-auth-live-verify.ts` (self-cleaning,
 * throwaway test data, real production guard reused unmodified).
 *
 * READ-ONLY PART: queries REAL, EXISTING buyer order data (two different
 * real buyers, confirmed to have order history in a prior read-only
 * exploration this session) to prove `getBuyerManageOrdersView` and
 * `getBuyerOrderDetail` reconstruct correctly against actual production-
 * shaped data, AND that buyer A genuinely cannot see buyer B's order
 * through this code path. No writes in this part.
 *
 * MUTATION PART (cancel-order): per the task's explicit instruction
 * ("use a dedicated disposable test order/account where possible"), this
 * part inserts a SYNTHETIC, clearly-marked throwaway order (a very high
 * GroupId/legacyId far outside real data's range, a fictitious buyerId
 * that doesn't correspond to a real user) into `orders`/`orderProducts`/
 * `payments`, exercises `cancelBuyerOrder` against it (both the
 * wrong-owner-rejected and correct-owner-succeeds paths), then DELETES
 * all three inserted documents. It NEVER touches any real order
 * belonging to a real buyer.
 */

import { config as loadDotenv } from 'dotenv';
import { resolve } from 'path';

loadDotenv({ path: resolve(__dirname, '../.env') });
loadDotenv({ path: resolve(__dirname, '../.env.local'), override: true });

import { assertNonProductionTarget } from '../src/lib/mongodb/environmentGuard';
import { getDb, closeMongoClient } from '../src/lib/mongodb/client';
import { COLLECTIONS } from '../src/lib/mongodb/collections';
import {
  getBuyerManageOrdersView,
  getBuyerOrderDetail,
  cancelBuyerOrder,
} from '../src/lib/services/orderService';

// Real buyers confirmed (read-only exploration, this session) to have
// order history in spaks_dev: buyerId 102 (11 lines / 8 GroupIds),
// buyerId 19 (3 lines / 3 GroupIds). Used READ-ONLY below.
const REAL_BUYER_A = 102;
const REAL_BUYER_B = 19;

// Synthetic, clearly-out-of-range throwaway values for the mutation test
// — chosen far above any real legacyId/GroupId/buyerId seen in spaks_dev
// (confirmed real data tops out in the low hundreds/thousands) so there
// is zero chance of colliding with a real record.
const THROWAWAY_GROUP_ID = 90000001;
const THROWAWAY_ORDER_LEGACY_ID = 90000001;
const THROWAWAY_LINE_LEGACY_ID = 90000001;
const THROWAWAY_PAYMENT_LEGACY_ID = 90000001;
const THROWAWAY_BUYER_ID = 90000001;
const WRONG_BUYER_ID = 90000002;

async function main() {
  assertNonProductionTarget();
  const db = await getDb();

  console.log('--- M4 buyer-orders live verify against spaks_dev ---');

  // ===========================================================================
  // PART 1 — READ-ONLY, against REAL existing buyer order data.
  // ===========================================================================
  console.log(`[1/6] getBuyerManageOrdersView() for REAL buyer ${REAL_BUYER_A}...`);
  const rowsA = await getBuyerManageOrdersView(db, REAL_BUYER_A);
  console.log(`  rows returned: ${rowsA.length}`);
  if (rowsA.length === 0) throw new Error(`expected real order rows for buyer ${REAL_BUYER_A}`);
  console.log('  sample row:', JSON.stringify(rowsA[0]));
  const sampleGroupId = rowsA[0]!.groupId;

  console.log(
    `[2/6] getBuyerOrderDetail() — buyer ${REAL_BUYER_A} views their OWN order ${sampleGroupId}...`
  );
  const ownDetail = await getBuyerOrderDetail(db, sampleGroupId, REAL_BUYER_A);
  if (!ownDetail) throw new Error('expected buyer to see their own real order');
  console.log(
    `  order found, groupId=${ownDetail.order.groupId}, lines=${ownDetail.lines.length}, payments=${ownDetail.payments.length}`
  );
  console.log(
    `  line product join: ${ownDetail.lines[0]?.product ? 'product found (' + ownDetail.lines[0]!.product!.pName + ')' : 'no product match'}`
  );

  console.log(
    `[3/6] getBuyerOrderDetail() — buyer ${REAL_BUYER_B} attempts buyer ${REAL_BUYER_A}'s order ${sampleGroupId} (MUST be rejected)...`
  );
  const crossBuyerDetail = await getBuyerOrderDetail(db, sampleGroupId, REAL_BUYER_B);
  if (crossBuyerDetail !== null) {
    throw new Error(
      `SECURITY FAILURE: buyer ${REAL_BUYER_B} was able to view buyer ${REAL_BUYER_A}'s order!`
    );
  }
  console.log('  confirmed: cross-buyer access correctly rejected (null).');

  console.log(
    `[4/6] getBuyerManageOrdersView() for buyer ${REAL_BUYER_B} — must NOT include buyer ${REAL_BUYER_A}'s GroupIds...`
  );
  const rowsB = await getBuyerManageOrdersView(db, REAL_BUYER_B);
  const overlap = rowsB.filter((r) => rowsA.some((ra) => ra.groupId === r.groupId));
  if (overlap.length > 0) {
    throw new Error(
      `SECURITY FAILURE: buyer ${REAL_BUYER_B}'s listing includes buyer ${REAL_BUYER_A}'s orders!`
    );
  }
  console.log(
    `  confirmed: zero overlap between the two buyers' order listings (${rowsB.length} rows for B, 0 shared with A).`
  );

  // ===========================================================================
  // PART 2 — MUTATION, against a SYNTHETIC, disposable throwaway order only.
  // ===========================================================================
  const orders = db.collection(COLLECTIONS.orders);
  const orderProducts = db.collection(COLLECTIONS.orderProducts);
  const payments = db.collection(COLLECTIONS.payments);

  // Clean up any leftover from a prior interrupted run.
  await orders.deleteMany({ legacyId: THROWAWAY_ORDER_LEGACY_ID });
  await orderProducts.deleteMany({ legacyId: THROWAWAY_LINE_LEGACY_ID });
  await payments.deleteMany({ legacyId: THROWAWAY_PAYMENT_LEGACY_ID });

  console.log('[5/6] inserting a synthetic throwaway order for the cancel-order mutation test...');
  const now = new Date();
  await orders.insertOne({
    legacyId: THROWAWAY_ORDER_LEGACY_ID,
    qrTransectionId: 'QR-M4-LIVE-VERIFY-THROWAWAY',
    custId: THROWAWAY_BUYER_ID,
    sellerId: null,
    groupId: THROWAWAY_GROUP_ID,
    productId: null,
    quantity: 1,
    sellPrice: '100',
    deliveryPrice: 0,
    totalPrice: 100,
    orderId: THROWAWAY_ORDER_LEGACY_ID,
    orderNotes: null,
    orderStatus: 1, // Confirm — a cancellable status
    payMode: 'offline_payment',
    orderDate: now.toISOString(),
    deliveryDate: null,
    createdAt: now,
    updatedAt: now,
  });
  await orderProducts.insertOne({
    legacyId: THROWAWAY_LINE_LEGACY_ID,
    groupId: THROWAWAY_GROUP_ID,
    productId: null,
    orderImage: null,
    quantity: 1,
    sellPrice: 100,
    deliveryCharge: 0,
    totalPrice: 100,
    sellerId: null,
    buyerId: THROWAWAY_BUYER_ID,
    trackingCode: null,
    delaveryDate: null,
    delaveryBy: null,
    orderStatus: 1,
    createdAt: now,
    updatedAt: now,
  });
  await payments.insertOne({
    legacyId: THROWAWAY_PAYMENT_LEGACY_ID,
    pid: null,
    qunt: 1,
    gid: THROWAWAY_GROUP_ID,
    cid: THROWAWAY_BUYER_ID,
    sid: null,
    amount: 100,
    totalAmount: 100,
    orderId: String(THROWAWAY_ORDER_LEGACY_ID),
    payStatus: 0,
    orderStatus: 1,
    adminFee: 5,
    sellerPay: 95,
    discount: 0,
    payMode: 'offline_payment',
    payDate: '',
    createdAt: now,
    updatedAt: now,
  });
  console.log(
    `  inserted order/orderProducts/payments with GroupId=${THROWAWAY_GROUP_ID}, buyerId=${THROWAWAY_BUYER_ID}`
  );

  console.log(
    `  cancelBuyerOrder() — WRONG buyer ${WRONG_BUYER_ID} attempts to cancel (MUST be rejected)...`
  );
  const wrongCancelResult = await cancelBuyerOrder(db, THROWAWAY_GROUP_ID, WRONG_BUYER_ID);
  if (wrongCancelResult !== false) {
    throw new Error('SECURITY FAILURE: a non-owning buyer was able to cancel the throwaway order!');
  }
  const afterWrongAttempt = await orders.findOne({ groupId: THROWAWAY_GROUP_ID });
  if (afterWrongAttempt?.orderStatus !== 1) {
    throw new Error('SECURITY FAILURE: orderStatus was mutated despite the wrong-buyer rejection!');
  }
  console.log('  confirmed: wrong-buyer cancel rejected, orderStatus unchanged (still 1).');

  console.log(`  cancelBuyerOrder() — CORRECT owner ${THROWAWAY_BUYER_ID} cancels...`);
  const correctCancelResult = await cancelBuyerOrder(db, THROWAWAY_GROUP_ID, THROWAWAY_BUYER_ID);
  if (correctCancelResult !== true)
    throw new Error('expected the owning buyer to successfully cancel');
  const afterCorrectCancel = await Promise.all([
    orders.findOne({ groupId: THROWAWAY_GROUP_ID }),
    orderProducts.findOne({ groupId: THROWAWAY_GROUP_ID }),
    payments.findOne({ gid: THROWAWAY_GROUP_ID }),
  ]);
  console.log(
    `  orderStatus after cancel: orders=${afterCorrectCancel[0]?.orderStatus}, orderProducts=${afterCorrectCancel[1]?.orderStatus}, payments=${afterCorrectCancel[2]?.orderStatus}`
  );
  if (
    afterCorrectCancel[0]?.orderStatus !== 4 ||
    afterCorrectCancel[1]?.orderStatus !== 4 ||
    afterCorrectCancel[2]?.orderStatus !== 4
  ) {
    throw new Error('cancelBuyerOrder did not set orderStatus=4 in all three collections');
  }
  console.log(
    '  confirmed: all three collections show orderStatus=4 (BuyerController.php:96 value).'
  );

  console.log('[6/6] deleting the synthetic throwaway order (orders/orderProducts/payments)...');
  const deleteResults = await Promise.all([
    orders.deleteOne({ legacyId: THROWAWAY_ORDER_LEGACY_ID }),
    orderProducts.deleteOne({ legacyId: THROWAWAY_LINE_LEGACY_ID }),
    payments.deleteOne({ legacyId: THROWAWAY_PAYMENT_LEGACY_ID }),
  ]);
  console.log(
    `  deleted: orders=${deleteResults[0].deletedCount}, orderProducts=${deleteResults[1].deletedCount}, payments=${deleteResults[2].deletedCount}`
  );

  console.log(
    '--- DONE. spaks_dev left in its original state (real buyer data untouched, throwaway order removed). ---'
  );
}

main()
  .catch((err) => {
    console.error('FAILED:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeMongoClient();
  });
