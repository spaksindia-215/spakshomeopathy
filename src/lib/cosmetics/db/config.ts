/**
 * Non-throwing MongoDB configuration probe for the Cosmetics admin-add
 * feature. Mirrors `@/lib/motherTincture/db/config.ts` exactly in shape
 * and rationale — see that file's header for why this reads the base
 * `MONGODB_*` env vars directly, without throwing: persistence here is
 * optional, every consumer of `@/lib/cosmetics/db` must keep working
 * (falling back to "no cosmetics products yet") when no database is
 * configured at all.
 */

export interface CosmeticsDbConfig {
  uri: string;
  dbName: string;
  env: 'development' | 'test' | 'production';
  allowProduction: boolean;
}

const COSMETICS_DB_NAME_SUFFIX = '_cosmetics';

/**
 * Returns the Cosmetics feature's Mongo config, or `null` if the base
 * `MONGODB_*` variables aren't set.
 *
 * Reuses the SAME connection (`MONGODB_URI`) as the legacy migration's
 * MongoDB, the Herbs Store, and Mother Tincture, but its OWN separate
 * logical database name (`<MONGODB_DB_NAME>_cosmetics`) — not a second
 * cluster, just a separate database on the same server, same "parallel
 * model" posture as `@/lib/motherTincture/db/config.ts`.
 */
export function getCosmeticsDbConfig(): CosmeticsDbConfig | null {
  const uri = process.env.MONGODB_URI;
  const baseDbName = process.env.MONGODB_DB_NAME;
  const env = process.env.MONGODB_ENV;

  if (!uri || !baseDbName || !env) return null;
  if (env !== 'development' && env !== 'test' && env !== 'production') return null;

  return {
    uri,
    dbName: `${baseDbName}${COSMETICS_DB_NAME_SUFFIX}`,
    env,
    allowProduction: process.env.MONGODB_ALLOW_PRODUCTION === 'true',
  };
}

/** Pure env-var check — true iff `getCosmeticsDbConfig()` would return
 * non-null. Kept here (not in `client.ts`) so callers that only need to
 * know "is a database configured at all" never import the MongoDB
 * driver. */
export function isCosmeticsDbConfigured(): boolean {
  return getCosmeticsDbConfig() !== null;
}
