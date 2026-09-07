/**
 * Non-throwing MongoDB configuration probe for the Mother Tincture
 * admin-add feature.
 *
 * Mirrors `@/lib/herbs/db/config.ts` exactly in shape and rationale — see
 * that file's header for why this reads the base `MONGODB_*` env vars
 * directly, without throwing, unlike `@/lib/env`'s fail-fast
 * `getMongoConfig()`: persistence here is optional, every consumer of
 * `@/lib/motherTincture/db` must keep working (falling back to the real
 * curated catalogue alone) when no database is configured at all.
 */

export interface MotherTinctureDbConfig {
  uri: string;
  dbName: string;
  env: 'development' | 'test' | 'production';
  allowProduction: boolean;
}

const MOTHER_TINCTURE_DB_NAME_SUFFIX = '_motherTincture';

/**
 * Returns the Mother Tincture feature's Mongo config, or `null` if the
 * base `MONGODB_*` variables aren't set.
 *
 * Reuses the SAME connection (`MONGODB_URI`) as the legacy migration's
 * MongoDB and the Herbs Store, but its OWN separate logical database name
 * (`<MONGODB_DB_NAME>_motherTincture`) — not a second cluster, just a
 * separate database on the same server, same "parallel model" posture as
 * `@/lib/herbs/db/config.ts` (CR-003 §10.5), kept structurally isolated
 * from both the legacy migration's collections and the Herbs Store's
 * `herbProducts` collection.
 */
export function getMotherTinctureDbConfig(): MotherTinctureDbConfig | null {
  const uri = process.env.MONGODB_URI;
  const baseDbName = process.env.MONGODB_DB_NAME;
  const env = process.env.MONGODB_ENV;

  if (!uri || !baseDbName || !env) return null;
  if (env !== 'development' && env !== 'test' && env !== 'production') return null;

  return {
    uri,
    dbName: `${baseDbName}${MOTHER_TINCTURE_DB_NAME_SUFFIX}`,
    env,
    allowProduction: process.env.MONGODB_ALLOW_PRODUCTION === 'true',
  };
}

/** Pure env-var check — true iff `getMotherTinctureDbConfig()` would
 * return non-null. Kept here (not in `client.ts`) so callers that only
 * need to know "is a database configured at all" never import the
 * MongoDB driver. */
export function isMotherTinctureDbConfigured(): boolean {
  return getMotherTinctureDbConfig() !== null;
}
