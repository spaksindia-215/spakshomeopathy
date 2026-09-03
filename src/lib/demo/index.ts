/**
 * Demo-data layer — barrel export.
 *
 * ADDED for the "UI/visual demo migration" milestone (2026-08-20 owner
 * instruction): "The immediate goal is NOT MongoDB... build the COMPLETE
 * VISUAL/UI MIGRATION... Use STATIC MOCK DATA ONLY where real database
 * data is required... Do not invent random content if equivalent content
 * already exists... The mock-data layer must be clearly isolated so it
 * can later be replaced by MongoDB repositories/API calls."
 *
 * THIS LAYER IS TEMPORARY BY DESIGN. Every function exported here is
 * deliberately shaped like the equivalent MongoDB repository method
 * already built (or planned) in `src/lib/mongodb/repositories/` — same
 * name pattern, same parameters, same return shape (real `Product`/
 * `Category`/`Post`/etc. types from `src/lib/mongodb/schemas/`, not an
 * ad-hoc demo-only shape). Swapping a page from demo data to a real
 * database call later should mean changing ONE import line
 * (`import { getProductBySlug } from '@/lib/demo'` →
 * `import { getProductBySlug } from '@/lib/mongodb/repositories/...'`,
 * or a thin service function that does the same), not rewriting the page.
 *
 * NEVER import anything from this directory into `src/lib/mongodb/` or
 * `src/lib/services/` — the dependency direction is one-way (pages depend
 * on demo data; demo data does not become part of the real data layer).
 *
 * ============================================================================
 * DATA PROVENANCE — real, not invented
 * ============================================================================
 * Every `*.generated.ts` file in this directory was produced by
 * `scripts/generate-demo-fixtures.ts`, which pulls REAL rows out of the
 * REAL production SQL dump (`Database/db_newhomo.sql`) via
 * `getAcceptedDocuments` (src/lib/migration/documents.ts) — the exact same
 * extraction/transformation/validation pipeline every other M3 migration
 * tool in this codebase trusts. No field in a `.generated.ts` file was
 * hand-typed or invented.
 *
 * Regenerate with:
 *   npx tsx scripts/generate-demo-fixtures.ts
 *
 * This OVERWRITES the `.generated.ts` files with a fresh extraction using
 * the same curation rules (see that script's own header for the exact
 * criteria). Review the diff before committing a regeneration — the
 * curation constants can be edited in the script itself to change which
 * real rows are selected.
 *
 * Curated selection as of the last run (2026-08-20):
 *   - categories: all 23 real rows (disease + herb trees, full table).
 *     NOTE: all 23 are `type='N'` (disease) — VERIFIED zero `type='H'`
 *     (herb) categories exist in real production data. `/products`
 *     (herbs-list) therefore renders a real, honest EMPTY grid — this is
 *     not a bug in the demo, it reflects the actual source data.
 *   - productCategories: all 675 real rows (marketplace tree, full table)
 *   - products: 125 real rows, name-matched against a curated list
 *     (Agaricus, Bryonia, Colchicum, Arnica, Belladonna, Nux Vomica,
 *     Pulsatilla, Sulphur, Rhus Tox, Calcarea, Ignatia, Lycopodium, Sepia,
 *     Phosphorus, Natrum Mur) PLUS every real product with pCat=1 (the
 *     best-represented category, 34 real rows — ensures
 *     `/productsbydisease/1` has real, non-empty content). Agaricus/
 *     Bryonia/Colchicum were chosen specifically because
 *     `baseline/screenshots/` already has production captures named
 *     `product-details-agaricus`/`-bryonia`/`-colchicum` — so the
 *     product-detail demo page can be visually diffed against a real
 *     production screenshot of the SAME product, not just a similar one.
 *     NOTE: an existing baseline is named `productsbydisease-24`, but
 *     pCat=24 was VERIFIED to have zero real products in production —
 *     the curation deliberately uses pCat=1 instead of fabricating
 *     products under pCat=24 to force a match that source itself
 *     doesn't have.
 *   - posts: first 15 real accepted rows (of 414 total) — no special
 *     curation criteria beyond "real and validated."
 *   - homeopathyMaster: all 150 real rows (full table).
 *   - statezones: all 36 real rows (full table).
 *
 * Since `categories.generated.ts` is the FULL real table (not curated),
 * it already contains "Bones" (legacyId 1), "Brain" (legacyId 2), and
 * "Cancer Diseases" among its 23 rows — confirmed present, usable directly
 * for the diseases-details-bones/-brain/-cancer baseline comparisons. Note
 * the real slugs carry a random suffix (e.g. `bones-16396`), not a bare
 * `bones` — check the actual slug value when building a route that needs
 * to match a specific baseline filename.
 */

export * from './products';
export * from './categories';
export * from './posts';
export * from './geo';
export * from './cart';
export * from './blogs';
