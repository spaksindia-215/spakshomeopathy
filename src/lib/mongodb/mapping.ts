/**
 * MariaDB row → MongoDB document mapping utilities.
 *
 * M3-A SCOPE: generic helpers only. NOT a migration script — this file
 * does not connect to MariaDB, does not connect to MongoDB, and does not
 * execute any migration. It provides the small set of transformation
 * primitives docs/M3-DATA-MIGRATION-MAP.md's per-table rules will need,
 * regardless of which table's migration script is eventually written.
 *
 * See docs/M3-DATA-MIGRATION-MAP.md §2 for the cross-cutting transformation
 * rules this file implements:
 *   §2.1 — legacyId preservation
 *   §2.2 — latin1 → UTF-8 charset conversion (DR-06, not yet approved —
 *          see note on `decodeLatin1` below)
 *   §2.3 — referential-integrity handling (orphaned references migrate
 *          as-is, not silently dropped)
 */

/**
 * Wraps any MariaDB row's `id` field as the `legacyId` every collection
 * schema requires (docs/M3-MONGODB-ARCHITECTURE.md §3.1). A pure, trivial
 * mapping — kept as a named function rather than inlined everywhere so the
 * *reason* ("uploaded filenames and external references encode these
 * values") stays attached to one place, not scattered across every
 * migration script that will eventually use it.
 */
export function toLegacyId(mariaDbId: number | string): number {
  const n = typeof mariaDbId === 'string' ? Number.parseInt(mariaDbId, 10) : mariaDbId;
  if (!Number.isFinite(n)) {
    throw new Error(`toLegacyId: could not parse a finite number from "${mariaDbId}"`);
  }
  return n;
}

/**
 * Converts a Buffer/string read from a `latin1`-charset MariaDB column into
 * a proper UTF-8 JavaScript string.
 *
 * DR-06 (docs/M3-OWNER-DECISION-RECORDS.md) IS NOT YET APPROVED — this
 * function exists as the PROCEDURE (how a latin1→UTF-8 conversion would be
 * performed) without deciding DR-06's open question of WHETHER to spot-check
 * for actual non-ASCII content first before applying it uniformly. A
 * migration script for `products`/`categories`/`enquiries`/`product_review`/
 * `product_specification`/`product_images` (the six latin1-charset tables,
 * docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md §8.3) would call this function
 * once DR-06 is resolved either way — the function itself is correct
 * regardless of which DR-06 option is chosen.
 */
export function decodeLatin1(value: Buffer | string): string {
  if (typeof value === 'string') {
    // If the driver already decoded as UTF-8 assuming latin1 bytes were
    // ASCII-only, this is a no-op; the Buffer path below is the one that
    // matters for genuine non-ASCII content. Kept as a pass-through so
    // callers don't need to branch on the driver's return type.
    return value;
  }
  return value.toString('latin1');
}

/**
 * Preserves an orphaned reference value as-is, per
 * docs/M3-DATA-MIGRATION-MAP.md §2.3 — MariaDB enforces zero FK
 * constraints (docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md §4), so a
 * reference column may already point at a row that doesn't exist. This
 * function is a documentation marker as much as a utility: it makes every
 * call site that migrates a by-convention reference field explicit that
 * the value is being carried over WITHOUT existence-checking, matching
 * source behavior, rather than silently validated or dropped.
 */
export function preserveReference<T extends number | null>(value: T): T {
  return value;
}

/**
 * Converts a MariaDB `timestamp`/`datetime` string (as returned by the
 * `mysql2` driver in the superseded Kysely layer's `dateStrings: true`
 * mode — see src/lib/db/index.ts) into a JS Date, for schemas that require
 * one (most `createdAt`/`updatedAt` fields — see schemas/common.ts's
 * `timestampSchema`).
 *
 * Returns null for a null/empty input, matching the nullable timestamp
 * columns several tables have (e.g. `product_category.created_at`,
 * `password_resets.created_at`).
 */
export function toDate(mariaDbTimestamp: string | null | undefined): Date | null {
  if (mariaDbTimestamp === null || mariaDbTimestamp === undefined || mariaDbTimestamp === '') {
    return null;
  }
  const d = new Date(mariaDbTimestamp);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`toDate: could not parse a valid date from "${mariaDbTimestamp}"`);
  }
  return d;
}
