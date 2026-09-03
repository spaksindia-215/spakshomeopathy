/**
 * Type-conversion tracking.
 *
 * Owner instruction (M3-B §5): detect "unexpected type conversions."
 *
 * This module does not detect conversions dynamically from raw data —
 * the EXPECTED conversions are a known, fixed, documented set (every
 * preserved anomaly already catalogued in
 * docs/GATE-REPORT-M3A.md §9 and each schema file's own comments). What
 * this module does is make that known set explicit and machine-checkable,
 * so the parity report (verify/parityReport.ts) can state plainly which
 * type differences are EXPECTED (and why) versus flag anything else as
 * genuinely unexpected.
 */

export interface ExpectedTypeConversion {
  entity: string;
  field: string;
  sourceType: string;
  targetType: string;
  reason: string;
}

/**
 * The full, fixed list of expected type differences between a source
 * MariaDB column and its MongoDB field, across every entity this phase's
 * transform stage covers. Anything NOT in this list that nonetheless
 * shows a type mismatch during verification should be treated as
 * genuinely unexpected — see `isExpectedConversion` below.
 */
export const EXPECTED_TYPE_CONVERSIONS: ExpectedTypeConversion[] = [
  {
    entity: 'orders',
    field: 'sellPrice',
    sourceType: 'varchar(255)',
    targetType: 'string',
    reason: 'Source column is a string; preserved as string per contract F-5 (no silent renormalization).',
  },
  {
    entity: 'orderProducts',
    field: 'sellPrice',
    sourceType: 'int(11)',
    targetType: 'number',
    reason: 'Source column is a number; unlike orders.sellPrice, which is a string in source.',
  },
  {
    entity: 'orders',
    field: 'orderId',
    sourceType: 'int(11)',
    targetType: 'number',
    reason: 'Preserved per explicit owner instruction (M3-B §4) — do not unify with payments.orderId.',
  },
  {
    entity: 'payments',
    field: 'orderId',
    sourceType: 'varchar(255)',
    targetType: 'string',
    reason: 'Preserved per explicit owner instruction (M3-B §4) — do not unify with orders.orderId.',
  },
  {
    entity: 'pinCodes',
    field: 'status',
    sourceType: 'varchar(255)',
    targetType: 'string',
    reason: 'Source column is a string, unlike every other numeric status column in the schema.',
  },
  {
    entity: 'sellerPayments',
    field: 'payStatus',
    sourceType: 'varchar(255)',
    targetType: 'string',
    reason: 'Source column is a string, unlike every other numeric payStatus column in the schema (not migrated this phase — DR-02).',
  },
  {
    entity: 'products',
    field: 'id (products.id → int(11))',
    sourceType: 'various int widths (int(11), int(21))',
    targetType: 'number (BSON Int32/Int64 as appropriate)',
    reason: 'MariaDB display-width (int(11) vs int(21)) is cosmetic, not a range constraint — no MongoDB equivalent exists or is needed (docs/M3-DATABASE-MAPPING.md §3.2).',
  },
];

/**
 * Checks whether a given (entity, field) pair is a KNOWN, documented type
 * difference. Returns the matching entry if so, or undefined if the pair
 * is not in the expected list — the caller (parityReport.ts) treats an
 * undefined result as a genuinely unexpected conversion worth flagging.
 */
export function isExpectedConversion(
  entity: string,
  field: string
): ExpectedTypeConversion | undefined {
  return EXPECTED_TYPE_CONVERSIONS.find((c) => c.entity === entity && c.field === field);
}
