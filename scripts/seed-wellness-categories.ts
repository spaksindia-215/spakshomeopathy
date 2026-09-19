/**
 * CR-006 Phase 6 seed — populates the `wellnessCategories` collection
 * (Herbs Store parallel model, `<db>_herbs` database) with the 13
 * existing entries from the static `WELLNESS_CATEGORIES` constant
 * (`src/lib/herbs/data/taxonomy.ts`), so every existing herb document's
 * `wellnessCategories` array keeps resolving to a real, matching
 * category document once the admin UI/public pages switch to reading
 * from the database (see `docs/CR-006-PHASE-6-PLAN.md` §2.1).
 *
 * NOT RUN AUTOMATICALLY. Requires explicit, separate approval after the
 * dry-run output has been reviewed — same discipline as Phase 5's
 * `backfill-disease-category-ids.ts`.
 *
 * IDEMPOTENT: uses `WellnessCategoryRepository.upsert` (upsert-by-`key`),
 * so running this script twice leaves the same 13 documents in place —
 * the second dry-run reports the same 13 "would create/update" entries
 * only if the documents were never actually written; once written for
 * real, a later dry-run against unchanged seed data would report the
 * upserts as no-ops in substance, though this script does not attempt to
 * diff field-by-field before reporting (Mongo's `updateOne` upsert
 * itself is what makes repeats safe, not this script's reporting).
 *
 * SAFETY GATES: this script writes to the Herbs Store's OWN, separate
 * `<db>_herbs` database (`getHerbsDbConfig()`), not the legacy migration
 * database — so `assertNonProductionTarget()` (which reads
 * `getMongoConfig()`, the legacy config) does not apply directly. Uses
 * `identifyEnvironment()` (the same underlying check, generic over
 * uri/dbName) against the Herbs Store's own config instead, plus
 * `getHerbsDb()`'s own `HerbsProductionConnectionBlockedError` guard —
 * both gates run before any write, neither weakened.
 *
 * USAGE:
 *   tsx scripts/seed-wellness-categories.ts              # dry run (default)
 *   tsx scripts/seed-wellness-categories.ts --dry-run    # dry run (explicit)
 *   tsx scripts/seed-wellness-categories.ts --execute    # REAL WRITE — requires explicit flag
 */

import { config as loadDotenv } from 'dotenv';
import { resolve } from 'path';

loadDotenv({ path: resolve(__dirname, '../.env') });
loadDotenv({ path: resolve(__dirname, '../.env.local'), override: true });

import { identifyEnvironment, UnidentifiedEnvironmentError } from '../src/lib/mongodb/environmentGuard';
import { getHerbsDb } from '../src/lib/herbs/db/client';
import { getHerbsDbConfig } from '../src/lib/herbs/db/config';
import { WellnessCategoryRepository } from '../src/lib/herbs/db/wellnessCategoryRepository';
import { WELLNESS_CATEGORIES } from '../src/lib/herbs/data/taxonomy';
import type { WellnessCategoryDoc } from '../src/lib/herbs/db/wellnessCategorySchema';

function assertHerbsNonProductionTarget() {
  const config = getHerbsDbConfig();
  if (!config) {
    throw new Error(
      'Herbs Store database is not configured (MONGODB_URI / MONGODB_DB_NAME / MONGODB_ENV).'
    );
  }
  const identification = identifyEnvironment(config.uri, config.dbName);
  if (!identification.identifiedAsNonProduction) {
    throw new UnidentifiedEnvironmentError(identification.reason);
  }
  return identification;
}

async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes('--execute');
  const dryRun = !execute;

  console.log('='.repeat(70));
  console.log(
    dryRun
      ? 'CR-006 PHASE 6 WELLNESS CATEGORY SEED — DRY RUN (report only, no write)'
      : 'CR-006 PHASE 6 WELLNESS CATEGORY SEED — EXECUTING REAL WRITE'
  );
  if (dryRun) {
    console.log('No MongoDB write will be attempted. Pass --execute to perform the real seed');
    console.log('(after reviewing this report and obtaining separate, explicit approval).');
  }
  console.log('='.repeat(70));

  console.log('\n[1/2] Checking positive non-production identification (Herbs Store DB)...');
  const identification = assertHerbsNonProductionTarget();
  console.log(`  ✓ Identified as non-production: ${identification.reason}`);
  console.log(`  ✓ Target database: ${identification.checkedDbName}`);

  console.log('\n[2/2] Connecting (production-flag guard applies here)...');
  const db = await getHerbsDb();
  console.log('  ✓ Connected.');

  const repo = new WellnessCategoryRepository(db);
  const existing = await repo.findAll();
  const existingKeys = new Set(existing.map((c) => c.key));

  console.log(`\nExisting wellnessCategories documents: ${existing.length}`);
  console.log(`Static WELLNESS_CATEGORIES entries: ${WELLNESS_CATEGORIES.length}`);

  const now = new Date().toISOString();
  const toCreate = WELLNESS_CATEGORIES.filter((c) => !existingKeys.has(c.key));
  const toUpdate = WELLNESS_CATEGORIES.filter((c) => existingKeys.has(c.key));

  console.log(`  Would create: ${toCreate.length}`);
  console.log(`  Would update (already present, re-upserted): ${toUpdate.length}`);

  if (dryRun) {
    console.log('\n' + '='.repeat(70));
    console.log('DRY-RUN COMPLETE. NO WRITE OCCURRED.');
    console.log('='.repeat(70));
    return;
  }

  console.log('\nWriting...');
  let written = 0;
  for (const [index, c] of WELLNESS_CATEGORIES.entries()) {
    const doc: WellnessCategoryDoc = {
      key: c.key,
      label: c.label,
      description: c.description,
      icon: c.icon,
      sortOrder: index,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    await repo.upsert(doc);
    written += 1;
  }

  console.log('\n' + '='.repeat(70));
  console.log(`SEED COMPLETE. ${written} wellness categor${written === 1 ? 'y' : 'ies'} written.`);
  console.log('='.repeat(70));
}

main().catch((error) => {
  console.error('\nSeed failed:', error);
  process.exitCode = 1;
});
