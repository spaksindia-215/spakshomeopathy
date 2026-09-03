/**
 * Apply the DR-04 unique index (`users.email`) to `spaks_dev` — and ONLY
 * that index.
 *
 * SCOPE: this script exists because the owner approved DR-04 Option 1
 * specifically (2026-08-21) — "create the unique users.email index,"
 * nothing broader. It deliberately does NOT call `ensureIndexes()` (which
 * would also re-touch the other 8 already-applied indexes) and does NOT
 * invoke `migrate.ts`/`migrate-to-mongodb.ts` — no migration run, no
 * document writes, no other index creation.
 *
 * SAFETY GATES: identical two-gate sequence as every other script that
 * opens a MongoClient in this project — `assertNonProductionTarget()`
 * (M3-C `environmentGuard.ts`) and `getDb()`'s
 * `ProductionConnectionBlockedError` guard (M3-A `client.ts`) — neither
 * weakened, neither skipped.
 *
 * PRE-CONDITION VERIFIED BEFORE THIS SCRIPT WAS WRITTEN (not re-verified
 * at runtime here): `docs/GATE-REPORT-M3D-PREMIGRATION.md` §2 confirmed
 * zero duplicate emails exist across the 819-row `users` dataset at every
 * normalization level — the index is expected to apply cleanly.
 * `createIndex` is idempotent: if the index already exists with this
 * exact spec, this is a no-op; if a duplicate email is somehow present
 * despite that check, MongoDB will refuse to create the index and this
 * script will report that failure rather than silently proceeding.
 *
 * USAGE: npm run mongodb:apply-dr04-index
 *
 * NAME NOTE (2026-08-31): this index was originally documented as
 * `users_email_unique`; the first run of this script (pre-2026-08-31)
 * omitted an explicit `name:` option, so MongoDB assigned the default
 * `email_1`. The owner accepted `email_1` as permanent rather than
 * dropping/recreating the live index (see
 * docs/M3-OWNER-DECISION-RECORDS.md, Addendum 2, 2026-08-31) — this
 * script's lookup below now matches that corrected name. Re-running this
 * script against the already-applied index is still a no-op (`createIndex`
 * is idempotent for an identical spec+name).
 */

import { config as loadDotenv } from 'dotenv';
import { resolve } from 'path';

loadDotenv({ path: resolve(__dirname, '../.env') });
loadDotenv({ path: resolve(__dirname, '../.env.local'), override: true });

import { assertNonProductionTarget } from '../src/lib/mongodb/environmentGuard';
import { getDb, closeMongoClient } from '../src/lib/mongodb/client';
import { COLLECTIONS } from '../src/lib/mongodb/collections';
import { proposedIndexes } from '../src/lib/mongodb/indexes';

const DR04_INDEX = proposedIndexes.find(
  (idx) => idx.collection === COLLECTIONS.users && idx.unique === true
);

async function main() {
  if (!DR04_INDEX) {
    throw new Error(
      'DR-04 users unique-email index not found in proposedIndexes — expected it to have been ' +
        'moved there as part of the DR-04 approval. Refusing to proceed against a stale/unexpected ' +
        'index list.'
    );
  }

  console.log('=== Applying DR-04 unique index (users.email) — this index ONLY ===\n');

  assertNonProductionTarget();
  const db = await getDb();
  console.log(`Connected to database: ${db.databaseName}`);
  if (db.databaseName !== 'spaks_dev') {
    throw new Error(
      `Refusing to proceed: expected database "spaks_dev", got "${db.databaseName}". ` +
        'This script is scoped to the approved development target only.'
    );
  }

  const before = await db.collection(COLLECTIONS.users).listIndexes().toArray();
  console.log(`\nusers collection indexes BEFORE: ${JSON.stringify(before.map((i) => i.name))}`);

  const resultName = await db
    .collection(DR04_INDEX.collection)
    .createIndex(DR04_INDEX.spec, DR04_INDEX.options);
  console.log(`\ncreateIndex() returned: "${resultName}"`);

  const after = await db.collection(COLLECTIONS.users).listIndexes().toArray();
  console.log(`users collection indexes AFTER: ${JSON.stringify(after.map((i) => i.name))}`);

  const applied = after.find((i) => i.name === resultName);
  console.log(`\nApplied index detail: ${JSON.stringify(applied)}`);
  console.log(
    `Unique constraint confirmed: ${applied?.unique === true ? 'YES' : 'NO — UNEXPECTED, investigate'}`
  );

  await closeMongoClient();
  console.log('\n=== Done. Connection closed. No other index or write operation performed. ===');
}

main().catch((err) => {
  console.error('FAILED:', err);
  process.exitCode = 1;
});
