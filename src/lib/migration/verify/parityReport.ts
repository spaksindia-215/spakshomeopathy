/**
 * Parity report generation.
 *
 * Owner instruction (M3-B §8): "Generate a machine-readable and
 * human-readable migration report: for every migrated entity — source
 * count, target/generated count, rejected count, warning count, missing
 * relationships, duplicate identities, type conversions, transformation
 * rules applied."
 *
 * This module builds the report structure and a human-readable renderer.
 * It does not write anything to disk itself (the CLI orchestrator,
 * scripts/migrate.ts, decides where a report is written) and it performs
 * no database access of any kind.
 */

import type { ValidationReport } from '../validate';
import type { OrphanReport, DuplicateIdentityReport } from './orphans';
import type { ExpectedTypeConversion } from './typeConversions';

export interface EntityParitySection {
  entityName: string;
  sourceCount: number;
  targetCount: number;
  rejectedCount: number;
  rejectedSamples: { legacyId: number | string | null; reason: string }[];
  warningCount: number;
  warnings: string[];
  duplicateIdentities: { legacyId: number | string; count: number }[];
  typeConversionsApplied: ExpectedTypeConversion[];
  transformationRulesApplied: string[];
}

export interface MigrationParityReport {
  generatedAt: string;
  mode: 'dry-run' | 'executed';
  entities: EntityParitySection[];
  relationshipIssues: {
    orders?: OrphanReport;
  };
}

const MAX_REJECTED_SAMPLES = 20;

/**
 * Builds one entity's parity section from its validation report, plus any
 * duplicate-identity findings and the fixed list of type conversions this
 * entity's transform is known to apply (from
 * verify/typeConversions.ts — filtered to this entity so the report only
 * shows what's relevant, not the whole global list on every section).
 */
export function buildEntitySection<T extends { legacyId: number | string }>(
  validation: ValidationReport<T>,
  duplicates: DuplicateIdentityReport,
  allTypeConversions: ExpectedTypeConversion[],
  transformationRulesApplied: string[],
  extraWarnings: string[] = []
): EntityParitySection {
  const entityTypeConversions = allTypeConversions.filter(
    (c) => c.entity === validation.entityName
  );

  const warnings = [...extraWarnings];
  if (duplicates.duplicateLegacyIds.length > 0) {
    warnings.push(
      `${duplicates.duplicateLegacyIds.length} duplicate legacyId value(s) found — see duplicateIdentities`
    );
  }

  return {
    entityName: validation.entityName,
    sourceCount: validation.sourceCount,
    targetCount: validation.accepted.length,
    rejectedCount: validation.rejected.length,
    rejectedSamples: validation.rejected.slice(0, MAX_REJECTED_SAMPLES).map((r) => ({
      legacyId: r.legacyId,
      reason: r.reason,
    })),
    warningCount: warnings.length,
    warnings,
    duplicateIdentities: duplicates.duplicateLegacyIds,
    typeConversionsApplied: entityTypeConversions,
    transformationRulesApplied,
  };
}

export function buildParityReport(
  mode: 'dry-run' | 'executed',
  entities: EntityParitySection[],
  relationshipIssues: MigrationParityReport['relationshipIssues'] = {}
): MigrationParityReport {
  return {
    generatedAt: new Date().toISOString(),
    mode,
    entities,
    relationshipIssues,
  };
}

/** Renders a MigrationParityReport as a human-readable text report. */
export function renderHumanReadable(report: MigrationParityReport): string {
  const lines: string[] = [];
  lines.push(`Migration Parity Report`);
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Mode: ${report.mode.toUpperCase()}${report.mode === 'dry-run' ? ' — NO DATABASE WRITES PERFORMED' : ''}`);
  lines.push('');

  for (const e of report.entities) {
    lines.push(`## ${e.entityName}`);
    lines.push(`  Source count:    ${e.sourceCount}`);
    lines.push(`  Target count:    ${e.targetCount}`);
    lines.push(`  Rejected count:  ${e.rejectedCount}`);
    lines.push(`  Warning count:   ${e.warningCount}`);
    if (e.rejectedCount > 0) {
      lines.push(`  Rejected samples (up to ${MAX_REJECTED_SAMPLES}):`);
      for (const r of e.rejectedSamples) {
        lines.push(`    - legacyId=${r.legacyId ?? '(none)'}: ${r.reason}`);
      }
    }
    if (e.warnings.length > 0) {
      lines.push(`  Warnings:`);
      for (const w of e.warnings) lines.push(`    - ${w}`);
    }
    if (e.duplicateIdentities.length > 0) {
      lines.push(`  Duplicate identities:`);
      for (const d of e.duplicateIdentities) {
        lines.push(`    - legacyId=${d.legacyId} appears ${d.count} times`);
      }
    }
    if (e.typeConversionsApplied.length > 0) {
      lines.push(`  Type conversions applied (documented, expected):`);
      for (const t of e.typeConversionsApplied) {
        lines.push(`    - ${t.field}: ${t.sourceType} → ${t.targetType} (${t.reason})`);
      }
    }
    if (e.transformationRulesApplied.length > 0) {
      lines.push(`  Transformation rules applied:`);
      for (const rule of e.transformationRulesApplied) lines.push(`    - ${rule}`);
    }
    lines.push('');
  }

  if (report.relationshipIssues.orders) {
    const o = report.relationshipIssues.orders;
    lines.push('## Order-group relationship issues (GroupId/gid)');
    lines.push(`  Orphan orderProducts: ${o.orphanOrderProducts.length}`);
    for (const op of o.orphanOrderProducts.slice(0, MAX_REJECTED_SAMPLES)) {
      lines.push(`    - legacyId=${op.legacyId}, groupId=${op.groupId ?? '(none)'}`);
    }
    lines.push(`  Orphan payments: ${o.orphanPayments.length}`);
    for (const p of o.orphanPayments.slice(0, MAX_REJECTED_SAMPLES)) {
      lines.push(`    - legacyId=${p.legacyId}, gid=${p.gid ?? '(none)'}`);
    }
    lines.push(`  Missing orders (referenced GroupIds with no order row): ${o.missingOrders.length}`);
    for (const gid of o.missingOrders) lines.push(`    - groupId=${gid}`);
    lines.push(`  Orders with no line items: ${o.ordersWithNoLines.length}`);
    for (const gid of o.ordersWithNoLines) lines.push(`    - groupId=${gid}`);
    lines.push('');
  }

  return lines.join('\n');
}
