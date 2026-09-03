/**
 * MongoDB connection for the Herbs Store, isolated from
 * `@/lib/mongodb/client.ts`'s legacy-migration connection singleton.
 *
 * Mirrors that module's shape and safety guards deliberately (lazy
 * connect, production-write guard) rather than importing it directly:
 * the legacy client's singleton `Db` is pinned to `MONGODB_DB_NAME`
 * (the migration's database); this one is pinned to
 * `getHerbsDbConfig()`'s separate `<name>_herbs` database. Sharing one
 * client instance across two different logical databases would work
 * technically, but keeping them structurally separate matches CR-003
 * §10.5's "parallel model" decision and avoids ever having Herbs Store
 * code touch the migration's `Db` handle by accident.
 */

import { MongoClient, type Db } from 'mongodb';
import { getHerbsDbConfig } from './config';

let client: MongoClient | undefined;
let db: Db | undefined;

export class HerbsDbNotConfiguredError extends Error {
  constructor() {
    super(
      'Herbs Store database is not configured (MONGODB_URI / MONGODB_DB_NAME / ' +
        'MONGODB_ENV not set). Callers should check getHerbsDbConfig() / ' +
        'isHerbsDbConfigured() first and fall back to the static demo catalogue ' +
        '(@/lib/herbs/queries) rather than calling this directly.'
    );
    this.name = 'HerbsDbNotConfiguredError';
  }
}

/** Same production-write safety guard as the legacy client — see that
 * module's `ProductionConnectionBlockedError` for the full rationale. */
export class HerbsProductionConnectionBlockedError extends Error {
  constructor() {
    super(
      'Refusing to connect Herbs Store DB: MONGODB_ENV=production but ' +
        'MONGODB_ALLOW_PRODUCTION is not "true". Connecting to production requires ' +
        "explicit, separate authorization, same as the legacy migration's guard."
    );
    this.name = 'HerbsProductionConnectionBlockedError';
  }
}

// Re-exported for backward compatibility with existing imports from this
// module — the canonical definition lives in `./config` (see that file),
// which callers that only need the boolean should prefer since it avoids
// importing the MongoDB driver at all.
export { isHerbsDbConfigured } from './config';

/**
 * Fast-fail timeout (ms). This is the Herbs Store's OWN, isolated
 * connection — deliberately NOT sharing the legacy migration client's
 * (unbounded) settings. Discovered directly this session: with the
 * driver's default ~30s `serverSelectionTimeoutMS`, every `/herbs/**`
 * page load blocked for 10-37 seconds when `MONGODB_*` was configured
 * (this repo's real `.env.local`, per D-11) but unreachable from this
 * sandbox — `readHerbProductsFromDb()`'s try/catch still degraded
 * correctly to the static catalogue, but only after that full hang,
 * which is unacceptable page-load latency for a feature whose entire
 * design goal is "fall back gracefully, fast." A short, explicit timeout
 * here makes the fallback fast, not just eventually-correct.
 */
const CONNECT_TIMEOUT_MS = 3000;

async function getHerbsMongoClient(): Promise<MongoClient> {
  if (client) return client;
  const config = getHerbsDbConfig();
  if (!config) throw new HerbsDbNotConfiguredError();
  if (config.env === 'production' && !config.allowProduction) {
    throw new HerbsProductionConnectionBlockedError();
  }
  // Held in a local until `.connect()` succeeds — assigning the
  // module-level singleton only on success means a failed attempt (e.g.
  // this sandbox's unreachable Atlas cluster) doesn't pin a broken client
  // in place; the next call retries cleanly instead of reusing it.
  const candidate = new MongoClient(config.uri, {
    serverSelectionTimeoutMS: CONNECT_TIMEOUT_MS,
    connectTimeoutMS: CONNECT_TIMEOUT_MS,
  });
  await candidate.connect();
  client = candidate;
  return client;
}

/** Returns the Herbs Store's `Db` handle, connecting on first use. Throws
 * `HerbsDbNotConfiguredError` if no database is configured — check
 * `isHerbsDbConfigured()` first in any code path that must degrade
 * gracefully (e.g. public storefront pages). */
export async function getHerbsDb(): Promise<Db> {
  if (db) return db;
  const c = await getHerbsMongoClient();
  const config = getHerbsDbConfig();
  // config is non-null here: getHerbsMongoClient() would have thrown above otherwise.
  db = c.db(config!.dbName);
  return db;
}

export async function closeHerbsMongoClient(): Promise<void> {
  if (!client) return;
  await client.close();
  client = undefined;
  db = undefined;
}
