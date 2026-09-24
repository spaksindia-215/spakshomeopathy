/**
 * `categories`, `productCategories` data access. See schemas/category.ts
 * for why these are two separate collections, not one.
 */

import type { Db } from 'mongodb';
import { ValidatedRepository } from './base';
import { COLLECTIONS } from '../collections';
import {
  categorySchema,
  productCategorySchema,
  type Category,
  type ProductCategory,
} from '../schemas';

export class CategoryRepository extends ValidatedRepository<Category> {
  constructor(db: Db) {
    super(db, COLLECTIONS.categories, categorySchema);
  }

  /** Mirrors `HomeController::DiseasesList` — `type='N' AND status=1`,
   * `name ASC` (docs/GATE-REPORT-M2's asset-manifest cross-reference notes
   * this exact filter pattern). Sort order is the caller's responsibility
   * (this method returns the filtered set; ordering is applied by the
   * caller via `.sort()` on the returned array or a future query-option
   * parameter — not decided here, M3-A scope is the access layer
   * foundation, not the full query surface). */
  async findByType(type: 'N' | 'H', status = 1): Promise<Category[]> {
    return this.find({ type, status });
  }

  /**
   * M5-C: mirrors `HomeController::SearchProduct`'s "Diseases" branch —
   * `categories WHERE type='N' AND status='1' AND name LIKE '%term%'
   * ORDER BY name ASC` (`HomeController.php:204-206`). The `categories`
   * table is declared `latin1_swedish_ci` (confirmed directly against
   * `Database/db_newhomo.sql` this slice) — a case-INSENSITIVE collation,
   * so MariaDB's `LIKE` here is case-insensitive; `$regex` with the `'i'`
   * flag reproduces that exactly, not a stricter case-sensitive match.
   * Sort order is again the caller's responsibility, per this class's
   * existing convention (see `findByType` above).
   */
  async searchByName(term: string, type: 'N' | 'H' = 'N', status = 1): Promise<Category[]> {
    return this.find({ type, status, name: { $regex: term, $options: 'i' } });
  }

  /**
   * M5-E: mirrors `AdminController::CategorytList` — `orderBy('id','DESC')
   * .paginate(20)`. Pagination NOT implemented — same disclosed precedent
   * as `/manage-orders` (`docs/B-12-RESOLUTION.md` §5): with only 23 real
   * rows in `spaks_dev` (per `docs/M5-PREFLIGHT-AUDIT.md`'s own count),
   * pagination boundaries ARE crossed at page 1/2 (23 > 20), unlike
   * pincode/slider/blog-category's much smaller counts — flagged
   * explicitly in `docs/GATE-REPORT-M5-E-CATEGORIES.md` as a real,
   * currently-unreproduced gap, not silently assumed irrelevant.
   */
  async findAllDescending(): Promise<Category[]> {
    const docs = await this.find({});
    return [...docs].sort((a, b) => b.legacyId - a.legacyId);
  }

  /**
   * M5-E (posts sub-slice): mirrors `AdminController::AddPost`/`SavePost`'s
   * `$getHomo` query — `DB::table('categories')->orderBy('name','ASC')
   * ->get()`, ALL rows, no type/status filter (unlike `findByType`). A
   * DIFFERENT sort from `findAllDescending` (name ASC, not id DESC) — do
   * not conflate the two call sites.
   */
  async findAllByNameAscending(): Promise<Category[]> {
    const docs = await this.find({});
    return [...docs].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  }

  /** Mirrors `AdminController::EditCategory` — `WHERE id = $id`. */
  async findByLegacyId(legacyId: number): Promise<Category | null> {
    return this.findOne({ legacyId });
  }

  /** Resolves a category by its `slug` — used by the `/homeopathy/category/
   * [slug]` and `/diseases-details/[slug]` route params. */
  async findBySlug(slug: string): Promise<Category | null> {
    return this.findOne({ slug });
  }

  /** Mirrors `AdminController::Savecategory`'s `insertGetId`. Source uses
   * `insertGetId` (returns the new auto-increment id) rather than plain
   * `insert` — functionally equivalent here since `nextLegacyIdGeneric()`
   * already computes the id before the insert, so the returned value is
   * known in advance; no behavioral difference results from this
   * MongoDB port not needing an `insertGetId`-equivalent call. */
  async insertCategory(doc: Category): Promise<Category> {
    return this.insertOne(doc);
  }

  /**
   * Mirrors `AdminController::UpdateCategory`'s update
   * (`name`/`image`/`type`/`status`) AND
   * `UpdateCategoryStausActive`/`UpdateCategoryStausInactive` (which only
   * ever set `status`) — all three source methods perform the identical
   * `WHERE id = $id` update shape against different field subsets, so one
   * generic method covers all three call sites, matching this class's
   * existing `updateOne`-based convention from the pincode/slider/
   * blog-category sub-slices. `updatedAt` is NOT part of this signature —
   * `categories` has no `updated_at` column in source at all (confirmed,
   * `schemas/category.ts`'s own header: "categories has NO updated_at
   * column... only default created_at"), a DIFFERENT reason than
   * FIX-004's tables (which DO have the column, just no ON UPDATE
   * clause) — here there is genuinely nothing to bump. */
  async updateCategory(
    legacyId: number,
    fields: Partial<Omit<Category, 'legacyId' | 'createdAt'>>
  ): Promise<void> {
    await this.updateOne({ legacyId }, fields as Partial<Category>);
  }

  // NO deleteCategory method — confirmed no DestroyCategory-equivalent
  // exists in source for the `categories` table (only `product_category`
  // has one, via `AdminController::DestroyCategory`, out of this
  // sub-slice's scope). `cat-list/page.tsx`'s own pre-existing header
  // already documents "Delete action is HTML-commented out in source for
  // this module only" — this repository correctly has no method for an
  // operation that does not exist.
}

export class ProductCategoryRepository extends ValidatedRepository<ProductCategory> {
  constructor(db: Db) {
    super(db, COLLECTIONS.productCategories, productCategorySchema);
  }

  /** Mirrors `HomeController::SubCategory` — resolves a slug, then queries
   * by `parentId` (the self-referential 3-level tree walk,
   * docs/M3-DATABASE-MAPPING.md §2). */
  async findChildren(parentId: number): Promise<ProductCategory[]> {
    return this.find({ parentId });
  }

  /** M5-E (product_category sub-slice): mirrors
   * `AdminController::ProductCategoryList` — `orderBy('id','desc')`, NO
   * `catLevel` filter (all three levels share this one table; this list
   * is top-level-category-labeled in the UI but the query itself doesn't
   * filter by level — verified directly against source, not assumed). */
  async findAllDescending(): Promise<ProductCategory[]> {
    const docs = await this.find({});
    return [...docs].sort((a, b) => b.legacyId - a.legacyId);
  }

  /** Mirrors `AdminController::ProductSubCategoryList` —
   * `where('cat_level','=','2')->orderBy('id','desc')`. */
  async findByLevelDescending(catLevel: number): Promise<ProductCategory[]> {
    const docs = await this.find({ catLevel });
    return [...docs].sort((a, b) => b.legacyId - a.legacyId);
  }

  /** Mirrors `AdminController::AddProductSubCategory` —
   * `where('parent_id','=','0')` (top-level categories only, for the
   * sub-category form's parent dropdown). NOTE: source compares
   * `parent_id` to the STRING `'0'` — MariaDB coerces this to a numeric
   * comparison against the `int` column, so this is NOT a fidelity-
   * relevant distinction; `parentId: 0` here is the correct, equivalent
   * MongoDB query. */
  async findTopLevel(): Promise<ProductCategory[]> {
    return this.find({ parentId: 0 });
  }

  /** Mirrors `AdminController::EditProductCat` — `WHERE id = $id`. Note:
   * this read has NO corresponding update method in this repository —
   * see `save-product-category/route.ts`'s header for why (source itself
   * has no `UpdateProductCategory` method; `edit-product-category`'s own
   * form POSTs to `save-product-category`, which always INSERTS a new
   * row, never updates the one being "edited" — a genuine, previously
   * undocumented defect, preserved faithfully). */
  async findByLegacyId(legacyId: number): Promise<ProductCategory | null> {
    return this.findOne({ legacyId });
  }

  /** Mirrors `AdminController::SaveProductCategory`/`SaveProductSubCat`/
   * `SaveOtherCategory` — all three are a plain `insert()` against this
   * one shared table, differing only in which fields they populate
   * (`catLevel`/`parentId`). One method covers all three call sites. */
  async insertProductCategory(doc: ProductCategory): Promise<ProductCategory> {
    return this.insertOne(doc);
  }

  /** Mirrors `AdminController::DestroyCategory` — the SHARED delete
   * handler for all three category levels (confirmed directly this
   * slice: `product-category-list`/`product-subcategory-list`/
   * `other-category-list` all link to the SAME `destroy-product-category/
   * {id}` route, not level-specific ones). */
  async deleteProductCategory(legacyId: number): Promise<void> {
    await this.deleteOne({ legacyId });
  }
}
