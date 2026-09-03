/**
 * MongoDB connection smoke check — `npm run mongodb:check`.
 *
 * Added post-M3-C gate report, "complete the non-connection work only"
 * instruction (§4): a small, safe command to verify a real MongoDB target
 * is reachable BEFORE running any collection/index/migration work against
 * it. This is intentionally the ONLY script in this phase that constructs
 * a MongoClient — everything else (`migrate-to-mongodb.ts --dry-run`,
 * `migrate.ts`) is structurally incapable of connecting.
 *
 * This script was written but has never been run against a real MongoDB
 * target — there is currently no MONGODB_URI configured anywhere in this
 * environment. It will fail fast at `getMongoConfig()` (missing required
 * env var) until real, owner-supplied, non-production credentials exist
 * in `.env.local`. That failure is the CORRECT behavior, not a bug to
 * silence.
 *
 * SAFETY GATES — identical two-gate sequence as `migrate-to-mongodb.ts`,
 * neither weakened, neither skipped:
 *   1. `assertNonProductionTarget()` (M3-C `environmentGuard.ts`) — refuses
 *      to proceed unless the URI/db-name combination is POSITIVELY
 *      identified as non-production, regardless of what MONGODB_ENV claims.
 *   2. `getDb()` (M3-A `client.ts`) — refuses MONGODB_ENV=production
 *      without the separate MONGODB_ALLOW_PRODUCTION=true flag.
 *
 * OUTPUT SAFETY: only sanitized metadata is ever printed — the redacted
 * URI (via `redactUri`, which strips `user:pass@` before this script ever
 * sees the string), the database name, and pass/fail booleans. The raw
 * MONGODB_URI value, any username, and any password are never read into a
 * variable this script prints, logs, or writes to a file.
 *
 * USAGE:
 *   npm run mongodb:check
 *
 * EXIT CODE: 0 on full success (guard passed, connected, ping succeeded).
 * Non-zero on any failure, with the reason printed (never a credential).
 */

import { config as loadDotenv } from 'dotenv';
import { resolve } from 'path';

// CLI scripts run via `tsx` do not get Next.js's automatic `.env.local`
// loading (that's a Next.js dev/build-server behavior only) — load it
// explicitly here, the same as any other Node CLI would. `.env.local`
// takes precedence over `.env` if both exist, matching Next.js's own
// documented precedence order.
loadDotenv({ path: resolve(__dirname, '../.env') });
loadDotenv({ path: resolve(__dirname, '../.env.local'), override: true });

import {
  assertNonProductionTarget,
  UnidentifiedEnvironmentError,
} from '../src/lib/mongodb/environmentGuard';
import { getMongoConfig } from '../src/lib/env';
import {
  getDb,
  closeMongoClient,
  ProductionConnectionBlockedError,
} from '../src/lib/mongodb/client';

async function main() {
  console.log('='.repeat(70));
  console.log('MONGODB CONNECTION CHECK — read-only smoke test, no writes');
  console.log('='.repeat(70));

  // Step 1: load environment. A missing MONGODB_URI/MONGODB_DB_NAME/
  // MONGODB_ENV throws here, before anything else runs — fail fast, per
  // src/lib/env.ts's own documented policy.
  let envName: string;
  try {
    const config = getMongoConfig();
    envName = config.env;
    console.log(`\nMongoDB environment: ${envName}`);
  } catch (e) {
    console.log('\nEnvironment: NOT CONFIGURED');
    console.log(`  ${e instanceof Error ? e.message : String(e)}`);
    console.log('\nResult: ABORTED — no MongoDB configuration present.');
    process.exitCode = 1;
    return;
  }

  // Step 2: positive non-production identification (M3-C guard). Runs
  // BEFORE any connection attempt, same ordering as migrate-to-mongodb.ts.
  let dbName: string;
  try {
    const identification = assertNonProductionTarget();
    dbName = identification.checkedDbName;
    console.log(`Database: ${dbName}`);
    console.log(`Target host (redacted): ${identification.checkedUri}`);
    console.log('Production guard: PASSED');
  } catch (e) {
    if (e instanceof UnidentifiedEnvironmentError) {
      console.log('Production guard: FAILED');
      console.log(`  ${e.message}`);
      console.log(
        '\nResult: ABORTED — target could not be positively identified as non-production.'
      );
      process.exitCode = 1;
      return;
    }
    throw e;
  }

  // Step 3: connect + ping. getDb() itself enforces the second,
  // independent M3-A guard (ProductionConnectionBlockedError) before ever
  // constructing a MongoClient.
  try {
    // Bounded wait so an unreachable target fails fast with a clear
    // message instead of hanging on the MongoDB driver's own retry loop.
    // This timeout is local to this check script only — it does not
    // change `client.ts`'s shared MongoClient configuration, which the
    // real migration path also uses and which this script does not alter.
    const CONNECTION_TIMEOUT_MS = 10_000;
    const db = await Promise.race([
      getDb(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Connection attempt timed out after ${CONNECTION_TIMEOUT_MS}ms`)),
          CONNECTION_TIMEOUT_MS
        )
      ),
    ]);
    console.log('Connection: SUCCESS');

    await db.command({ ping: 1 });
    console.log('Ping: SUCCESS');

    console.log('\n' + '='.repeat(70));
    console.log('MONGODB CONNECTION CHECK: ALL CHECKS PASSED');
    console.log('='.repeat(70));
  } catch (e) {
    if (e instanceof ProductionConnectionBlockedError) {
      console.log('Connection: BLOCKED');
      console.log(`  ${e.message}`);
      console.log('\nResult: ABORTED — production connection guard refused this target.');
    } else {
      console.log('Connection: FAILED');
      console.log(`  ${e instanceof Error ? e.message : String(e)}`);
      console.log('\nResult: FAILED — see error above. No credential is included in this output.');
    }
    process.exitCode = 1;
  } finally {
    await closeMongoClient();
  }
}

main().catch((e) => {
  console.error('Unexpected error in connection check:', e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
