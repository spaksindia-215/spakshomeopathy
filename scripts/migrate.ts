/**
 * Migration pipeline CLI — M3-B TOOLING.
 *
 * Owner instruction (M3-B §7): "Provide a dry-run mode that reads the
 * source, performs transformations, validates the result, reports counts,
 * reports rejected records, reports warnings, reports relationship
 * problems, but performs NO database writes."
 *
 * THIS SCRIPT ONLY EVER RUNS IN DRY-RUN MODE. There is no write mode in
 * this phase — the owner's M3-B stop condition explicitly excludes
 * "production data migration" and this phase was not asked to build a
 * development-write mode either (the pipeline itself stops at validated,
 * report-ready documents — see src/lib/migration/pipeline.ts's header on
 * why "MongoDB document generation" has no separate write step yet).
 *
 * USAGE:
 *   npx tsx scripts/migrate.ts [--dump <path>] [--out <path>]
 *
 *   --dump   Path to the SQL dump to read. Defaults to
 *            Database/db_newhomo.sql (the project's own dump).
 *   --out    Path to write the human-readable report to. If omitted,
 *            prints to stdout only.
 *   --json   Path to write the machine-readable JSON report to. Optional.
 *
 * SAFETY: this script never imports `src/lib/mongodb/client.ts` and never
 * constructs a MongoClient — it is structurally incapable of connecting to
 * any MongoDB instance, development or production. It only reads a text
 * file and writes a report.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { runPipeline } from '../src/lib/migration/pipeline';
import { renderHumanReadable } from '../src/lib/migration/verify';

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg?.startsWith('--')) {
      const key = arg.slice(2);
      const value = argv[i + 1];
      if (value && !value.startsWith('--')) {
        args[key] = value;
        i++;
      } else {
        args[key] = 'true';
      }
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const dumpPath = args.dump ?? resolve(__dirname, '../../Database/db_newhomo.sql');

  console.log('='.repeat(70));
  console.log('M3-B MIGRATION PIPELINE — DRY-RUN MODE ONLY');
  console.log('No database connection of any kind will be attempted.');
  console.log('No data will be written anywhere.');
  console.log('='.repeat(70));
  console.log(`Reading source dump: ${dumpPath}`);

  const dumpText = readFileSync(dumpPath, 'utf-8');
  const report = runPipeline(dumpText);

  const humanReadable = renderHumanReadable(report);
  console.log('');
  console.log(humanReadable);

  if (args.out) {
    writeFileSync(args.out, humanReadable, 'utf-8');
    console.log(`\nHuman-readable report written to: ${args.out}`);
  }

  if (args.json) {
    writeFileSync(args.json, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`Machine-readable report written to: ${args.json}`);
  }

  const totalRejected = report.entities.reduce((sum, e) => sum + e.rejectedCount, 0);
  const totalWarnings = report.entities.reduce((sum, e) => sum + e.warningCount, 0);
  const orphanCount = report.relationshipIssues.orders
    ? report.relationshipIssues.orders.orphanOrderProducts.length +
      report.relationshipIssues.orders.orphanPayments.length
    : 0;

  console.log('');
  console.log('='.repeat(70));
  console.log(
    `SUMMARY: ${totalRejected} rejected, ${totalWarnings} warnings, ${orphanCount} order-relationship orphans`
  );
  console.log('DRY-RUN COMPLETE. NO WRITES WERE PERFORMED.');
  console.log('='.repeat(70));
}

main();
