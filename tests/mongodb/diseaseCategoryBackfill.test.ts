/**
 * `diseaseCategoryIdsFor` tests — CR-006 Phase 5. Pure-function logic
 * backing `scripts/backfill-disease-category-ids.ts` (NOT YET RUN
 * against any real database — see that script's own header). Extracted
 * so it can be unit-tested directly, matching this codebase's own
 * "logic in src/lib, script is a thin CLI wrapper" convention.
 */

import { describe, it, expect } from 'vitest';
import { diseaseCategoryIdsFor } from '@/lib/mongodb/diseaseCategoryBackfill';

describe('diseaseCategoryIdsFor', () => {
  it('returns [pCat] when pCat is a number', () => {
    expect(diseaseCategoryIdsFor(5)).toEqual([5]);
  });

  it('returns [] when pCat is null', () => {
    expect(diseaseCategoryIdsFor(null)).toEqual([]);
  });

  it('returns [] when pCat is undefined', () => {
    expect(diseaseCategoryIdsFor(undefined)).toEqual([]);
  });

  it('returns [0] when pCat is 0 — a falsy but valid category id, not treated as absent', () => {
    // 0 is a legitimate legacyId value in principle; only null/undefined
    // mean "no category set" for this field, matching pCat's own
    // nullableIntSchema semantics (not a truthiness check).
    expect(diseaseCategoryIdsFor(0)).toEqual([0]);
  });
});
