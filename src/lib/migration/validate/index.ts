/**
 * Validation stage.
 *
 * Pipeline position: Extraction → Transformation → **VALIDATION** →
 * MongoDB document generation → Verification.
 *
 * Takes the transformation stage's TransformOutcome[] (a mix of
 * successfully-transformed values and TransformErrors) and runs every
 * successful value through its Zod schema — the final fidelity check
 * before a document is considered ready for generation. A value that
 * transformed successfully but fails Zod validation (e.g. a NOT NULL
 * source column that was somehow empty) is reclassified as rejected here,
 * with the Zod error attached.
 *
 * NOTHING IN THIS STAGE WRITES TO ANY DATABASE. It produces a
 * ValidationReport — the accepted documents plus every rejection/warning,
 * for the generation stage (or a dry-run) to consume.
 */

import type { ZodType, ZodError } from 'zod';
import type { TransformOutcome } from '../transform/types';

export interface ValidationRejection {
  legacyId: number | string | null;
  reason: string;
  zodIssues?: ZodError['issues'];
}

export interface ValidationReport<T> {
  entityName: string;
  sourceCount: number;
  accepted: T[];
  rejected: ValidationRejection[];
}

/**
 * Validates every transform outcome against `schema`. A TransformError
 * (the value never successfully transformed) is carried through as a
 * rejection unchanged. A TransformResult is additionally checked against
 * the schema; a schema failure becomes a rejection with the Zod issue
 * detail attached, not silently coerced or dropped.
 */
export function validateEntity<T>(
  entityName: string,
  outcomes: TransformOutcome<T>[],
  schema: ZodType<T>
): ValidationReport<T> {
  const accepted: T[] = [];
  const rejected: ValidationRejection[] = [];

  for (const outcome of outcomes) {
    if (!outcome.ok) {
      rejected.push({ legacyId: outcome.legacyId, reason: outcome.reason });
      continue;
    }

    const result = schema.safeParse(outcome.value);
    if (result.success) {
      accepted.push(result.data);
    } else {
      rejected.push({
        legacyId: outcome.legacyId,
        reason: 'schema validation failed',
        zodIssues: result.error.issues,
      });
    }
  }

  return { entityName, sourceCount: outcomes.length, accepted, rejected };
}
