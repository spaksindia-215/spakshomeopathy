/**
 * `products` data access.
 *
 * `product_images`/`product_review`/`product_specification` are embedded
 * (docs/M3-DATABASE-MAPPING.md §1.2) — reading a product already returns
 * its images/reviews/specs with it, mirroring the source's most common
 * access pattern (11 of the 37 catalogued join sites are exactly the
 * products⋈product_images pattern) WITHOUT needing a join at all. This is
 * the specific case where "don't blindly translate SQL joins into
 * inefficient MongoDB queries" (owner's DR-01 instruction, applied
 * project-wide, not just to the orders group) is most directly realized —
 * embedding here converts what was N join sites in Laravel into zero joins
 * in MongoDB, a genuine, documented, and approved simplification (§1.2 of
 * the mapping document), not a silent one.
 */

import type { Db } from 'mongodb';
import { ValidatedRepository } from './base';
import { COLLECTIONS } from '../collections';
import { productSchema, type Product } from '../schemas';

export class ProductRepository extends ValidatedRepository<Product> {
  constructor(db: Db) {
    super(db, COLLECTIONS.products, productSchema);
  }

  /**
   * Mirrors `HomeController::ProductDetail` (`product-details/{slug}`) —
   * the single highest-traffic product query in the application
   * (blueprint's own "most intricate page" framing, §22 M3).
   */
  async findBySlug(pSlug: string): Promise<Product | null> {
    return this.findOne({ pSlug });
  }

  /**
   * Mirrors the `pCat`-filtered listing queries (`GetCatProducts`,
   * `GetAllProducts`, `TopProducts` — the 3 catalogued groupBy sites in
   * HomeController.php that this embedding eliminates the need for; see
   * docs/M3-DATABASE-MAPPING.md §1.2's "groupBy... becomes unnecessary"
   * note).
   *
   * REMINDER (file header, schemas/product.ts): `pCat` is OVERLOADED —
   * resolves against `categories.legacyId` in some call sites,
   * `productCategories.legacyId` in others. This function does not
   * disambiguate; the CALLER must know which reading applies, exactly as
   * each Laravel controller method does today.
   */
  async findByCategory(pCat: number, pStatus = 1): Promise<Product[]> {
    return this.find({ pCat, pStatus });
  }

  /**
   * CR-006 Phase 5 (docs/CR-006-PHASE-5-PLAN.md §2.1) — GENUINELY NEW
   * capability, not a mirror of any single Laravel query. Finds products
   * whose `diseaseCategoryIds` array CONTAINS `categoryId`, via MongoDB's
   * implicit array-element match (`{ diseaseCategoryIds: categoryId }`
   * matches any document where the field is an array containing that
   * value — no `$elemMatch`/`$in` needed for a single scalar target).
   *
   * DOES NOT REPLACE `findByCategory` above: that method (and every
   * existing caller of it) is UNCHANGED and continues to serve the
   * original, still-live single-`pCat` read paths untouched. This is an
   * ADDITIVE alternative for callers that want the new multi-disease
   * capability specifically (currently: `productsbydisease/[slug]`,
   * post-Phase-5 live-wiring).
   *
   * PRE-BACKFILL BEHAVIOR, DISCLOSED: a product that predates the
   * `diseaseCategoryIds` backfill (`scripts/backfill-disease-category-ids.ts`,
   * written this phase but NOT YET RUN per the owner's explicit
   * instruction) has no `diseaseCategoryIds` field at all and will NOT be
   * found by this method, even if its `pCat` would have matched
   * `findByCategory`. Callers migrating a page from `findByCategory` to
   * this method should fall back to `findByCategory` when this method
   * returns no results, until the backfill has actually been run — this
   * is exactly what `productsbydisease/[slug]/page.tsx` does; see that
   * file's own header.
   */
  async findByDiseaseCategoryIds(categoryId: number, pStatus = 1): Promise<Product[]> {
    return this.find({ diseaseCategoryIds: categoryId, pStatus });
  }

  /**
   * Mirrors the `products.id` join half of `ManageOrders`'
   * (`orderproducts JOIN products ON orderproducts.ProductId = products.id`,
   * `BuyerController.php:73`) and B-12's corrected `view-order` lookup
   * (see `docs/B-12-RESOLUTION.md`) — both need one product by its
   * `legacyId` (== `products.id` in source), not by slug or category.
   * Added this slice; batch-fetch by `$in` is used at the CALL SITE
   * (`orderService.ts`) for the order-listing page rather than N
   * sequential single-id lookups — documented there, not here, since the
   * batching decision belongs to the caller that knows it needs N ids at
   * once.
   */
  async findByLegacyId(legacyId: number): Promise<Product | null> {
    return this.findOne({ legacyId });
  }

  /**
   * Batch-fetch companion to `findByLegacyId` — mirrors the same join
   * intent as above, but for N products at once (the order-listing page's
   * actual need: one product per order line, not one at a time). Uses
   * MongoDB's `$in` instead of N sequential `findOne` calls or a SQL
   * join — the documented MongoDB-specific technique the DR-01
   * implementation rule explicitly calls out as preferred
   * ("Do not blindly translate SQL joins into inefficient MongoDB
   * queries").
   */
  async findByLegacyIds(legacyIds: number[]): Promise<Product[]> {
    if (legacyIds.length === 0) return [];
    return this.find({ legacyId: { $in: legacyIds } });
  }

  /**
   * M5-C: mirrors `HomeController::SearchProduct`'s Herbs (`else`) branch —
   * `products WHERE p_status=1 AND p_cat='24' AND p_name LIKE '%term%'
   * ORDER BY id DESC` (`HomeController.php:212-217`). B-14 (contract
   * §BROKEN register, R-15): `p_cat` is HARDCODED to 24 in source, not
   * derived from anything — reproduced verbatim, not fixed, per the
   * contract's own explicit instruction ("Reproduce both the stray echo
   * and the hardcoded 24. Flag."). `products` is `latin1_swedish_ci`
   * (confirmed directly against `Database/db_newhomo.sql` this slice) —
   * case-insensitive, matching `$regex`'s `'i'` flag here, same reasoning
   * as `CategoryRepository.searchByName()`. Pagination (`->paginate(24)`)
   * is NOT implemented — consistent with this codebase's existing,
   * disclosed precedent (`docs/B-12-RESOLUTION.md` §5: `/manage-orders`'
   * pagination also not implemented, since no real account/query currently
   * needs it).
   */
  async searchByCategoryAndName(pCat: number, term: string, pStatus = 1): Promise<Product[]> {
    return this.find({ pCat, pStatus, pName: { $regex: term, $options: 'i' } });
  }

  /**
   * CR-006 Phase 7 — every product, unfiltered. Needed by the new
   * `/admin/review-list` screen, which must flatten EVERY product's
   * embedded `reviews` array into one list, mirroring
   * `ReviewList()`'s `product_review JOIN products` (no `p_status`/
   * `pCat` filter in that source query — see
   * `AdminController.php:1295-1301`). Thin wrapper, same shape as
   * `HerbProductRepository.findAll()`.
   */
  async findAll(): Promise<Product[]> {
    return this.find({});
  }

  /**
   * CR-006 Phase 7 — mirrors `ReviewUpdate($id, $status)`
   * (`AdminController.php:1303-1308`): toggles one review's `rStatus`
   * (0/1) without touching the rest of the product document.
   *
   * Uses a positional array-filtered update (`arrayFilters`) rather than
   * `ValidatedRepository.updateOne` — that method's `$set` is a flat,
   * whole-document field replace and has no way to target one element
   * inside an embedded array. This is new, narrowly-scoped surface area
   * (docs/CR-006-PHASE-7-PLAN.md §2.1); no other array field in this
   * codebase has needed element-level patching yet — every other array
   * field added so far (`diseaseCategoryIds`, etc.) is replaced wholesale.
   *
   * Does not re-validate the merged document against `productSchema`
   * (the same disclosed limitation `ValidatedRepository.updateOne`'s own
   * header already carries) — callers that need a validated read-back
   * should `findByLegacyId` again after calling this.
   *
   * CR-006 Phase 9: calls `this.logMutation()` directly, since this
   * bypasses the base class's own instrumented `updateOne` for the
   * reason explained above.
   */
  async updateReviewStatus(
    productLegacyId: number,
    reviewLegacyId: number,
    rStatus: number
  ): Promise<void> {
    await this.collection.updateOne(
      { legacyId: productLegacyId },
      { $set: { 'reviews.$[r].rStatus': rStatus } },
      { arrayFilters: [{ 'r.legacyId': reviewLegacyId }] }
    );
    await this.logMutation('update', productLegacyId, [`reviews[${reviewLegacyId}].rStatus`]);
  }
}
