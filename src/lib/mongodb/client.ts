/**
 * MongoDB connection layer.
 *
 * M3-A SCOPE (docs/GATE-REPORT-M3A.md)
 * -------------------------------------
 * Connection infrastructure ONLY. This module exports a lazily-constructed
 * MongoClient/Db instance and nothing else. It contains:
 *   - NO queries
 *   - NO business logic
 *   - NO models beyond what's needed to type the connection
 *   - NO application behavior of any kind
 *
 * Query/repository functions live in `src/lib/mongodb/repositories/`.
 *
 * WHY A DIRECT MONGODB CLIENT, NOT AN ODM (mirrors the reasoning already
 * recorded for the superseded Kysely layer in src/lib/db/index.ts)
 * -------------------------------------------------------------------------
 * The source Laravel application has no ORM (one Eloquent model only) and
 * the schema has zero foreign keys and several intentionally-overloaded
 * columns (docs/M3-DATABASE-MAPPING.md §1.2 — `products.p_cat` resolves
 * against two different collections depending on call site). An ODM's
 * relational/schema assumptions would fight this the same way a full SQL
 * ORM would have. Zod (src/lib/mongodb/schemas/) provides validation without
 * imposing a relational model.
 *
 * DATABASE SAFETY (owner instruction, 2026-08-16 — M3-A authorization)
 * ------------------------------------------------------------------------
 * - Credentials are read from environment variables only, never hardcoded
 *   (src/lib/env.ts's getMongoConfig()).
 * - This module refuses to connect to `MONGODB_ENV=production` unless
 *   `MONGODB_ALLOW_PRODUCTION=true` is ALSO explicitly set — a second,
 *   independent flag, so a single misconfigured variable cannot silently
 *   point at production. Per the owner's instruction, this phase must not
 *   connect to or modify a production Atlas cluster without explicit,
 *   separate authorization for that specific operation. This guard makes
 *   that structurally require setting two variables together, not one.
 * - No connection is opened at import time. `getMongoClient()` is called
 *   explicitly by whatever code needs it; unit tests that only exercise
 *   validation/mapping logic never touch this module and never need
 *   credentials.
 */

import { MongoClient, type Db } from 'mongodb';
import { getMongoConfig } from '../env';

let client: MongoClient | undefined;
let db: Db | undefined;

/**
 * Thrown when an attempt is made to connect to a production MongoDB
 * environment without the explicit second confirmation flag. This is a
 * deliberate safety error, not a bug — do not "fix" it by defaulting
 * `MONGODB_ALLOW_PRODUCTION` to true anywhere.
 */
export class ProductionConnectionBlockedError extends Error {
  constructor() {
    super(
      'Refusing to connect: MONGODB_ENV=production but MONGODB_ALLOW_PRODUCTION is not ' +
        '"true". This is a deliberate safety guard (M3-A authorization, 2026-08-16) — ' +
        "connecting to or modifying the production Atlas cluster requires the owner's " +
        'explicit, separate authorization for that specific operation. Do not set ' +
        'MONGODB_ALLOW_PRODUCTION=true to work around this without that authorization.'
    );
    this.name = 'ProductionConnectionBlockedError';
  }
}

/**
 * Returns the singleton MongoClient, connecting on first use.
 *
 * Lazy construction means importing any module that imports this one never
 * opens a connection or requires credentials — only calling this function
 * does.
 */
export async function getMongoClient(): Promise<MongoClient> {
  if (client) return client;

  const config = getMongoConfig();

  if (config.env === 'production' && !config.allowProduction) {
    throw new ProductionConnectionBlockedError();
  }

  client = new MongoClient(config.uri);
  await client.connect();
  return client;
}

/**
 * Returns the singleton Db handle for the configured database name,
 * connecting on first use.
 */
export async function getDb(): Promise<Db> {
  if (db) return db;
  const c = await getMongoClient();
  const config = getMongoConfig();
  db = c.db(config.dbName);
  return db;
}

/**
 * Closes the connection. Intended for test teardown and graceful shutdown
 * only.
 */
export async function closeMongoClient(): Promise<void> {
  if (!client) return;
  await client.close();
  client = undefined;
  db = undefined;
}
