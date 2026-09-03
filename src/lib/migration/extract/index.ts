/**
 * Extraction stage — reads the source dump, returns typed records per
 * table. Pure, synchronous, no I/O beyond reading a text file the caller
 * provides.
 *
 * Pipeline position: MariaDB/SQL source → **EXTRACTION** → Transformation
 * → Validation → MongoDB document generation → Verification.
 */

import { parseTable, toRecords, type SqlValue } from './sqlDumpParser';

export type { SqlValue } from './sqlDumpParser';

/** Extracts one table's rows as plain records keyed by column name. */
export function extractTable(dumpText: string, tableName: string): Record<string, SqlValue>[] {
  const table = parseTable(dumpText, tableName);
  return toRecords(table);
}

/** Extracts several tables at once, returning a map keyed by table name.
 * Convenience wrapper — each table is still extracted independently
 * (per the "each stage must be independently testable" requirement, this
 * does not introduce any cross-table coupling). */
export function extractTables(
  dumpText: string,
  tableNames: string[]
): Record<string, Record<string, SqlValue>[]> {
  const result: Record<string, Record<string, SqlValue>[]> = {};
  for (const name of tableNames) {
    result[name] = extractTable(dumpText, name);
  }
  return result;
}
