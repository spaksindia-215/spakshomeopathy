/**
 * CR-006 Phase 5 backfill — sets `diseaseCategoryIds` on every existing
 * `products` document that doesn't already have it.
 *
 * ============================================================================
 * THIS SCRIPT WAS WRITTEN BUT NOT EXECUTED AGAINST ANY REAL DATABASE THIS
 * PHASE — per the owner's explicit instruction (docs/CR-006-PHASE-5-PLAN.md
 * §7.3, answered 2026-09-15: "write it, but don't run it yet"). Running it
 * for real requires a SEPARATE, later, explicit go-ahead after the dry-run
 * output has been reviewed.
 * ============================================================================
 *
 * WHAT IT DOES: for every `products` document where `diseaseCategoryIds`
 * is absent, sets it to `[pCat]` (or `[]` if `pCat` is null) — see
 * `schemas/product.ts`'s own doc comment on the field for the full
 * justification (this preserves every product's EXISTING single-disease
 * association exactly, while making the new multi-disease field usable).
 *
 * IDEMPOTENT: a document that already has `diseaseCategoryIds` (whether
 * from a prior real run of this script, or set directly by a future admin
 * UI) is left untouched — the query filter is
 * `{ diseaseCategoryIds: { $exists: false } }`. Running this script twice
 * produces the same end state as running it once; the second run's
 * dry-run report will show zero remaining changes.
 *
 * SAFETY GATES, BOTH REQUIRED, NEITHER WEAKENED — same as
 * `migrate-to-mongodb.ts` (M3-C §12, "NON-NEGOTIABLE", carried forward
 * unchanged for every write-capable script since):
 *   1. `assertNonProductionTarget()` — independently inspects the URI/
 *      db-name for production-looking content.
 *   2. `getDb()`'s own `MONGODB_ENV=production` guard.
 * Both run BEFORE any write; `--dry-run` (the default — see below) never
 * reaches either gate at all, since it never constructs a MongoClient.
 *
 * USAGE:
 *   tsx scripts/backfill-disease-category-ids.ts              # dry run (default)
 *   tsx scripts/backfill-disease-category-ids.ts --dry-run    # dry run (explicit)
 *   tsx scripts/backfill-disease-category-ids.ts --execute    # REAL WRITE — requires explicit flag
 */

import { config as loadDotenv } from 'dotenv';
import { resolve } from 'path';

loadDotenv({ path: resolve(__dirname, '../.env') });
loadDotenv({ path: resolve(__dirname, '../.env.local'), override: true });

import { assertNonProductionTarget } from '../src/lib/mongodb/environmentGuard';
import { getDb } from '../src/lib/mongodb/client';
import { ProductRepository } from '../src/lib/mongodb/repositories/productRepository';
import { COLLECTIONS } from '../src/lib/mongodb/collections';
import { diseaseCategoryIdsFor } from '../src/lib/mongodb/diseaseCategoryBackfill';
import type { Product } from '../src/lib/mongodb/schemas';

async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes('--execute');
  const dryRun = !execute; // dry-run is the DEFAULT — a real write requires the explicit flag

  console.log('='.repeat(70));
  console.log(
    dryRun
      ? 'CR-006 PHASE 5 BACKFILL — DRY RUN (report only, no write)'
      : 'CR-006 PHASE 5 BACKFILL — EXECUTING REAL WRITE'
  );
  if (dryRun) {
    console.log('No MongoDB write will be attempted. Pass --execute to perform the real backfill');
    console.log('(after reviewing this report and obtaining separate, explicit approval).');
  }
  console.log('='.repeat(70));

  // GATE 1 of 2 — runs even in dry-run mode here, deliberately: unlike
  // migrate-to-mongodb.ts's dry-run (which never connects at all, since
  // it operates purely on a source SQL dump already on disk), THIS
  // script's dry-run still needs to READ the real `products` collection
  // to produce an accurate report of what WOULD change — so a connection
  // is unavoidable even for the read-only path. Both gates apply
  // identically regardless of --execute, since a connection is made
  // either way; only the WRITE at the end is skipped in dry-run mode.
  console.log('\n[1/2] Checking positive non-production identification...');
  const identification = assertNonProductionTarget();
  console.log(`  ✓ Identified as non-production: ${identification.reason}`);
  console.log(`  ✓ Target database: ${identification.checkedDbName}`);

  console.log('\n[2/2] Connecting (production-flag guard applies here)...');
  const db = await getDb();
  console.log('  ✓ Connected.');

  const repo = new ProductRepository(db);

  // Read ALL products missing the field — same "no diseaseCategoryIds
  // key at all" filter the real update will use, so the dry-run report
  // and the real run operate on an identical candidate set.
  const collection = db.collection<Product>(COLLECTIONS.products);
  const missingField = await collection
    .find({ diseaseCategoryIds: { $exists: false } } as Parameters<typeof collection.find>[0])
    .toArray();

  console.log(`\nProducts missing diseaseCategoryIds: ${missingField.length}`);

  let wouldSetFromPCat = 0;
  let wouldSetEmpty = 0;
  for (const doc of missingField) {
    if (diseaseCategoryIdsFor(doc.pCat).length > 0) {
      wouldSetFromPCat += 1;
    } else {
      wouldSetEmpty += 1;
    }
  }
  console.log(`  Would set diseaseCategoryIds = [pCat]: ${wouldSetFromPCat}`);
  console.log(`  Would set diseaseCategoryIds = []    : ${wouldSetEmpty} (pCat is null)`);

  if (dryRun) {
    console.log('\n' + '='.repeat(70));
    console.log('DRY-RUN COMPLETE. NO WRITE OCCURRED.');
    console.log('='.repeat(70));
    return;
  }

  console.log('\nWriting...');
  let updated = 0;
  for (const doc of missingField) {
    const diseaseCategoryIds = diseaseCategoryIdsFor(doc.pCat);
    await repo.updateOne({ legacyId: doc.legacyId }, { diseaseCategoryIds });
    updated += 1;
  }

  console.log('\n' + '='.repeat(70));
  console.log(`BACKFILL COMPLETE. ${updated} product(s) updated.`);
  console.log('='.repeat(70));
}

main().catch((error) => {
  console.error('\nBackfill failed:', error);
  process.exitCode = 1;
});
