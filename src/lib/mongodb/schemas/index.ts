/**
 * Barrel export for all MongoDB document schemas.
 *
 * M3-A SCOPE. See docs/M3-DATABASE-MAPPING.md for the full per-table
 * reasoning behind every schema in this directory, and
 * docs/M3-OWNER-DECISION-RECORDS.md for the 8 decision records governing
 * the ones marked "not yet approved" in their own file headers.
 *
 * NOT YET COVERED (deliberately, not an oversight): a typed schema for
 * every one of the 34 source tables is not required for M3-A's foundation
 * scope. The tables covered here are the ones with either (a) a
 * non-trivial modeling decision worth encoding in types now (users,
 * products, the orders group), (b) the owner's named "critical entities,"
 * or (c) simple enough to add at negligible cost while establishing the
 * pattern (appointments, enquiries, categories, posts, geo, sliders,
 * vestigial). Any table not yet covered can be added following the same
 * pattern established here, when a later phase needs it.
 */

export * from './common';
export * from './user';
export * from './sellerProfile';
export * from './partnerProfile';
export * from './product';
export * from './category';
export * from './order';
export * from './appointment';
export * from './enquiry';
export * from './post';
export * from './slider';
export * from './pinCode';
export * from './geo';
export * from './vestigial';
