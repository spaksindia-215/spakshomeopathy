/**
 * Shared Zod primitives for the MongoDB data layer.
 *
 * M3-A SCOPE — validation building blocks only. No queries, no business
 * logic beyond the type/shape validation itself.
 *
 * FIDELITY NOTE (contract F-12 / IR-5, restated for MongoDB in
 * docs/D-11-DATABASE-ARCHITECTURE.md §3, docs/M3-MONGODB-ARCHITECTURE.md §7)
 * -----------------------------------------------------------------------
 * Validation here must match what the source MariaDB schema actually
 * allowed — NOT what "should" be required. Where a source column is
 * nullable, the corresponding field here is nullable/optional. Adding a
 * stricter constraint than the source had is exactly the kind of
 * unauthorized validation-tightening contract F-12 forbids. Where the
 * source column was NOT NULL (a small minority — see
 * docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md §6), the schema requires it too.
 */

import { z } from 'zod';

/** Every migrated document carries the source MariaDB `id` for traceability
 * (docs/M3-MONGODB-ARCHITECTURE.md §3.1) — uploaded filenames and some
 * external references encode these values, and the data-migration parity
 * checks (docs/M3-DATA-MIGRATION-MAP.md) depend on being able to match a
 * migrated document back to its source row. */
export const legacyIdSchema = z.number().int();

/** MariaDB `int(11)`/`int(21)`/etc. nullable integer columns.
 * docs/M3-DATABASE-MAPPING.md §3.2: the declared width (11 vs 21) is a
 * cosmetic MySQL display hint, not a value-range constraint — it has no
 * MongoDB equivalent and is not reproduced here. */
export const nullableIntSchema = z.number().int().nullable();

/** MariaDB nullable `varchar`/`text` columns. */
export const nullableStringSchema = z.string().nullable();

/** MariaDB `timestamp` columns with `DEFAULT current_timestamp()`. */
export const timestampSchema = z.date();

/** MariaDB `int(11)` status-code columns (e.g. `status`, `p_status`,
 * `OrderStatus`) — stored as plain integers in the source, no ENUM. Do not
 * add a restricted-value check here; the source has none either
 * (docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md §6 — most status columns carry
 * no CHECK/ENUM constraint at the database level in MariaDB). */
export const statusCodeSchema = z.number().int().nullable();
