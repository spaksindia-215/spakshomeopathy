/**
 * Production database baseline capture — Owner Decision D-09.
 *
 * D-09 (APPROVED): "Capture the exact production MySQL version and sql_mode
 * and use them as the compatibility baseline."
 *
 * Captures, from the LIVE production database:
 *   - server version and engine
 *   - sql_mode (GLOBAL and SESSION — they can differ)
 *   - character set (server, database, connection)
 *   - collation (server, database, and PER TABLE)
 *   - time zone, lower_case_table_names, max_allowed_packet
 *
 * WHY PER-TABLE COLLATION MATTERS (blueprint §6.1)
 * ------------------------------------------------
 * This schema mixes collations: `categories` and `products` are
 * latin1_swedish_ci while `users` and `orders` are utf8mb4_*. Collation
 * governs `ORDER BY` ordering and `LIKE` matching, so it directly affects
 * V-06 read parity and the site search. A development snapshot re-imported
 * under a uniform charset would silently produce different row ordering.
 *
 * WHY sql_mode MATTERS (blueprint R-16)
 * -------------------------------------
 * Product listing queries `groupBy('product_images.p_id')` while selecting
 * non-aggregated columns. That is only valid when ONLY_FULL_GROUP_BY is
 * absent from sql_mode. If the target server has it enabled, EVERY product
 * listing page fails. This capture makes the dependency explicit.
 *
 * SAFETY: strictly read-only. Executes only SELECT / SHOW statements.
 *
 * USAGE
 *   DATABASE_HOST=.. DATABASE_USER=.. DATABASE_PASSWORD=.. \
 *   DATABASE_NAME=db_newhomo npm run baseline:db
 */

import { createConnection } from 'mysql2/promise';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const OUT_DIR = process.env.BASELINE_DIR ?? 'baseline';

interface Row {
  [key: string]: unknown;
}

async function main(): Promise<void> {
  const host = process.env.DATABASE_HOST;
  const user = process.env.DATABASE_USER;
  const password = process.env.DATABASE_PASSWORD;
  const database = process.env.DATABASE_NAME;
  const port = Number.parseInt(process.env.DATABASE_PORT ?? '3306', 10);

  if (!host || !user || !password || !database) {
    console.error(
      'Missing database credentials.\n' +
        'Required: DATABASE_HOST, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME\n\n' +
        'This script captures the D-09 compatibility baseline from the LIVE\n' +
        'production database. It is strictly read-only (SELECT / SHOW only).'
    );
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });

  const conn = await createConnection({ host, port, user, password, database });

  console.log(`Database baseline capture`);
  console.log(`  host     : ${host}:${port}`);
  console.log(`  database : ${database}`);
  console.log(`  mode     : READ-ONLY\n`);

  // --- server-level variables ---
  const [serverRows] = await conn.query<Row[] & never[]>(`
    SELECT
      VERSION()                       AS server_version,
      @@GLOBAL.sql_mode               AS global_sql_mode,
      @@SESSION.sql_mode              AS session_sql_mode,
      @@GLOBAL.character_set_server   AS character_set_server,
      @@GLOBAL.collation_server       AS collation_server,
      @@SESSION.character_set_client  AS character_set_client,
      @@SESSION.character_set_connection AS character_set_connection,
      @@SESSION.character_set_results AS character_set_results,
      @@SESSION.collation_connection  AS collation_connection,
      @@GLOBAL.time_zone              AS global_time_zone,
      @@SESSION.time_zone             AS session_time_zone,
      @@GLOBAL.lower_case_table_names AS lower_case_table_names,
      @@GLOBAL.max_allowed_packet     AS max_allowed_packet,
      @@GLOBAL.innodb_version         AS innodb_version,
      DATABASE()                      AS current_database
  `);
  const server = (serverRows as Row[])[0] ?? {};

  // --- database default charset / collation ---
  const [dbRows] = await conn.query<Row[] & never[]>(
    `SELECT SCHEMA_NAME, DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME
       FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?`,
    [database]
  );

  // --- per-table charset / collation / engine ---
  const [tableRows] = await conn.query<Row[] & never[]>(
    `SELECT TABLE_NAME, ENGINE, TABLE_COLLATION, TABLE_ROWS, CREATE_OPTIONS
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME`,
    [database]
  );

  // --- per-column collation for text columns (affects ORDER BY / LIKE) ---
  const [columnRows] = await conn.query<Row[] & never[]>(
    `SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_SET_NAME, COLLATION_NAME
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND COLLATION_NAME IS NOT NULL
      ORDER BY TABLE_NAME, ORDINAL_POSITION`,
    [database]
  );

  // --- indexes (blueprint §6.4 claims only one non-primary index exists) ---
  const [indexRows] = await conn.query<Row[] & never[]>(
    `SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME
       FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`,
    [database]
  );

  await conn.end();

  const tables = tableRows as Row[];
  const indexes = indexRows as Row[];
  const nonPrimaryIndexes = indexes.filter((i) => i.INDEX_NAME !== 'PRIMARY');

  const baseline = {
    capturedAt: new Date().toISOString(),
    decision: 'D-09 (APPROVED)',
    connection: { host, port, database },
    server,
    databaseDefaults: (dbRows as Row[])[0] ?? null,
    tables,
    columnCollations: columnRows,
    indexes,
    summary: {
      tableCount: tables.length,
      indexCount: indexes.length,
      nonPrimaryIndexCount: nonPrimaryIndexes.length,
      distinctTableCollations: [...new Set(tables.map((t) => String(t.TABLE_COLLATION)))].sort(),
      distinctEngines: [...new Set(tables.map((t) => String(t.ENGINE)))].sort(),
      onlyFullGroupByEnabled: String(server.session_sql_mode ?? '').includes('ONLY_FULL_GROUP_BY'),
    },
  };

  const outPath = join(OUT_DIR, 'database-baseline.json');
  await writeFile(outPath, JSON.stringify(baseline, null, 2), 'utf8');

  console.log(`Server version    : ${server.server_version}`);
  console.log(`GLOBAL sql_mode   : ${server.global_sql_mode}`);
  console.log(`SESSION sql_mode  : ${server.session_sql_mode}`);
  console.log(`Charset (server)  : ${server.character_set_server}`);
  console.log(`Collation (server): ${server.collation_server}`);
  console.log(`Time zone         : ${server.global_time_zone} / ${server.session_time_zone}`);
  console.log(`Tables            : ${baseline.summary.tableCount}`);
  console.log(`Table collations  : ${baseline.summary.distinctTableCollations.join(', ')}`);
  console.log(`Engines           : ${baseline.summary.distinctEngines.join(', ')}`);
  console.log(`Non-PK indexes    : ${baseline.summary.nonPrimaryIndexCount}`);
  console.log(
    `\nONLY_FULL_GROUP_BY: ${baseline.summary.onlyFullGroupByEnabled ? '*** ENABLED — blueprint R-16 queries WILL FAIL ***' : 'disabled (product listings work)'}`
  );
  console.log(`\nWritten: ${outPath}`);
  console.log(`\nNEXT STEP: set DATABASE_SQL_MODE in .env.local to the SESSION value above.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
