/**
 * Database connection layer.
 *
 * SUPERSEDED BY OWNER DECISION D-11 (2026-08-16, docs/D-11-DATABASE-ARCHITECTURE.md)
 * -----------------------------------------------------------------------------------
 * D-11 makes MongoDB Atlas the target production database, not this
 * MariaDB/Kysely layer. This module is RETAINED, NOT DELETED (contract
 * NN-10/G-2 forbid deletion without approval) — it was built in Milestone 0
 * but never wired into any application code, so retaining it carries no
 * behavioral risk. The active data layer is `src/lib/mongodb/` (see
 * docs/GATE-REPORT-M3A.md). Do not build new code against this module.
 *
 * MILESTONE 0 SCOPE (historical, describes what this module was originally for)
 * -------------------------------------------------------------------------------
 * Connection infrastructure ONLY. This module exports a configured Kysely
 * instance and nothing else. It contains:
 *   - NO queries
 *   - NO business logic
 *   - NO models or repositories
 *   - NO application behavior of any kind
 *
 * Query functions arrive in later milestones under `src/lib/queries/`,
 * per blueprint §17.3.
 *
 * WHY KYSELY (contract §5.1, blueprint §17.1)
 * -------------------------------------------
 * The Laravel application has exactly one Eloquent model (`App\User`) and
 * accesses the database entirely through inline `DB::table()` query-builder
 * calls. Kysely's builder shape maps to those calls almost one-to-one, which
 * is the lowest-risk translation available.
 *
 * A full ORM was deliberately rejected: the schema has zero foreign keys,
 * overloaded columns (`products.p_cat` resolves against two different tables
 * depending on call site — blueprint §6.2), and a 10-slot denormalized
 * products table. An ORM's relational assumptions would fight all three and
 * invite exactly the normalization that contract F-20 forbids.
 *
 * CONNECTION SETTINGS AND FIDELITY
 * --------------------------------
 * `sql_mode` is pinned per approved Owner Decision D-09. Production is
 * MariaDB 10.6.23 (Gate Report §4). Blueprint R-16 records that product
 * listing queries use `groupBy` while selecting non-aggregated columns —
 * valid only when ONLY_FULL_GROUP_BY is absent from sql_mode. Pinning the
 * session sql_mode makes that dependency explicit and prevents a differently
 * configured server from silently breaking every product listing page.
 *
 * The pinned value is read from DATABASE_SQL_MODE so it can be set to the
 * exact production string once captured (Gate Report §9, Outstanding Issue
 * OI-2). Until captured, it defaults to the MariaDB 10.6 documented default,
 * which does NOT include ONLY_FULL_GROUP_BY.
 */

import { Kysely, MysqlDialect } from 'kysely';
import { createPool } from 'mysql2';
import type { Database } from './schema';
import { getDatabaseConfig, optionalEnv } from '../env';

/**
 * MariaDB 10.6 documented default sql_mode.
 *
 * Note the ABSENCE of ONLY_FULL_GROUP_BY — this is why the Laravel
 * application's `groupBy` product queries work in production (blueprint R-16).
 *
 * Owner Decision D-09 (approved) requires capturing the EXACT production
 * value and using it as the compatibility baseline. Once captured, set
 * DATABASE_SQL_MODE to that exact string.
 */
const MARIADB_106_DEFAULT_SQL_MODE =
  'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';

let instance: Kysely<Database> | undefined;

/**
 * Returns the singleton Kysely instance, creating it on first use.
 *
 * Lazy construction means importing this module never opens a connection,
 * so unit tests that do not touch the database require no credentials.
 */
export function getDb(): Kysely<Database> {
  if (instance) return instance;

  const config = getDatabaseConfig();
  const sqlMode = optionalEnv('DATABASE_SQL_MODE') ?? MARIADB_106_DEFAULT_SQL_MODE;

  const pool = createPool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    connectionLimit: config.poolSize,

    // Pin sql_mode per D-09 so group-by behavior matches production exactly.
    // `connectionAttributes` is not used; sql_mode is set per connection below.
    // Setting it here (rather than per query) guarantees every connection in
    // the pool is identical.

    // Preserve MySQL/MariaDB DATETIME and TIMESTAMP values as returned,
    // without driver-side timezone conversion. Laravel/PHP reads these as
    // raw strings in the query-builder paths this app uses; converting them
    // in the driver would change observable values (contract NN-6).
    dateStrings: true,

    // Do not coerce DECIMAL/BIGINT to JS numbers implicitly in ways that
    // lose precision. This app stores prices as INT, but explicit is safer.
    supportBigNumbers: true,
    bigNumberStrings: false,
  });

  // Apply the pinned sql_mode to every pooled connection as it is created.
  pool.on('connection', (connection) => {
    connection.query(`SET SESSION sql_mode = ?`, [sqlMode]);
  });

  instance = new Kysely<Database>({
    dialect: new MysqlDialect({ pool }),
  });

  return instance;
}

/**
 * Closes the connection pool. Intended for test teardown and graceful
 * shutdown only.
 */
export async function closeDb(): Promise<void> {
  if (!instance) return;
  await instance.destroy();
  instance = undefined;
}

export type { Database };
