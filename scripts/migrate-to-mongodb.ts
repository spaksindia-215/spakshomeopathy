/**
 * M3-C migration execution — writes M3-B pipeline output to a real MongoDB
 * target.
 *
 * ============================================================================
 * THIS SCRIPT WAS NOT EXECUTED AGAINST ANY REAL DATABASE THIS PHASE.
 * See docs/GATE-REPORT-M3C.md for exactly what was and was not run, and
 * why (no non-production MongoDB target was available this session).
 * ============================================================================
 *
 * SAFETY GATES, BOTH REQUIRED, NEITHER WEAKENED (owner instruction, M3-C §12,
 * "NON-NEGOTIABLE"):
 *   1. `src/lib/mongodb/environmentGuard.ts`'s `assertNonProductionTarget()`
 *      — independently inspects the URI/db-name for production-looking
 *      content, REGARDLESS of what the env flags claim (M3-C, new).
 *      Runs FIRST, before any connection attempt.
 *   2. `src/lib/mongodb/client.ts`'s `getMongoClient()`/`getDb()` — refuses
 *      MONGODB_ENV=production without MONGODB_ALLOW_PRODUCTION=true (M3-A,
 *      unmodified)
 *
 * Owner instruction (M3-C §4): "Use the exact M3-B transformation logic.
 * Do not create a second transformation implementation." This script uses
 * `src/lib/migration/documents.ts`'s `getAcceptedDocuments`, which calls
 * the SAME extraction/transform/validation functions `runPipeline` (M3-B)
 * calls — no mapping rule is duplicated. `runPipeline` itself is ALSO
 * called here, unmodified, purely for its parity report (counts,
 * warnings, relationship issues) — see `documents.ts`'s header for why
 * document-retrieval is a separate function rather than a change to
 * `runPipeline`'s already-accepted return shape.
 *
 * --dry-run (added post-M3-C gate report, "complete the non-connection
 * work only" instruction): runs extraction, transformation, validation,
 * document generation, and parity reporting — the exact same code path a
 * real run uses up to that point — then EXITS before either safety gate
 * runs and before `getDb()`/`MongoClient` is ever constructed. This is
 * not "skip the guard and pretend it passed" — the guard functions are
 * simply never called in this branch, so there is nothing to bypass.
 * Structurally identical in spirit to `scripts/migrate.ts` (M3-B): a
 * dry run never imports/constructs a MongoClient.
 */

import { config as loadDotenv } from 'dotenv';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// CLI scripts run via `tsx` do not get Next.js's automatic `.env.local`
// loading — load it explicitly, same as `check-mongodb-connection.ts`.
loadDotenv({ path: resolve(__dirname, '../.env') });
loadDotenv({ path: resolve(__dirname, '../.env.local'), override: true });

import { runPipeline } from '../src/lib/migration/pipeline';
import { getAcceptedDocuments, type AcceptedDocuments } from '../src/lib/migration/documents';
import { renderHumanReadable } from '../src/lib/migration/verify';
import { assertNonProductionTarget } from '../src/lib/mongodb/environmentGuard';
import { getDb, closeMongoClient } from '../src/lib/mongodb/client';
import { ensureCollections } from '../src/lib/mongodb/collectionSetup';
import { ensureIndexes } from '../src/lib/mongodb/indexes';
import { ValidatedRepository } from '../src/lib/mongodb/repositories/base';
import {
  userSchema,
  productSchema,
  categorySchema,
  productCategorySchema,
  orderSchema,
  orderProductSchema,
  paymentSchema,
  appointmentSchema,
  enquirySchema,
  sliderSchema,
  pinCodeSchema,
  postSchema,
  homeopathyMasterSchema,
  blogSchema,
  blogCategorySchema,
  statezoneSchema,
  citySchema,
} from '../src/lib/mongodb/schemas';
import { COLLECTIONS } from '../src/lib/mongodb/collections';
import type { Db } from 'mongodb';
import type { ZodType } from 'zod';

interface WriteResult {
  entityName: string;
  attempted: number;
  written: number;
  failed: { legacyId: number | string; error: string }[];
}

/**
 * Writes one entity's already-validated documents via `upsertByLegacyId`
 * — the idempotent write path (M3-B `migrationState.ts`, wired into the
 * base repository this phase, `repositories/base.ts`). A per-document
 * failure is caught and recorded, NOT allowed to abort the whole entity's
 * write — per M3-C §9's failure-handling requirement (identify the bad
 * record, don't corrupt or block unrelated ones).
 */
async function writeEntity<T extends { legacyId: number | string }>(
  db: Db,
  collectionName: string,
  schema: ZodType<T>,
  documents: T[]
): Promise<WriteResult> {
  const repo = new ValidatedRepository<T>(db, collectionName, schema);
  const failed: WriteResult['failed'] = [];
  let written = 0;

  for (const doc of documents) {
    try {
      await repo.upsertByLegacyId(doc);
      written++;
    } catch (e) {
      failed.push({
        legacyId: doc.legacyId,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return { entityName: collectionName, attempted: documents.length, written, failed };
}

/** Maps each collection name to its schema, for a uniform write loop
 * below rather than 17 repeated call sites. */
function schemaFor(collection: string): ZodType<{ legacyId: number | string }> {
  const map: Record<string, ZodType<{ legacyId: number | string }>> = {
    [COLLECTIONS.users]: userSchema,
    [COLLECTIONS.products]: productSchema,
    [COLLECTIONS.categories]: categorySchema,
    [COLLECTIONS.productCategories]: productCategorySchema,
    [COLLECTIONS.orders]: orderSchema,
    [COLLECTIONS.orderProducts]: orderProductSchema,
    [COLLECTIONS.payments]: paymentSchema,
    [COLLECTIONS.appointments]: appointmentSchema,
    [COLLECTIONS.enquiries]: enquirySchema,
    [COLLECTIONS.sliders]: sliderSchema,
    [COLLECTIONS.pinCodes]: pinCodeSchema,
    [COLLECTIONS.posts]: postSchema,
    [COLLECTIONS.homeopathyMaster]: homeopathyMasterSchema,
    [COLLECTIONS.blogs]: blogSchema,
    [COLLECTIONS.blogCategories]: blogCategorySchema,
    [COLLECTIONS.statezones]: statezoneSchema,
    [COLLECTIONS.cities]: citySchema,
  };
  const schema = map[collection];
  if (!schema) throw new Error(`schemaFor: no schema registered for collection "${collection}"`);
  return schema;
}

async function main() {
  const args = process.argv.slice(2);
  const dumpFlagIndex = args.indexOf('--dump');
  const dumpPath =
    dumpFlagIndex >= 0 && args[dumpFlagIndex + 1]
      ? args[dumpFlagIndex + 1]!
      : resolve(__dirname, '../../Database/db_newhomo.sql');
  const jsonOutIndex = args.indexOf('--json');
  const jsonOutPath = jsonOutIndex >= 0 ? args[jsonOutIndex + 1] : undefined;
  const dryRun = args.includes('--dry-run');

  console.log('='.repeat(70));
  console.log(
    dryRun
      ? 'M3-C MIGRATION — DRY RUN (extraction/transform/validate/report only)'
      : 'M3-C MIGRATION EXECUTION — WRITES TO A REAL MONGODB TARGET'
  );
  if (dryRun) {
    console.log('No MongoDB connection will be attempted. No safety gate is even invoked —');
    console.log('this code path never imports a MongoClient. No data will be written anywhere.');
  }
  console.log('='.repeat(70));

  if (dryRun) {
    console.log(`\nReading source dump: ${dumpPath}`);
    const dumpText = readFileSync(dumpPath, 'utf-8');

    console.log('Running extraction + transformation + validation...');
    const extractStart = Date.now();
    const documents = getAcceptedDocuments(dumpText);
    const transformMs = Date.now() - extractStart;

    console.log('Building parity report (M3-B logic, unchanged)...');
    const report = runPipeline(dumpText);
    console.log(renderHumanReadable(report));

    const documentCounts = Object.fromEntries(
      Object.entries(documents).map(([k, v]) => [k, (v as unknown[]).length])
    );
    const totalDocuments = Object.values(documentCounts).reduce((s, n) => s + n, 0);

    console.log('\n' + '='.repeat(70));
    console.log('DRY-RUN DOCUMENT COUNTS (generated, not written)');
    for (const [entity, count] of Object.entries(documentCounts)) {
      console.log(`  ${entity}: ${count}`);
    }
    console.log(`  TOTAL: ${totalDocuments}`);
    console.log(`  Extraction + transformation + validation: ${transformMs}ms`);
    console.log('='.repeat(70));
    console.log('DRY-RUN COMPLETE. NO MONGODB CONNECTION WAS ATTEMPTED. NO WRITES OCCURRED.');
    console.log('='.repeat(70));

    if (jsonOutPath) {
      writeFileSync(
        jsonOutPath,
        JSON.stringify({ dryRun: true, report, documentCounts, totalDocuments }, null, 2),
        'utf-8'
      );
      console.log(`\nFull results written to: ${jsonOutPath}`);
    }
    return;
  }

  // GATE 1 of 2: positive non-production identification (M3-C, new).
  console.log('\n[1/2] Checking positive non-production identification...');
  const identification = assertNonProductionTarget(); // throws if not identified
  console.log(`  ✓ Identified as non-production: ${identification.reason}`);
  console.log(`  ✓ Target URI (redacted): ${identification.checkedUri}`);
  console.log(`  ✓ Target database: ${identification.checkedDbName}`);

  // GATE 2 of 2: the M3-A production-flag guard, exercised by getDb()
  // itself (throws ProductionConnectionBlockedError if MONGODB_ENV=production
  // without MONGODB_ALLOW_PRODUCTION=true).
  console.log('\n[2/2] Connecting (M3-A production-flag guard applies here)...');
  const startTime = Date.now();
  const db = await getDb();
  console.log('  ✓ Connected.');

  try {
    console.log('\nEnsuring collections exist...');
    const collectionResults = await ensureCollections(db);
    for (const r of collectionResults) {
      console.log(`  ${r.created ? 'created' : 'already existed'}: ${r.collection}`);
    }

    console.log('\nApplying approved (non-unique) indexes...');
    await ensureIndexes(db);
    console.log('  ✓ Indexes applied.');

    console.log(`\nReading source dump: ${dumpPath}`);
    const extractStart = Date.now();
    const dumpText = readFileSync(dumpPath, 'utf-8');

    console.log('Running extraction + transformation + validation...');
    const documents = getAcceptedDocuments(dumpText);
    const transformEnd = Date.now();

    console.log('Building parity report (M3-B logic, unchanged)...');
    const report = runPipeline(dumpText);
    console.log(renderHumanReadable(report));

    console.log('\nWriting validated documents (idempotent upsert by legacyId)...');
    const writeStart = Date.now();
    const writeResults: WriteResult[] = [];
    for (const [collectionName, docs] of Object.entries(documents) as [
      keyof AcceptedDocuments,
      { legacyId: number | string }[],
    ][]) {
      const schema = schemaFor(collectionName);
      const result = await writeEntity(db, collectionName, schema, docs);
      writeResults.push(result);
      console.log(
        `  ${collectionName}: ${result.written}/${result.attempted} written` +
          (result.failed.length > 0 ? `, ${result.failed.length} FAILED` : '')
      );
      for (const f of result.failed) {
        console.log(`    - legacyId=${f.legacyId}: ${f.error}`);
      }
    }
    const writeEnd = Date.now();

    const totalDocumentsProcessed = writeResults.reduce((s, r) => s + r.attempted, 0);
    const totalDocumentsWritten = writeResults.reduce((s, r) => s + r.written, 0);

    const metrics = {
      extractionAndTransformationMs: transformEnd - extractStart,
      writeMs: writeEnd - writeStart,
      totalMs: Date.now() - startTime,
      documentsProcessed: totalDocumentsProcessed,
      documentsWritten: totalDocumentsWritten,
    };

    console.log('\n' + '='.repeat(70));
    console.log('PERFORMANCE METRICS');
    console.log(`  Extraction + transformation: ${metrics.extractionAndTransformationMs}ms`);
    console.log(`  Write: ${metrics.writeMs}ms`);
    console.log(`  Total: ${metrics.totalMs}ms`);
    console.log(`  Documents processed: ${metrics.documentsProcessed}`);
    console.log(`  Documents written: ${metrics.documentsWritten}`);
    console.log('='.repeat(70));

    if (jsonOutPath) {
      writeFileSync(
        jsonOutPath,
        JSON.stringify({ report, writeResults, metrics }, null, 2),
        'utf-8'
      );
      console.log(`\nFull results written to: ${jsonOutPath}`);
    }
  } finally {
    await closeMongoClient();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error('Migration execution failed:', e);
    process.exit(1);
  });
}
