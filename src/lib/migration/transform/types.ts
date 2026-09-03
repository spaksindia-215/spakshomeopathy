/**
 * Shared types for the transformation stage.
 *
 * Pipeline position: Extraction → **TRANSFORMATION** → Validation →
 * MongoDB document generation → Verification.
 */

import type { SqlValue } from '../extract';

export type SourceRecord = Record<string, SqlValue>;

/**
 * The result of transforming one source row. Transformation itself never
 * throws for a "bad" value — per the owner's instruction ("if a record
 * contains a value that the application currently accepts, preserve it"),
 * a value the source accepted must not be rejected here. Genuine
 * transformation failures (a row so malformed the transform function
 * cannot even attempt a mapping — e.g. missing an expected column
 * entirely) are captured as `TransformError` and surfaced to the caller,
 * not thrown, so a single bad row does not abort an entire table's
 * migration.
 */
export interface TransformResult<T> {
  ok: true;
  value: T;
  legacyId: number | string;
}

export interface TransformError {
  ok: false;
  legacyId: number | string | null;
  reason: string;
  sourceRecord: SourceRecord;
}

export type TransformOutcome<T> = TransformResult<T> | TransformError;

export function isTransformSuccess<T>(outcome: TransformOutcome<T>): outcome is TransformResult<T> {
  return outcome.ok;
}
