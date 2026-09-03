/**
 * Collection creation — M3-C.
 *
 * Owner instruction (M3-C §2): "Create the approved collections for the
 * M3 architecture. At minimum: orders, orderProducts, payments. Plus the
 * remaining approved entities from M3-B. Do not invent new collections.
 * Do not merge orders/orderProducts/payments. Do not redesign DR-01."
 *
 * This module WRITES to a MongoDB database (creates collections) — unlike
 * every module built in M3-A/M3-B, which touched no live database at all.
 * It is exported and unit-testable against a fake, but is NEVER called
 * against any real target by this phase's own code — see
 * `docs/GATE-REPORT-M3C.md` for the connection-dependent-work status.
 *
 * COLLECTION LIST: sourced directly from `src/lib/mongodb/collections.ts`
 * (the M3-A COLLECTIONS constant) — this module does not define its own
 * list, so there is no possibility of it inventing a collection name that
 * doesn't already exist in the approved M3 architecture.
 */

import type { Db } from 'mongodb';
import { COLLECTIONS } from './collections';

/**
 * The subset of COLLECTIONS this phase actually creates, per the owner's
 * M3-B-carried "required capabilities" list (the same 17 entities M3-B's
 * pipeline covers) plus the explicit "at minimum: orders, orderProducts,
 * payments" instruction. Every name here is copied verbatim from
 * `COLLECTIONS` — none is invented.
 */
export const M3C_COLLECTIONS_TO_CREATE: string[] = [
  COLLECTIONS.users,
  COLLECTIONS.products,
  COLLECTIONS.categories,
  COLLECTIONS.productCategories,
  COLLECTIONS.orders,
  COLLECTIONS.orderProducts,
  COLLECTIONS.payments,
  COLLECTIONS.appointments,
  COLLECTIONS.enquiries,
  COLLECTIONS.sliders,
  COLLECTIONS.pinCodes,
  COLLECTIONS.posts,
  COLLECTIONS.homeopathyMaster,
  COLLECTIONS.blogs,
  COLLECTIONS.blogCategories,
  COLLECTIONS.statezones,
  COLLECTIONS.cities,
];

export interface CollectionCreationResult {
  collection: string;
  created: boolean; // false if it already existed
}

/**
 * Creates every collection in `M3C_COLLECTIONS_TO_CREATE` that does not
 * already exist. Idempotent — safe to call multiple times; an existing
 * collection is left untouched (MongoDB's `createCollection` on an
 * existing name would throw, so this checks `listCollections` first
 * rather than relying on try/catch to swallow that error).
 *
 * NOT CALLED ANYWHERE IN THIS PHASE'S OWN AUTOMATIC EXECUTION — only
 * invoked when `scripts/migrate-to-mongodb.ts` is run explicitly by a
 * human against a target that has already passed
 * `assertNonProductionTarget()` (see environmentGuard.ts).
 */
export async function ensureCollections(db: Db): Promise<CollectionCreationResult[]> {
  const existing = new Set((await db.listCollections().toArray()).map((c) => c.name));
  const results: CollectionCreationResult[] = [];

  for (const name of M3C_COLLECTIONS_TO_CREATE) {
    if (existing.has(name)) {
      results.push({ collection: name, created: false });
      continue;
    }
    await db.createCollection(name);
    results.push({ collection: name, created: true });
  }

  return results;
}
