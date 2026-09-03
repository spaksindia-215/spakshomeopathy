/**
 * Positive non-production identification — M3-C's "fail closed" guard.
 *
 * Owner instruction (M3-C §1/§12, "NON-NEGOTIABLE"): "If the environment
 * cannot be positively identified as NON-PRODUCTION, abort before
 * connecting. Fail closed." This is DELIBERATELY a SEPARATE, ADDITIONAL
 * check layered ON TOP OF `client.ts`'s existing `ProductionConnectionBlockedError`
 * guard (M3-A) — it does not replace, weaken, or bypass that guard in any
 * way. Both checks must pass before any connection is attempted.
 *
 * WHAT "POSITIVE IDENTIFICATION" MEANS HERE: the M3-A guard is a
 * deny-list check (block if `MONGODB_ENV=production` without the second
 * flag). This module is an ADDITIONAL allow-list-style check: even when
 * `MONGODB_ENV=development` is explicitly set, this module independently
 * inspects the connection URI and database name for anything that LOOKS
 * production-like (a hostname or db name containing "prod", the live
 * project's own real domain, etc.) and refuses to proceed if it finds
 * one — because a misconfigured `.env.local` (e.g. someone accidentally
 * pastes a production URI while MONGODB_ENV is still set to
 * "development" from a template) would otherwise sail through the M3-A
 * guard entirely, since that guard only looks at the ENV flag, never the
 * URI itself.
 *
 * THIS IS DEFENSE IN DEPTH, NOT A REPLACEMENT. Both `client.ts`'s
 * `ProductionConnectionBlockedError` guard (checks the explicit
 * MONGODB_ENV/MONGODB_ALLOW_PRODUCTION flags) and this module's
 * `assertNonProductionTarget` (checks the URI/db-name content
 * independently of what the flags claim) must both pass.
 */

import { getMongoConfig } from '../env';

export class UnidentifiedEnvironmentError extends Error {
  constructor(reason: string) {
    super(
      `Refusing to connect: could not positively identify this as a ` +
        `NON-PRODUCTION MongoDB target. Failing closed per M3-C §1/§12 ` +
        `("if the environment cannot be positively identified as ` +
        `non-production, abort before connecting"). Reason: ${reason}`
    );
    this.name = 'UnidentifiedEnvironmentError';
  }
}

/**
 * Patterns that, if found in the connection URI or database name
 * (case-insensitive), indicate this might be a production target
 * regardless of what MONGODB_ENV claims. Deliberately conservative —
 * false positives (blocking a legitimately-named dev database) are the
 * safe failure mode here; false negatives are not acceptable.
 */
const PRODUCTION_INDICATOR_PATTERNS: RegExp[] = [
  /\bprod\b/i,
  /\bproduction\b/i,
  /\blive\b/i,
  /spakshomeopathy(?!.*(?:dev|test|local|staging))/i, // the real project's own
  // domain/name, UNLESS it's also qualified with dev/test/local/staging
  // somewhere in the same string (e.g. "spakshomeopathy-dev" is allowed
  // through this specific pattern, "spakshomeopathy" alone is not)
];

/**
 * Explicit allow-list of markers that, if present, confirm a non-
 * production intent. This does not override a production-indicator match
 * above — a string containing BOTH "prod" and "dev" markers is still
 * refused, per the "fail closed" instruction (ambiguity is not
 * identification).
 *
 * NOTE ON WORD BOUNDARIES: regex `\b` does NOT treat `_` as a boundary
 * character (JavaScript's `\w` class includes `_`), so a naive `/\bdev\b/`
 * fails to match a very common naming style like `spaks_dev` (caught by
 * this module's own test suite before being wired into the migration
 * script). These patterns instead require the marker to be preceded and
 * followed by either a true word boundary OR a `_`/`-` separator OR the
 * start/end of the string — matching realistic database-naming
 * conventions (`spaks_dev`, `spaks-dev`, `dev`, `myapp.dev`) without
 * loosening the match enough to accidentally match "developer" or
 * "testing-framework" as if they were the standalone marker.
 */
const SEP = '(?:^|[_.\\-]|\\b)';
const END = '(?:$|[_.\\-]|\\b)';
const NON_PRODUCTION_MARKERS: RegExp[] = [
  new RegExp(`${SEP}dev${END}`, 'i'),
  new RegExp(`${SEP}test${END}`, 'i'),
  new RegExp(`${SEP}local(?:host)?${END}`, 'i'),
  new RegExp(`${SEP}staging${END}`, 'i'),
];

export interface EnvironmentIdentification {
  identifiedAsNonProduction: boolean;
  reason: string;
  checkedUri: string; // with credentials redacted, see redactUri()
  checkedDbName: string;
}

/**
 * Redacts any userinfo (username:password@) from a MongoDB connection
 * string before it is ever included in a log message, error, or report —
 * this function exists specifically so a credential never accidentally
 * ends up in output, even in an error path.
 */
export function redactUri(uri: string): string {
  return uri.replace(/\/\/[^@/]+@/, '//<redacted>@');
}

/**
 * Performs the positive non-production identification check. Does NOT
 * connect to anything — pure string inspection of the already-loaded
 * config values.
 *
 * DESIGN NOTE — WHY THE DATABASE NAME IS CHECKED INDEPENDENTLY, NOT JUST
 * THE COMBINED STRING: an earlier version of this function checked
 * `${uri} ${dbName}` as one combined string, which meant a URI containing
 * "localhost" alone (e.g. `mongodb://localhost:27017`) could satisfy the
 * non-production-marker requirement even when the DATABASE NAME ITSELF
 * was production-looking or entirely ambiguous (e.g. `production` or
 * `somedatabase`, with no dev/test qualifier of its own). That defeats
 * the purpose of a positive-identification check on the database name —
 * caught by this function's own test suite
 * (tests/mongodb/environmentGuard.test.ts) before this was ever wired
 * into the migration script. Fixed: the production-indicator check still
 * runs against the combined string (a production marker ANYWHERE is
 * disqualifying), but the non-production-marker requirement is now
 * checked against the DATABASE NAME SPECIFICALLY — a safe-looking host
 * can no longer vouch for an unmarked or ambiguous database name.
 */
export function identifyEnvironment(uri: string, dbName: string): EnvironmentIdentification {
  const redacted = redactUri(uri);
  const combined = `${uri} ${dbName}`;

  const productionMatch = PRODUCTION_INDICATOR_PATTERNS.find((p) => p.test(combined));
  if (productionMatch) {
    return {
      identifiedAsNonProduction: false,
      reason: `URI or database name matched a production-indicator pattern (${productionMatch}); refusing regardless of MONGODB_ENV's stated value`,
      checkedUri: redacted,
      checkedDbName: dbName,
    };
  }

  // The non-production marker must appear in the DATABASE NAME itself —
  // a generically "local" URI does not get to vouch for an unmarked or
  // ambiguous database name. See the design note above.
  const nonProductionMatch = NON_PRODUCTION_MARKERS.find((p) => p.test(dbName));
  if (!nonProductionMatch) {
    return {
      identifiedAsNonProduction: false,
      reason:
        'The database name does not contain an explicit non-production marker ' +
        '(dev/test/local/staging) — ambiguous targets are not positively identified as ' +
        'non-production and are refused per the fail-closed instruction, regardless of ' +
        'what the connection URI looks like',
      checkedUri: redacted,
      checkedDbName: dbName,
    };
  }

  return {
    identifiedAsNonProduction: true,
    reason: `Positively identified as non-production: database name matched marker ${nonProductionMatch}, no production-indicator pattern present in URI or database name`,
    checkedUri: redacted,
    checkedDbName: dbName,
  };
}

/**
 * Throws `UnidentifiedEnvironmentError` unless the current MongoDB config
 * (from `getMongoConfig()`) can be positively identified as non-
 * production. Call this BEFORE `getMongoClient()`/`getDb()` in any code
 * path that might run against a real target — see
 * `scripts/migrate-to-mongodb.ts` for the one place this is actually
 * wired in this phase.
 */
export function assertNonProductionTarget(): EnvironmentIdentification {
  const config = getMongoConfig();
  const identification = identifyEnvironment(config.uri, config.dbName);
  if (!identification.identifiedAsNonProduction) {
    throw new UnidentifiedEnvironmentError(identification.reason);
  }
  return identification;
}
