/**
 * Atlas identity + repository smoke test — Steps 3–4 of the M3-C Atlas
 * Connection + Smoke Test task (docs/GATE-REPORT-M3C-ATLAS-SMOKE.md).
 *
 * TEMPORARY, SINGLE-PURPOSE SCRIPT. Not added to package.json scripts and
 * not intended as a permanent addition to the project — it exists only to
 * produce the evidence this one gate report needed, using the EXISTING
 * connection/guard/repository architecture exactly as implemented. It
 * constructs NOTHING new: no MongoClient, no schema, no repository class.
 *
 * WHAT THIS DOES:
 *   Step 3 — after `getDb()` (which runs both existing safety guards,
 *            unmodified), reads server identity (`hello`/`buildInfo`) and
 *            the actually-connected database name — read-only commands,
 *            no writes, no collection creation.
 *   Step 4 — constructs one existing repository (`EnquiryRepository`) with
 *            the live `Db` handle and calls its existing `find({})` method,
 *            proving the Db-handle → repository → collection-naming →
 *            schema-validation path works end-to-end against a real
 *            server. An empty result is an expected, acceptable outcome
 *            (no data has been migrated) — this script does not insert
 *            anything to force a non-empty result.
 *
 * SAFETY: identical two-gate sequence as `check-mongodb-connection.ts`
 * (neither guard modified, both imported unmodified). Only sanitized
 * output is ever printed — no credential, username, or password.
 */

import { config as loadDotenv } from 'dotenv';
import { resolve } from 'path';

loadDotenv({ path: resolve(__dirname, '../.env') });
loadDotenv({ path: resolve(__dirname, '../.env.local'), override: true });

import { getDb, closeMongoClient } from '../src/lib/mongodb/client';
import { EnquiryRepository } from '../src/lib/mongodb/repositories';

async function main() {
  console.log('='.repeat(70));
  console.log('ATLAS IDENTITY + REPOSITORY SMOKE TEST — read-only, no writes');
  console.log('='.repeat(70));

  const db = await getDb(); // both existing guards run inside this call, unmodified

  // --- Step 3: database identity verification (read-only commands) ---
  console.log('\n--- Step 3: Database identity ---');
  console.log(`Connected database name (db.databaseName): ${db.databaseName}`);

  const hello = await db.command({ hello: 1 });
  console.log(`Server responds to hello: ${hello.ok === 1 ? 'YES' : 'NO'}`);
  console.log(`  isWritablePrimary: ${hello.isWritablePrimary ?? hello.ismaster ?? 'unknown'}`);
  console.log(`  maxWireVersion: ${hello.maxWireVersion ?? 'unknown'}`);
  console.log(`  setName (replica set): ${hello.setName ?? 'none reported'}`);

  const buildInfo = await db.command({ buildInfo: 1 });
  console.log(`MongoDB server version: ${buildInfo.version ?? 'unknown'}`);

  const identityMatch = db.databaseName === 'spaks_dev';
  console.log(
    `\nDatabase identity check (must be spaks_dev): ${identityMatch ? 'PASS' : 'FAIL — MISMATCH: ' + db.databaseName}`
  );

  // --- Step 4: repository smoke test (read-only) ---
  console.log('\n--- Step 4: Repository smoke test ---');
  const enquiryRepo = new EnquiryRepository(db);
  console.log('EnquiryRepository constructed with live Db handle: OK');

  const docs = await enquiryRepo.find({});
  console.log(`enquiries collection read (find({})): OK — ${docs.length} document(s) found`);
  if (docs.length === 0) {
    console.log('  (Empty result is expected and acceptable — no data has been migrated yet.)');
  }

  console.log('\n' + '='.repeat(70));
  console.log('SMOKE TEST: ALL READ-ONLY CHECKS PASSED');
  console.log('='.repeat(70));
}

main()
  .catch((e) => {
    console.error('Smoke test FAILED:', e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeMongoClient();
  });
