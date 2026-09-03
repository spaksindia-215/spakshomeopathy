/**
 * Non-throwing MongoDB configuration probe for the Herbs Store.
 *
 * `@/lib/env`'s `getMongoConfig()` is fail-fast BY DESIGN (throws if
 * `MONGODB_ENV` is unset or invalid) — correct for the legacy migration,
 * which requires a database. The Herbs Store's persistence is optional:
 * every consumer of `@/lib/herbs/db` must keep working (falling back to
 * the static demo catalogue) when no database is configured at all, so
 * this reads the same three env vars directly, without throwing.
 */

export interface HerbsDbConfig {
  uri: string;
  dbName: string;
  env: 'development' | 'test' | 'production';
  allowProduction: boolean;
}

const HERBS_DB_NAME_SUFFIX = '_herbs';

/**
 * Returns the Herbs Store's Mongo config, or `null` if the base
 * `MONGODB_*` variables aren't set (i.e. no database available in this
 * environment at all — the common case in local/sandbox sessions).
 *
 * Reuses the SAME connection (`MONGODB_URI`) as the legacy migration's
 * MongoDB, but a DIFFERENT logical database name (`<MONGODB_DB_NAME>_herbs`)
 * — not a second cluster, just a separate database on the same server, so
 * the `herbProducts` collection can never collide with, or be enumerated
 * alongside, the legacy migration's 34-table-derived collections in
 * `COLLECTIONS` (collections.ts). This mirrors CR-003 §10.5's "parallel
 * model" decision at the storage-engine level, not just the schema level.
 */
export function getHerbsDbConfig(): HerbsDbConfig | null {
  const uri = process.env.MONGODB_URI;
  const baseDbName = process.env.MONGODB_DB_NAME;
  const env = process.env.MONGODB_ENV;

  if (!uri || !baseDbName || !env) return null;
  if (env !== 'development' && env !== 'test' && env !== 'production') return null;

  return {
    uri,
    dbName: `${baseDbName}${HERBS_DB_NAME_SUFFIX}`,
    env,
    allowProduction: process.env.MONGODB_ALLOW_PRODUCTION === 'true',
  };
}

/** Pure env-var check — true iff `getHerbsDbConfig()` would return non-null.
 * Kept here (not in `client.ts`) so callers that only need to know
 * "is a database configured at all" never import the MongoDB driver. */
export function isHerbsDbConfigured(): boolean {
  return getHerbsDbConfig() !== null;
}
