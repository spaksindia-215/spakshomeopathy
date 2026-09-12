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
 * Number of extra attempts made when the *initial* `.connect()` fails with
 * a transient network/TLS error, before giving up and letting the error
 * propagate. Observed in dev (2026-09-12): intermittent
 * `MongoServerSelectionError` / `SSL routines:ssl3_read_bytes:tlsv1 alert
 * internal error` (TLS alert 80) against Atlas, which clears on the very
 * next attempt. This is a known flaky interaction between newer Node/OpenSSL
 * builds and Atlas's TLS termination, not an application bug — retrying the
 * handshake is the correct mitigation rather than surfacing a 500 to the
 * user for a connection that would have succeeded a moment later.
 */
const CONNECT_RETRY_ATTEMPTS = 2;
const CONNECT_RETRY_DELAY_MS = 300;

function isTransientConnectError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    /ssl|tls/i.test(message) ||
    /ServerSelectionError/i.test(message) ||
    /ECONNRESET|ETIMEDOUT|ENOTFOUND/i.test(message)
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  // Held in a local until `.connect()` succeeds, and only THEN assigned to
  // the module-level `client`. Assigning before `.connect()` resolves (the
  // original bug here, found during M5-Cart, 2026-08-31, and left
  // unfixed at the time as infrastructure-only / out of that slice's
  // scope — see docs/GATE-REPORT-M5-CART.md §6) meant a failed connection
  // attempt still got cached: `if (client) return client;` above would
  // then short-circuit every later call in the same process onto a
  // client that never actually connected, surfacing as
  // MongoTopologyClosedError on every subsequent call until the process
  // restarted. This mirrors the pattern `src/lib/herbs/db/client.ts` and
  // `src/lib/motherTincture/db/client.ts` already use correctly.
  //
  // `minPoolSize: 0` / a modest `maxIdleTimeMS` keep the pool from holding
  // idle sockets that Atlas may already be tearing down on its end (a
  // common contributor to the TLS-alert-80 symptom above); the retry loop
  // below covers the initial handshake, which is the case that otherwise
  // becomes a request-facing 500 (see product-store-cart route, 2026-09-12).
  //
  // NOT a TLS-version fix here (deliberately) — diagnosed 2026-09-12 that
  // the `SSL alert number 80` / `tlsv1 alert internal error` this cluster
  // produces is NOT a TLS-1.2-vs-1.3 issue: forcing 1.2 via a raw
  // `openssl s_client -tls1_2` against Node's actual linked libssl
  // (`/usr/lib/x86_64-linux-gnu/libssl.so.3`, NOT the unrelated
  // `~/anaconda3/bin/openssl` that first made 1.2 look like a fix) fails
  // identically to the default, as does every other TLS version and both
  // `curl` and Node's own `tls.connect`. Plain HTTPS to other hosts
  // (google.com) succeeds from this same machine, so it isn't a
  // system-wide TLS/network/proxy issue either — the handshake is being
  // torn down by Atlas itself, most likely because this environment's
  // current outbound IP is not in the Atlas project's Network Access
  // (IP allowlist) entry for this cluster. That's an Atlas dashboard
  // configuration fix, not something resolvable from this codebase — see
  // the retry loop below for how the app degrades instead of never
  // recovering.
  let lastError: unknown;
  for (let attempt = 0; attempt <= CONNECT_RETRY_ATTEMPTS; attempt++) {
    const candidate = new MongoClient(config.uri, {
      maxIdleTimeMS: 10_000,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 10_000,
    });
    try {
      await candidate.connect();
      client = candidate;
      return client;
    } catch (err) {
      lastError = err;
      await candidate.close().catch(() => {});
      const isLastAttempt = attempt === CONNECT_RETRY_ATTEMPTS;
      if (isLastAttempt || !isTransientConnectError(err)) {
        throw err;
      }
      await sleep(CONNECT_RETRY_DELAY_MS * (attempt + 1));
    }
  }
  // Unreachable — the loop above always returns or throws — but keeps
  // TypeScript satisfied that every path produces a result.
  throw lastError;
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
