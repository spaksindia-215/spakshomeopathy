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
}
