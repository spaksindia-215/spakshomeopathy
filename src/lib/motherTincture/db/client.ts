/**
 * MongoDB connection for the Mother Tincture admin-add feature, isolated
 * from `@/lib/mongodb/client.ts`'s legacy-migration connection singleton
 * AND from `@/lib/herbs/db/client.ts`'s Herbs Store connection.
 *
 * Mirrors both of those modules' shape and safety guards deliberately
 * (lazy connect, production-write guard, fast-fail timeout) rather than
 * importing either directly — same "parallel model" rationale as
 * `@/lib/herbs/db/client.ts`'s own header, extended one level further so
 * Mother Tincture admin-add code never touches the Herbs Store's `Db`
 * handle by accident either.
 */

import { MongoClient, type Db } from 'mongodb';
import { getMotherTinctureDbConfig } from './config';

let client: MongoClient | undefined;
let db: Db | undefined;

export class MotherTinctureDbNotConfiguredError extends Error {
  constructor() {
    super(
      'Mother Tincture database is not configured (MONGODB_URI / MONGODB_DB_NAME / ' +
        'MONGODB_ENV not set). Callers should check getMotherTinctureDbConfig() / ' +
        'isMotherTinctureDbConfigured() first and fall back to the real curated ' +
        'catalogue (@/lib/homeopathy/queries) rather than calling this directly.'
    );
    this.name = 'MotherTinctureDbNotConfiguredError';
  }
}

/** Same production-write safety guard as the legacy client and the Herbs
 * Store client — see `@/lib/mongodb/client.ts`'s
 * `ProductionConnectionBlockedError` for the full rationale. */
export class MotherTintureProductionConnectionBlockedError extends Error {
  constructor() {
    super(
      'Refusing to connect Mother Tincture DB: MONGODB_ENV=production but ' +
        'MONGODB_ALLOW_PRODUCTION is not "true". Connecting to production requires ' +
        "explicit, separate authorization, same as the legacy migration's guard."
    );
    this.name = 'MotherTintureProductionConnectionBlockedError';
  }
}

export { isMotherTinctureDbConfigured } from './config';

/** Fast-fail timeout (ms) — same rationale as `@/lib/herbs/db/client.ts`'s
 * own `CONNECT_TIMEOUT_MS`: this is a deliberately isolated, short-timeout
 * connection so an unreachable/misconfigured cluster degrades the public
 * storefront fast, not after the driver's default ~30s hang. */
const CONNECT_TIMEOUT_MS = 3000;

async function getMotherTinctureMongoClient(): Promise<MongoClient> {
  if (client) return client;
  const config = getMotherTinctureDbConfig();
  if (!config) throw new MotherTinctureDbNotConfiguredError();
  if (config.env === 'production' && !config.allowProduction) {
    throw new MotherTintureProductionConnectionBlockedError();
  }
  // Held in a local until `.connect()` succeeds — see
  // `@/lib/herbs/db/client.ts`'s identical comment for why.
  const candidate = new MongoClient(config.uri, {
    serverSelectionTimeoutMS: CONNECT_TIMEOUT_MS,
    connectTimeoutMS: CONNECT_TIMEOUT_MS,
  });
  await candidate.connect();
  client = candidate;
  return client;
}

/** Returns the Mother Tincture feature's `Db` handle, connecting on first
 * use. Throws `MotherTinctureDbNotConfiguredError` if no database is
 * configured — check `isMotherTinctureDbConfigured()` first in any code
 * path that must degrade gracefully (e.g. public storefront pages). */
export async function getMotherTinctureDb(): Promise<Db> {
  if (db) return db;
  const c = await getMotherTinctureMongoClient();
  const config = getMotherTinctureDbConfig();
  // config is non-null here: getMotherTinctureMongoClient() would have thrown above otherwise.
  db = c.db(config!.dbName);
  return db;
}

export async function closeMotherTinctureMongoClient(): Promise<void> {
  if (!client) return;
  await client.close();
  client = undefined;
  db = undefined;
}
