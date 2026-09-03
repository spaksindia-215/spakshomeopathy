/**
 * Orphan and relationship-integrity detection.
 *
 * Pipeline position: Extraction → Transformation → Validation → MongoDB
 * document generation → **VERIFICATION**.
 *
 * Owner instruction (M3-B §5): "Create explicit validation that detects:
 * orphan orderProducts, orphan payments, missing orders, duplicate
 * identities, broken GroupId relationships, unexpected type conversions.
 * Do not silently repair these. Report them."
 *
 * NOTHING IN THIS FILE REPAIRS ANYTHING. Every function here is read-only
 * analysis over already-validated (or already-transformed) records,
 * returning a report. What the caller does with that report — abort,
 * proceed with a warning, ask the owner — is outside this module's
 * responsibility, matching "report them" rather than "fix them."
 */

import type { Order, OrderProduct, Payment } from '@/lib/mongodb/schemas';

export interface OrphanReport {
  /** orderProducts whose groupId matches no order.groupId */
  orphanOrderProducts: { legacyId: number; groupId: number | null }[];
  /** payments whose gid matches no order.groupId */
  orphanPayments: { legacyId: number; gid: number | null }[];
  /** groupIds referenced by orderProducts or payments but with no
   * matching orders row at all */
  missingOrders: number[];
  /** orders whose groupId has zero matching orderProducts rows — an order
   * header with no line items, itself a data-integrity oddity worth
   * surfacing even though it isn't strictly an "orphan child" */
  ordersWithNoLines: number[];
}

/**
 * Cross-references orders/orderProducts/payments by GroupId/gid,
 * reporting every relationship gap. Mirrors
 * docs/M3-DATABASE-MAPPING.md §1.4/§3.1's finding that MariaDB enforces
 * ZERO referential integrity on this linkage — orphans found here are not
 * necessarily migration bugs, they may be PRE-EXISTING in the source data
 * (contract §4's own conclusion: "an orderproducts.ProductId with no
 * matching products.id row is already possible right now"). This
 * function's job is to make any such gap VISIBLE, not to judge whether it
 * is expected.
 */
export function detectOrderOrphans(
  orders: Order[],
  orderProducts: OrderProduct[],
  payments: Payment[]
): OrphanReport {
  const orderGroupIds = new Set(orders.map((o) => o.groupId).filter((g): g is number => g !== null));

  const orphanOrderProducts = orderProducts
    .filter((op) => op.groupId === null || !orderGroupIds.has(op.groupId))
    .map((op) => ({ legacyId: op.legacyId, groupId: op.groupId }));

  const orphanPayments = payments
    .filter((p) => p.gid === null || !orderGroupIds.has(p.gid))
    .map((p) => ({ legacyId: p.legacyId, gid: p.gid }));

  const missingOrderGroupIds = new Set<number>();
  for (const op of orphanOrderProducts) {
    if (op.groupId !== null) missingOrderGroupIds.add(op.groupId);
  }
  for (const p of orphanPayments) {
    if (p.gid !== null) missingOrderGroupIds.add(p.gid);
  }

  const lineGroupIds = new Set(
    orderProducts.map((op) => op.groupId).filter((g): g is number => g !== null)
  );
  const ordersWithNoLines = orders
    .map((o) => o.groupId)
    .filter((g): g is number => g !== null && !lineGroupIds.has(g));

  return {
    orphanOrderProducts,
    orphanPayments,
    missingOrders: Array.from(missingOrderGroupIds).sort((a, b) => a - b),
    ordersWithNoLines,
  };
}

export interface DuplicateIdentityReport {
  entityName: string;
  duplicateLegacyIds: { legacyId: number | string; count: number }[];
}

/**
 * Detects duplicate `legacyId` values within one accepted-record set —
 * these would collide if used as a natural document key, and their
 * presence (if any) usually indicates a bug in the extraction/transform
 * stage rather than genuine source data (the source's own `id` columns
 * are all PRIMARY KEY / AUTO_INCREMENT — docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md
 * §3 — so a real duplicate here would be surprising and worth
 * investigating, not silently accepted).
 */
export function detectDuplicateIdentities<T extends { legacyId: number | string }>(
  entityName: string,
  records: T[]
): DuplicateIdentityReport {
  const counts = new Map<number | string, number>();
  for (const r of records) {
    counts.set(r.legacyId, (counts.get(r.legacyId) ?? 0) + 1);
  }
  const duplicates = Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([legacyId, count]) => ({ legacyId, count }));

  return { entityName, duplicateLegacyIds: duplicates };
}
