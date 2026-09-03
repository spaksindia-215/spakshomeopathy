/**
 * Validation stage tests — error handling for malformed transform output.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { validateEntity } from '@/lib/migration/validate';
import type { TransformOutcome } from '@/lib/migration/transform/types';

const testSchema = z.object({ legacyId: z.number(), name: z.string() });
type TestEntity = z.infer<typeof testSchema>;

describe('validateEntity', () => {
  it('accepts a value that matches the schema', () => {
    const outcomes: TransformOutcome<TestEntity>[] = [
      { ok: true, value: { legacyId: 1, name: 'ok' }, legacyId: 1 },
    ];
    const report = validateEntity('test', outcomes, testSchema);
    expect(report.accepted).toHaveLength(1);
    expect(report.rejected).toHaveLength(0);
  });

  it('carries a TransformError through as a rejection unchanged', () => {
    const outcomes: TransformOutcome<TestEntity>[] = [
      { ok: false, legacyId: 5, reason: 'transform failed', sourceRecord: {} },
    ];
    const report = validateEntity('test', outcomes, testSchema);
    expect(report.rejected).toHaveLength(1);
    expect(report.rejected[0]!.reason).toBe('transform failed');
  });

  it('rejects a transformed value that fails schema validation, with Zod issue detail attached', () => {
    const outcomes: TransformOutcome<TestEntity>[] = [
      // @ts-expect-error — deliberately malformed for this test
      { ok: true, value: { legacyId: 'not-a-number', name: 'x' }, legacyId: 1 },
    ];
    const report = validateEntity('test', outcomes, testSchema);
    expect(report.accepted).toHaveLength(0);
    expect(report.rejected).toHaveLength(1);
    expect(report.rejected[0]!.reason).toBe('schema validation failed');
    expect(report.rejected[0]!.zodIssues).toBeDefined();
  });

  it('sourceCount always equals the total outcomes passed in, regardless of accept/reject split', () => {
    const outcomes: TransformOutcome<TestEntity>[] = [
      { ok: true, value: { legacyId: 1, name: 'a' }, legacyId: 1 },
      { ok: false, legacyId: 2, reason: 'x', sourceRecord: {} },
      { ok: true, value: { legacyId: 3, name: 'c' }, legacyId: 3 },
    ];
    const report = validateEntity('test', outcomes, testSchema);
    expect(report.sourceCount).toBe(3);
    expect(report.accepted.length + report.rejected.length).toBe(report.sourceCount);
  });
});
