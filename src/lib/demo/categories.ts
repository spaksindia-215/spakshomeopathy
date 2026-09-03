/**
 * Category demo-data accessors. See products.ts's header for the general
 * "shaped like the future repository call" rationale — this file mirrors
 * `CategoryRepository`/`ProductCategoryRepository`
 * (src/lib/mongodb/repositories/categoryRepository.ts).
 *
 * DATA SOURCE: `categories.generated.ts`/`productCategories.generated.ts`,
 * produced by scripts/generate-demo-fixtures.ts from the REAL SQL dump —
 * see that script's header. Both are the FULL real table content (small
 * tables), not a curated sample — so pages needing the complete disease/
 * herb/marketplace tree (diseases-list, herbs-list, all-diseases) show
 * real, complete data, not a partial demo slice.
 */

import { DEMO_CATEGORIES } from './categories.generated';
import { DEMO_PRODUCT_CATEGORIES } from './productCategories.generated';
import type { Category, ProductCategory } from '../mongodb/schemas';

export function getAllCategories(): Category[] {
  return DEMO_CATEGORIES;
}

/** Mirrors `CategoryRepository.findByType` — HomeController::DiseasesList's
 * `type='N' AND status=1` filter (or 'H' for herbs-list). */
export function getCategoriesByType(type: 'N' | 'H', status = 1): Category[] {
  return DEMO_CATEGORIES.filter((c) => c.type === type && c.status === status);
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return DEMO_CATEGORIES.find((c) => c.slug === slug);
}

export function getCategoryByLegacyId(legacyId: number): Category | undefined {
  return DEMO_CATEGORIES.find((c) => c.legacyId === legacyId);
}

export function getAllProductCategories(): ProductCategory[] {
  return DEMO_PRODUCT_CATEGORIES;
}

export function getProductCategoryBySlug(slug: string): ProductCategory | undefined {
  return DEMO_PRODUCT_CATEGORIES.find((c) => c.catSlug === slug);
}

export function getProductCategoryByLegacyId(legacyId: number): ProductCategory | undefined {
  return DEMO_PRODUCT_CATEGORIES.find((c) => c.legacyId === legacyId);
}

/** Mirrors `ProductCategoryRepository.findChildren` — HomeController::SubCategory. */
export function getChildProductCategories(parentId: number): ProductCategory[] {
  return DEMO_PRODUCT_CATEGORIES.filter((c) => c.parentId === parentId);
}
