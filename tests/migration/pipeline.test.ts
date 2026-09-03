/**
 * End-to-end pipeline tests, against the fixture dataset (tests/migration/
 * fixtures/sample-dump.ts). Proves the full extraction → transformation →
 * validation → verification sequence, dry-run behavior, and count
 * reconciliation, WITHOUT any database connection of any kind.
 */

import { describe, it, expect } from 'vitest';
import { runPipeline } from '@/lib/migration/pipeline';
import { SAMPLE_DUMP } from './fixtures/sample-dump';

describe('runPipeline — dry-run behavior', () => {
  const report = runPipeline(SAMPLE_DUMP);

  it('mode is always "dry-run" — this pipeline never performs a write', () => {
    expect(report.mode).toBe('dry-run');
  });

  it('produces one section per entity covered this phase', () => {
    const names = report.entities.map((e) => e.entityName);
    expect(names).toEqual(
      expect.arrayContaining([
        'users',
        'products',
        'categories',
        'productCategories',
        'orders',
        'orderProducts',
        'payments',
        'appointments',
        'enquiries',
        'sliders',
        'pinCodes',
        'posts',
        'homeopathyMaster',
        'blogs',
        'blogCategories',
        'statezones',
        'cities',
      ])
    );
  });
});

describe('runPipeline — count reconciliation against the fixture', () => {
  const report = runPipeline(SAMPLE_DUMP);
  const byName = new Map(report.entities.map((e) => [e.entityName, e]));

  it('users: source count 3 reconciles to target count 3 (no rejections)', () => {
    const s = byName.get('users')!;
    expect(s.sourceCount).toBe(3);
    expect(s.targetCount).toBe(3);
    expect(s.rejectedCount).toBe(0);
  });

  it('orderProducts: source count 5 (including the deliberate orphan) reconciles to target count 5', () => {
    // The orphan is a VALID document (it transforms and validates fine —
    // "orphan" here means its groupId matches no order, a relationship
    // problem, not a shape problem) — it still counts toward target.
    const s = byName.get('orderProducts')!;
    expect(s.sourceCount).toBe(5);
    expect(s.targetCount).toBe(5);
  });

  it('every entity satisfies sourceCount = targetCount + rejectedCount', () => {
    for (const section of report.entities) {
      expect(section.targetCount + section.rejectedCount).toBe(section.sourceCount);
    }
  });
});

describe('runPipeline — GroupId relationship problems are reported, not repaired', () => {
  const report = runPipeline(SAMPLE_DUMP);

  it('detects the deliberate orphan orderProduct (GroupId=999)', () => {
    const orphans = report.relationshipIssues.orders!;
    expect(orphans.orphanOrderProducts).toContainEqual({ legacyId: 6, groupId: 999 });
  });

  it('detects the resulting missing order (GroupId 999 referenced but no order row exists)', () => {
    const orphans = report.relationshipIssues.orders!;
    expect(orphans.missingOrders).toContain(999);
  });

  it('the orphan is still present in the accepted/target data — this pipeline never silently drops it', () => {
    const s = byName(report, 'orderProducts');
    // 5 lines total: 2 for order 100, 1 each for 200/300, 1 orphan — the
    // orphan is counted, not excluded, even though it's flagged.
    expect(s.targetCount).toBe(5);
  });
});

describe('runPipeline — enquiries migrate unfiltered (DR-07 default)', () => {
  it('does not filter or reduce the enquiries row count in any way', () => {
    const report = runPipeline(SAMPLE_DUMP);
    const s = byName(report, 'enquiries');
    expect(s.sourceCount).toBe(s.targetCount);
  });
});

function byName(report: ReturnType<typeof runPipeline>, name: string) {
  const section = report.entities.find((e) => e.entityName === name);
  if (!section) throw new Error(`no section named ${name}`);
  return section;
}
