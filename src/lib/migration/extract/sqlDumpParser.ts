/**
 * Generic phpMyAdmin SQL dump parser.
 *
 * M3-B SCOPE: pure parsing — reads text, returns typed rows. No database
 * connection of any kind (MariaDB or MongoDB), no transformation, no
 * validation beyond "did this parse as valid SQL syntax for one row." This
 * is stage 1 (Extraction) of the pipeline:
 *
 *   MariaDB/SQL source → EXTRACTION → Transformation → Validation →
 *     MongoDB document generation → Verification
 *
 * Owner instruction (2026-08-16, M3-B authorization): "Use the existing
 * SQL dump / local MariaDB representation as the source." This module
 * parses `Database/db_newhomo.sql` directly — no live MariaDB server is
 * required to run the pipeline, matching the owner's isolated-testing
 * requirement.
 *
 * METHOD: reuses the quote-aware, paren-depth-counting row-splitting
 * technique already proven correct in earlier sessions (originally
 * developed for docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md's row-count
 * verification — re-implemented here as reusable, unit-tested library
 * code rather than a one-off script).
 */

export interface ParsedTable {
  tableName: string;
  columns: string[];
  rows: SqlValue[][];
}

/** A single SQL literal value, already coerced to its natural JS type.
 * `null` for SQL NULL, otherwise number/string/boolean. Dates are left as
 * strings (matching mysql2's `dateStrings: true` convention already
 * established in the superseded src/lib/db/index.ts) — timestamp parsing
 * happens in the transformation stage, not here. */
export type SqlValue = string | number | boolean | null;

/**
 * Extracts every `CREATE TABLE` column list for the named table.
 * Column order matches declaration order — needed to zip against each
 * `INSERT`'s positional values.
 */
export function extractColumns(dumpText: string, tableName: string): string[] {
  const createRe = new RegExp(
    `CREATE TABLE \`${escapeRegExp(tableName)}\` \\(([\\s\\S]*?)\\n\\) ENGINE=`,
    'm'
  );
  const match = createRe.exec(dumpText);
  if (!match) {
    throw new Error(`extractColumns: no CREATE TABLE found for "${tableName}"`);
  }
  const body = match[1] ?? '';
  const columns: string[] = [];
  for (const line of body.split('\n')) {
    const colMatch = /^\s*`([^`]+)`/.exec(line);
    if (colMatch?.[1]) columns.push(colMatch[1]);
  }
  if (columns.length === 0) {
    throw new Error(
      `extractColumns: parsed zero columns for "${tableName}" — check the dump format`
    );
  }
  return columns;
}

/**
 * Extracts every row from every `INSERT INTO \`tableName\`` statement in
 * the dump, in file order. A table's data is frequently split across many
 * separate INSERT statements in a phpMyAdmin dump (confirmed in earlier
 * sessions — e.g. `enquiries` has 332 separate statements) — this
 * function reads all of them, not just the first.
 */
export function extractRows(dumpText: string, tableName: string): SqlValue[][] {
  const lines = dumpText.split('\n');
  const rows: SqlValue[][] = [];

  const inlineRe = new RegExp(
    `^INSERT INTO \`${escapeRegExp(tableName)}\` .*?\\) VALUES\\s*(.*);\\s*$`
  );
  const multilineStartRe = new RegExp(`^INSERT INTO \`${escapeRegExp(tableName)}\` .*?\\) VALUES$`);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';

    const inlineMatch = inlineRe.exec(line);
    if (inlineMatch?.[1] !== undefined) {
      rows.push(...splitValueTuples(inlineMatch[1]));
      i += 1;
      continue;
    }

    if (multilineStartRe.test(line)) {
      i += 1;
      const blobLines: string[] = [];
      while (i < lines.length) {
        const current = lines[i] ?? '';
        blobLines.push(current);
        if (current.trimEnd().endsWith(';')) break;
        i += 1;
      }
      const blob = blobLines.join('\n').trimEnd().replace(/;$/, '');
      rows.push(...splitValueTuples(blob));
      i += 1;
      continue;
    }

    i += 1;
  }

  return rows;
}

/** Parses a full table (columns + all rows) in one call — the normal
 * entry point for the extraction stage. */
export function parseTable(dumpText: string, tableName: string): ParsedTable {
  const columns = extractColumns(dumpText, tableName);
  const rows = extractRows(dumpText, tableName);
  return { tableName, columns, rows };
}

/**
 * Splits a `VALUES (...),(...),(...)` blob into individual row-tuples,
 * each already parsed into typed SqlValue[]. Quote-aware and
 * paren-depth-aware so commas/parens inside string literals (very common
 * in this dataset — see docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md §8.1's
 * enquiries spam content, which contains arbitrary punctuation) do not
 * cause a false row/field split.
 */
function splitValueTuples(blob: string): SqlValue[][] {
  const tuples: SqlValue[][] = [];
  let depth = 0;
  let inString = false;
  let current = '';
  let currentFields: string[] = [];
  let i = 0;
  const n = blob.length;

  while (i < n) {
    const c = blob[i];

    if (inString) {
      if (c === '\\' && i + 1 < n) {
        current += c + blob[i + 1];
        i += 2;
        continue;
      }
      if (c === "'") {
        inString = false;
        current += c;
        i += 1;
        continue;
      }
      current += c;
      i += 1;
      continue;
    }

    if (c === "'") {
      inString = true;
      current += c;
      i += 1;
      continue;
    }

    if (c === '(') {
      depth += 1;
      if (depth === 1) {
        currentFields = [];
        current = '';
        i += 1;
        continue;
      }
      current += c;
      i += 1;
      continue;
    }

    if (c === ')') {
      depth -= 1;
      if (depth === 0) {
        currentFields.push(current);
        tuples.push(currentFields.map(parseSqlLiteral));
        current = '';
        i += 1;
        continue;
      }
      current += c;
      i += 1;
      continue;
    }

    if (c === ',' && depth === 1) {
      currentFields.push(current);
      current = '';
      i += 1;
      continue;
    }

    current += c;
    i += 1;
  }

  return tuples;
}

/** Parses one field's raw SQL-literal text into a typed value. */
function parseSqlLiteral(raw: string): SqlValue {
  const trimmed = raw.trim();
  if (trimmed === 'NULL') return null;
  if (/^-?\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10);
  if (/^-?\d+\.\d+$/.test(trimmed)) return Number.parseFloat(trimmed);
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return unescapeSqlString(trimmed.slice(1, -1));
  }
  // Fallback: return as-is (covers edge cases like bare identifiers,
  // which should not occur in a VALUES tuple but are preserved rather
  // than silently dropped if they do).
  return trimmed;
}

function unescapeSqlString(s: string): string {
  return s
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\0/g, '\0')
    .replace(/''/g, "'"); // MySQL dumps also use doubled single-quotes as an escape
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Converts a ParsedTable's rows (positional arrays) into an array of
 * plain objects keyed by column name — the shape the transformation stage
 * consumes. */
export function toRecords(table: ParsedTable): Record<string, SqlValue>[] {
  return table.rows.map((row) => {
    const record: Record<string, SqlValue> = {};
    table.columns.forEach((col, idx) => {
      record[col] = row[idx] ?? null;
    });
    return record;
  });
}
