/**
 * M3-D read-only Atlas verification — NOT a migration run.
 *
 * Connects to whatever `spaks_dev` (development) database is configured in
 * `.env.local`, using the project's own two independent non-production
 * guards (`assertNonProductionTarget()` + `getDb()`'s
 * `ProductionConnectionBlockedError` check) unmodified. Performs ONLY:
 *   - listCollections()
 *   - countDocuments() per collection
 *   - listIndexes() per collection
 *   - a handful of targeted findOne()/find() read queries for known
 *     anomaly checks (orderProducts GroupId=NULL, orders.orderId type,
 *     payments.orderId, legacyId spot-check)
 *
 * NO writes, NO index creation, NO migration invocation. This script does
 * not import migrate.ts or migrate-to-mongodb.ts at all.
 */

import { config as loadDotenv } from 'dotenv';
import { resolve } from 'path';

loadDotenv({ path: resolve(__dirname, '../.env') });
loadDotenv({ path: resolve(__dirname, '../.env.local'), override: true });

import { assertNonProductionTarget } from '../src/lib/mongodb/environmentGuard';
import { getDb, closeMongoClient } from '../src/lib/mongodb/client';
import { COLLECTIONS } from '../src/lib/mongodb/collections';
import {
  proposedIndexes,
  proposedUniqueIndexesRequiringApproval,
} from '../src/lib/mongodb/indexes';

const IN_SCOPE_COLLECTIONS = [
  COLLECTIONS.users,
  COLLECTIONS.products,
  COLLECTIONS.categories,
  COLLECTIONS.productCategories,
  COLLECTIONS.orders,
  COLLECTIONS.orderProducts,
  COLLECTIONS.payments,
  COLLECTIONS.appointments,
  COLLECTIONS.enquiries,
  COLLECTIONS.sliders,
  COLLECTIONS.pinCodes,
  COLLECTIONS.posts,
  COLLECTIONS.homeopathyMaster,
  COLLECTIONS.blogs,
  COLLECTIONS.blogCategories,
  COLLECTIONS.statezones,
  COLLECTIONS.cities,
];

async function main() {
  console.log('=== M3-D read-only Atlas verification ===');
  console.log('(no writes, no index creation, no migration invoked)\n');

  assertNonProductionTarget();
  const db = await getDb();
  console.log(`Connected to database: ${db.databaseName}\n`);

  // 1. listCollections
  const liveCollections = (await db.listCollections().toArray()).map((c) => c.name).sort();
  console.log('--- Live collections (listCollections) ---');
  console.log(liveCollections.join(', '));
  console.log(`Count: ${liveCollections.length}\n`);

  const expectedSet = new Set(IN_SCOPE_COLLECTIONS);
  const liveSet = new Set(liveCollections);
  const unexpected = liveCollections.filter((c) => !expectedSet.has(c as never));
  const missing = IN_SCOPE_COLLECTIONS.filter((c) => !liveSet.has(c));
  console.log(`Unexpected collections (not in 17-collection scope): ${JSON.stringify(unexpected)}`);
  console.log(`Missing expected collections: ${JSON.stringify(missing)}\n`);

  // 2. document counts
  console.log('--- Document counts per collection ---');
  let total = 0;
  for (const name of IN_SCOPE_COLLECTIONS) {
    const count = await db.collection(name).countDocuments();
    total += count;
    console.log(`  ${name}: ${count}`);
  }
  console.log(`  TOTAL: ${total}\n`);

  // 3. indexes — check every approved index (incl. DR-04's users_email_unique,
  // approved 2026-08-21) is present, and that no OTHER unapproved unique
  // index has appeared.
  console.log('--- Index verification (all approved indexes, including DR-04) ---');
  for (const idx of proposedIndexes) {
    const indexes = await db.collection(idx.collection).listIndexes().toArray();
    const found = indexes.some(
      (i) =>
        JSON.stringify(i.key) === JSON.stringify(idx.spec) && !!i.unique === !!idx.options?.unique
    );
    console.log(
      `  ${idx.name} (${idx.collection}${idx.unique ? ', unique' : ''}): ${found ? 'PRESENT' : 'MISSING'}`
    );
  }
  console.log();
  if (proposedUniqueIndexesRequiringApproval.length > 0) {
    console.log('--- Still-unapproved unique index check ---');
    for (const idx of proposedUniqueIndexesRequiringApproval) {
      const indexes = await db.collection(idx.collection).listIndexes().toArray();
      const found = indexes.some(
        (i) => JSON.stringify(i.key) === JSON.stringify(idx.spec) && i.unique === true
      );
      console.log(`  ${idx.name}: ${found ? '❌ PRESENT (VIOLATION)' : '✅ absent, as expected'}`);
      console.log(
        `  ${idx.collection} collection actual indexes: ${JSON.stringify(indexes.map((i) => i.name))}`
      );
    }
  } else {
    console.log(
      '--- No indexes currently awaiting approval (proposedUniqueIndexesRequiringApproval is empty) ---'
    );
  }
  console.log();

  // 4. known anomaly checks
  console.log('--- Known anomaly / invariant checks ---');

  const orderProductsGroupIdNull = await db
    .collection(COLLECTIONS.orderProducts)
    .findOne({ legacyId: 1 });
  console.log(
    `  orderProducts legacyId=1 groupId: ${JSON.stringify(orderProductsGroupIdNull?.groupId)} ` +
      `(expected: null)`
  );

  const paymentsNullCount = await db
    .collection(COLLECTIONS.payments)
    .countDocuments({ orderId: null });
  const paymentsTotalCount = await db.collection(COLLECTIONS.payments).countDocuments();
  console.log(
    `  payments.orderId === null: ${paymentsNullCount}/${paymentsTotalCount} (expected: all null)`
  );

  const orderSample = await db.collection(COLLECTIONS.orders).findOne({ orderId: { $ne: null } });
  console.log(
    `  orders.orderId sample type: ${typeof orderSample?.orderId} value=${JSON.stringify(
      orderSample?.orderId
    )} (expected: number)`
  );

  const userLegacy1 = await db.collection(COLLECTIONS.users).findOne({ legacyId: 1 });
  console.log(
    `  users legacyId=1 present: ${!!userLegacy1}, email=${JSON.stringify(userLegacy1?.email)}`
  );

  await closeMongoClient();
  console.log('\n=== Done. Connection closed. No writes performed. ===');
}

main().catch((err) => {
  console.error('FAILED:', err);
  process.exitCode = 1;
});
