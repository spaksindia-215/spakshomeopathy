/**
 * Barrel export for the transformation stage.
 *
 * NOT COVERED (DR-02/vestigial group — product_features, product_variations,
 * product_pkg, baskets, sellerPayments, orderFullfill, statusCodes,
 * variations, passwordResets, shipping): schemas exist
 * (src/lib/mongodb/schemas/vestigial.ts) but no transform function is
 * built here. DR-02's placement decision is unresolved
 * (docs/M3-OWNER-DECISION-RECORDS.md), and none of these 10 tables were
 * named in the owner's M3-B "required capabilities" list — this is
 * consistent with that list, not a gap in it. Adding a transform for any
 * of them follows the exact pattern established in simple.ts.
 *
 * seller_profile/banks (VESTIGIAL, combines into sellerProfiles): also
 * not covered this phase for the same reason — not named in the M3-B
 * required-capabilities list.
 */

export * from './types';
export * from './user';
export * from './product';
export * from './category';
export * from './order';
export * from './simple';
