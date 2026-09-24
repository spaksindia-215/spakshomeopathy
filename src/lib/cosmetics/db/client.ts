/**
 * MongoDB connection for the Cosmetics admin-add feature, isolated from
 * `@/lib/mongodb/client.ts`'s legacy-migration connection singleton, the
 * Herbs Store's connection, and Mother Tincture's connection.
 *
 * Mirrors `@/lib/motherTincture/db/client.ts` exactly (lazy connect,
 * production-write guard, fast-fail timeout) — see that file's header for
 * the full rationale, extended one level further so Cosmetics admin-add
 * code never touches another module's `Db` handle by accident.
 */

import { MongoClient, type Db } from 'mongodb';
import { getCosmeticsDbConfig } from './config';

let client: MongoClient | undefined;
let db: Db | undefined;

export class CosmeticsDbNotConfiguredError extends Error {
  constructor() {
    super(
      'Cosmetics database is not configured (MONGODB_URI / MONGODB_DB_NAME / MONGODB_ENV not ' +
        'set). Callers should check getCosmeticsDbConfig() / isCosmeticsDbConfigured() first ' +
        'and fall back to "no cosmetics products yet" rather than calling this directly.'
    );
    this.name = 'CosmeticsDbNotConfiguredError';
  }
}

/** Same production-write safety guard as the legacy client, the Herbs
 * Store client, and the Mother Tincture client. */
export class CosmeticsProductionConnectionBlockedError extends Error {
  constructor() {
    super(
      'Refusing to connect Cosmetics DB: MONGODB_ENV=production but MONGODB_ALLOW_PRODUCTION ' +
        "is not \"true\". Connecting to production requires explicit, separate authorization, " +
        "same as the legacy migration's guard."
    );
    this.name = 'CosmeticsProductionConnectionBlockedError';
  }
}

export { isCosmeticsDbConfigured } from './config';

/** Fast-fail timeout (ms) — same rationale as the other parallel-model
 * clients' own `CONNECT_TIMEOUT_MS`. */
const CONNECT_TIMEOUT_MS = 3000;

async function getCosmeticsMongoClient(): Promise<MongoClient> {
  if (client) return client;
  const config = getCosmeticsDbConfig();
  if (!config) throw new CosmeticsDbNotConfiguredError();
  if (config.env === 'production' && !config.allowProduction) {
    throw new CosmeticsProductionConnectionBlockedError();
  }
  const candidate = new MongoClient(config.uri, {
    serverSelectionTimeoutMS: CONNECT_TIMEOUT_MS,
    connectTimeoutMS: CONNECT_TIMEOUT_MS,
  });
  await candidate.connect();
  client = candidate;
  return client;
}

/** Returns the Cosmetics feature's `Db` handle, connecting on first use.
 * Throws `CosmeticsDbNotConfiguredError` if no database is configured —
 * check `isCosmeticsDbConfigured()` first in any code path that must
 * degrade gracefully (e.g. the public storefront). */
export async function getCosmeticsDb(): Promise<Db> {
  if (db) return db;
  const c = await getCosmeticsMongoClient();
  const config = getCosmeticsDbConfig();
  db = c.db(config!.dbName);
  return db;
}

export async function closeCosmeticsMongoClient(): Promise<void> {
  if (!client) return;
  await client.close();
  client = undefined;
  db = undefined;
}
