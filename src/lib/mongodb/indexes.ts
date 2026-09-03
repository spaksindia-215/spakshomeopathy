/**
 * Proposed MongoDB index definitions.
 *
 * M3-A SCOPE: definitions only. NOTHING in this file is applied to any
 * database by importing it — see `ensureIndexes()` at the bottom, which is
 * exported but not called anywhere in M3-A. Applying these against a real
 * Atlas cluster (even a development one) is explicitly M3-B+ work.
 *
 * SOURCE: docs/M3-MONGODB-ARCHITECTURE.md §4 ("Proposed Indexes"), itself
 * built from the 37-join/6-groupBy catalogue in
 * docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md §11 and blueprint §6.4's list of
 * currently-unindexed hot columns.
 *
 * FIDELITY NOTE: indexes are purely additive infrastructure — they cannot
 * change a query's result set, only its performance — mirroring contract
 * §5.3's pre-approval of additive MariaDB indexes, restated for MongoDB per
 * docs/D-11-DATABASE-ARCHITECTURE.md §3. This is why indexes are safe to
 * define in M3-A even though the collections they'd apply to don't exist
 * yet in any real database.
 *
 * DR-04 (users.email UNIQUE index) — APPROVED 2026-08-21 (Option 1)
 * ------------------------------------------------------------------
 * Owner explicitly approved DR-04 Option 1 (add the unique index) on
 * 2026-08-21, after the pre-migration duplicate-email check
 * (docs/GATE-REPORT-M3D-PREMIGRATION.md §2) independently confirmed zero
 * duplicate emails exist in the 819-row `users` dataset at every
 * normalization level. This index therefore lives in `proposedIndexes`
 * below (and IS included in `ensureIndexes()`'s default list) rather than
 * in a separate approval-gated array. See docs/M3-OWNER-DECISION-RECORDS.md
 * DR-04 for the full original reasoning (a pre-existing duplicate-email
 * row, if any had existed, would have made this index fail to apply; it
 * introduces a NEW observable failure mode — a duplicate-key error — that
 * the current MariaDB system, with no such constraint, never produces; this
 * remains true going forward for any future duplicate insert attempt, and
 * is accepted as part of this approval, not overlooked by it).
 *
 * DR-04 index NAME — RESOLVED 2026-08-31 (`email_1` accepted as permanent)
 * --------------------------------------------------------------------------
 * The index was originally documented/labeled `users_email_unique`, but the
 * script that first created it against `spaks_dev`
 * (`scripts/apply-dr04-index.ts`) omitted an explicit `name:` option, so
 * MongoDB assigned its own default name from the key spec: `email_1`. This
 * was a purely cosmetic mismatch — the constraint itself ({ email: 1 },
 * unique: true) was always correct — flagged in
 * docs/OWNER-AUTHORIZATION-RECONCILIATION.md §3 as REQUIRES-FOLLOW-UP. The
 * owner resolved it 2026-08-31 by accepting `email_1` as the permanent name
 * rather than dropping/recreating the live index, to avoid the brief
 * constraint-absent window that operation would introduce for zero
 * functional gain. See docs/M3-OWNER-DECISION-RECORDS.md, Addendum 2
 * (2026-08-31), for the full decision record. The entry below now reflects
 * the actual live name, with `name: 'email_1'` passed explicitly so any
 * future re-run of index creation is idempotent against reality rather than
 * silently drifting further.
 *
 * These approvals cover this index ONLY. No other owner decision recorded
 * in docs/M3-OWNER-DECISION-RECORDS.md (DR-02, DR-03, DR-06, DR-07) is
 * affected or implicitly resolved by this change.
 */

import { COLLECTIONS } from './collections';
import type { Db, CreateIndexesOptions, IndexSpecification } from 'mongodb';

/**
 * Per owner instruction (M3-C §3): "For every index document: name,
 * collection, fields, uniqueness, purpose, source behavior it preserves —
 * must be documented." Every field below is REQUIRED, not optional,
 * enforcing that discipline at the type level.
 */
interface ProposedIndex {
  /** A stable, human-readable identifier for this index — used in the
   * M3-C documentation and index-creation logs, distinct from MongoDB's
   * own auto-generated index name. */
  name: string;
  collection: string;
  spec: IndexSpecification;
  options?: CreateIndexesOptions;
  /** Explicit, so "uniqueness" is never left implicit in `options`. */
  unique: boolean;
  /** Which query pattern this serves. */
  purpose: string;
  /** The specific Laravel/MariaDB source behavior this index preserves or
   * (for the two genuinely-new indexes) the absence-of-behavior it does
   * NOT change, with citation. */
  sourceBehaviorPreserved: string;
}

/**
 * Every approved index, including the users-email unique index (DR-04,
 * approved 2026-08-21; name resolved to `email_1` 2026-08-31 — see the
 * file-header comment above).
 */
export const proposedIndexes: ProposedIndex[] = [
  {
    // Actual live name on spaks_dev, accepted as permanent 2026-08-31
    // (DR-04 name resolution) — was documented as `users_email_unique`
    // until this correction; see file header.
    name: 'email_1',
    collection: COLLECTIONS.users,
    spec: { email: 1 },
    options: { unique: true, name: 'email_1' },
    unique: true,
    purpose: 'Login-lookup performance and uniqueness enforcement.',
    sourceBehaviorPreserved:
      'DR-04, APPROVED 2026-08-21 (Option 1) — see docs/M3-OWNER-DECISION-RECORDS.md DR-04 and ' +
      'docs/GATE-REPORT-M3D-PREMIGRATION.md §2 for the full reasoning and the pre-migration ' +
      'duplicate-email check (819/819 distinct emails, zero duplicates) that satisfied the caveat ' +
      'this decision record raised. This is the one approved index that is NOT purely ' +
      'additive/behavior-neutral versus source, which enforced uniqueness only at the ' +
      "application-validation level (Auth\\RegisterController's unique:users rule), not a database " +
      'constraint — that deviation is accepted as part of this approval. Index NAME resolved to ' +
      '`email_1` (accepting the live auto-generated name) 2026-08-31 — see file header and ' +
      'docs/M3-OWNER-DECISION-RECORDS.md Addendum 2 (2026-08-31).',
  },
  {
    name: 'products_pSlug',
    collection: COLLECTIONS.products,
    spec: { pSlug: 1 },
    unique: false,
    purpose:
      'product-details/{slug} lookups — the single highest-traffic query in the application.',
    sourceBehaviorPreserved:
      'Currently UNINDEXED in MariaDB too (docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md §5) — ' +
      "this index changes performance only, not any result set (contract §5.3's additive-index " +
      'principle, restated for MongoDB per docs/D-11-DATABASE-ARCHITECTURE.md §3). No behavior is ' +
      'being "preserved" in the row-for-row sense; the absence of a corresponding SQL index in ' +
      'source means this cannot change what a query returns, only how fast.',
  },
  {
    name: 'products_pCat_pStatus',
    collection: COLLECTIONS.products,
    spec: { pCat: 1, pStatus: 1 },
    unique: false,
    purpose: 'Category listing pages.',
    sourceBehaviorPreserved:
      "Matches the pattern behind the 6 catalogued groupBy('product_images.p_id') sites " +
      '(docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md §11.2) — purely additive, same reasoning as above.',
  },
  {
    name: 'orders_groupId',
    collection: COLLECTIONS.orders,
    spec: { groupId: 1 },
    unique: false,
    purpose: 'Order lookup and reconstruction by GroupId.',
    sourceBehaviorPreserved:
      '★ The single most-queried relational key in the entire schema (DR-01) — MariaDB has no ' +
      'index on orderproducts.GroupId either (docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md §5), so this ' +
      'is additive infrastructure, not a behavior change.',
  },
  {
    name: 'orderProducts_groupId',
    collection: COLLECTIONS.orderProducts,
    spec: { groupId: 1 },
    unique: false,
    purpose:
      "Order-line reconstruction by GroupId — DR-01 Option B's multi-query join replacement.",
    sourceBehaviorPreserved: 'Same as orders_groupId above.',
  },
  {
    name: 'orderProducts_buyerId',
    collection: COLLECTIONS.orderProducts,
    spec: { buyerId: 1 },
    unique: false,
    purpose: "Buyer's own order-history page.",
    sourceBehaviorPreserved:
      "Matches BuyerController.php:74-78's filter column; additive, not a behavior change.",
  },
  {
    name: 'payments_gid',
    collection: COLLECTIONS.payments,
    spec: { gid: 1 },
    unique: false,
    purpose: 'Cancel-order / payment-status update paths.',
    sourceBehaviorPreserved:
      "DR-01 Option B; additive, matches the source's own GroupId-filtered payments lookup pattern.",
  },
  {
    name: 'posts_diseaseId',
    collection: COLLECTIONS.posts,
    spec: { diseaseId: 1 },
    unique: false,
    purpose: 'The disease-detail post-listing query pattern.',
    sourceBehaviorPreserved: 'Additive; no equivalent SQL index exists in source either.',
  },
  {
    name: 'posts_homeopathyId',
    collection: COLLECTIONS.posts,
    spec: { homeopathyId: 1 },
    unique: false,
    purpose: 'The one leftJoin site (AdminController::EditPost).',
    sourceBehaviorPreserved:
      'Preserves LEFT JOIN semantics at the query layer (a post with no matching homeopathy-master ' +
      'row still resolves, per schemas/post.ts) — the index itself is purely additive, matching ' +
      "the join's existing tolerance for no match, not changing it.",
  },
];

/**
 * Approval-gated unique indexes awaiting a future owner decision.
 *
 * Empty as of 2026-08-21: `users_email_unique` (DR-04) was the only entry
 * this array ever held; it moved into `proposedIndexes` above once DR-04
 * Option 1 was approved (see the file-header comment). Left in place,
 * empty, as the designated location for any future unique-index proposal
 * that needs the same "define now, apply only after explicit approval"
 * treatment — not deleted, since the pattern itself remains valid and
 * `ensureIndexes()`'s contract (§ below) depends on this array staying
 * separate from `proposedIndexes`.
 */
export const proposedUniqueIndexesRequiringApproval: ProposedIndex[] = [];

/**
 * Applies `proposedIndexes` (NEVER `proposedUniqueIndexesRequiringApproval`)
 * to the given database.
 *
 * NOT CALLED ANYWHERE IN M3-A. Exported for M3-B+ to use once a real
 * (development) MongoDB target exists and index creation is in scope. Per
 * the owner's M3-A boundary ("indexes" are allowed to be DESIGNED, this
 * function existing and being unit-testable satisfies that — actually
 * running it against any real database, even a dev one, is a judgment call
 * for whichever phase first needs a working query path, not asserted here
 * as "M3-A work already done").
 */
export async function ensureIndexes(db: Db): Promise<void> {
  for (const { collection, spec, options } of proposedIndexes) {
    await db.collection(collection).createIndex(spec, options);
  }
}
