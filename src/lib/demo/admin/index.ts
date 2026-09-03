/**
 * Admin demo-data layer — barrel export.
 *
 * ADDED for the M4-DEMO Phase 1 admin UI migration (2026-08-21 owner
 * instruction). Same rationale as `src/lib/demo/index.ts` (the public-site
 * demo layer): every function here is shaped like the equivalent future
 * MongoDB repository/service call would be, real data is sourced from the
 * actual SQL dump via the established `getAcceptedDocuments` pipeline
 * (see `scripts/generate-demo-fixtures.ts`'s header), never invented, and
 * this layer is meant to be swapped for real repository calls later with
 * minimal page-level changes.
 *
 * SEPARATE NAMESPACE from `src/lib/demo/` (the public-site layer) —
 * admin pages import from `@/lib/demo/admin`, never mixing the two. Some
 * admin pages (Products/Categories/Posts/Blog) reuse the PUBLIC demo data
 * directly via `@/lib/demo` instead of this namespace, since the same
 * curated real rows serve both the public site and the admin CRUD views
 * of the same underlying collections — see each admin page's own import
 * list for which source it uses.
 *
 * Regenerate with: `npx tsx scripts/generate-demo-fixtures.ts` (same
 * command as the public layer — one script produces both).
 *
 * Curated selection as of the last run (2026-08-21):
 *   - users: utype=2 filter (matches AdminController@UsersList exactly)
 *     — VERIFIED 0 real rows in production. Confirmed with the owner to
 *     keep this honestly empty rather than switching modules.
 *   - enquiries: first 15 real accepted rows (of 16,386 total).
 *   - pincodes: all 1 real row (full table).
 *   - sliders: all 0 real rows (full table) — matches P-18.
 */

export * from './users';
export * from './enquiries';
export * from './pincodes';
export * from './sliders';
