/**
 * `categories`, `productCategories` transformation. Two independent
 * trees — see schemas/category.ts for why they are not merged.
 */

import type { Category, ProductCategory } from '@/lib/mongodb/schemas';
import { toDate, toLegacyId } from '@/lib/mongodb/mapping';
import type { SourceRecord, TransformOutcome } from './types';

function s(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v);
}
function n(v: unknown): number | null {
  return v === null || v === undefined ? null : Number(v);
}

export function transformCategory(row: SourceRecord): TransformOutcome<Category> {
  const legacyId = row.id;
  if (legacyId === null || legacyId === undefined) {
    return { ok: false, legacyId: null, reason: 'missing id', sourceRecord: row };
  }
  try {
    const type = row.type;
    if (type !== 'N' && type !== 'H') {
      return {
        ok: false,
        legacyId: legacyId as number,
        reason: `type is not 'N' or 'H' (NOT NULL enum in source): got ${JSON.stringify(type)}`,
        sourceRecord: row,
      };
    }
    const category: Category = {
      legacyId: toLegacyId(legacyId as number),
      name: s(row.name),
      image: s(row.image),
      slug: s(row.slug), // P-07: unsanitized — preserved as-is, not cleaned up
      type,
      status: n(row.status),
      createdAt: toDate(row.created_at as string) ?? new Date(0),
    };
    return { ok: true, value: category, legacyId: category.legacyId };
  } catch (e) {
    return {
      ok: false,
      legacyId: legacyId as number,
      reason: e instanceof Error ? e.message : String(e),
      sourceRecord: row,
    };
  }
}

export function transformProductCategory(row: SourceRecord): TransformOutcome<ProductCategory> {
  const legacyId = row.id;
  if (legacyId === null || legacyId === undefined) {
    return { ok: false, legacyId: null, reason: 'missing id', sourceRecord: row };
  }
  try {
    const productCategory: ProductCategory = {
      legacyId: toLegacyId(legacyId as number),
      parentId: n(row.parent_id), // self-referential tree pointer, preserved as-is
      catName: s(row.cat_name) ?? '', // NOT NULL in source
      catImage: s(row.cat_image),
      catLevel: n(row.cat_level),
      catSlug: s(row.cat_slug),
      catStatus: n(row.cat_status),
      createdAt: toDate(row.created_at as string),
      updatedAt: toDate(row.updated_at as string),
    };
    return { ok: true, value: productCategory, legacyId: productCategory.legacyId };
  } catch (e) {
    return {
      ok: false,
      legacyId: legacyId as number,
      reason: e instanceof Error ? e.message : String(e),
      sourceRecord: row,
    };
  }
}

export function transformCategories(rows: SourceRecord[]): TransformOutcome<Category>[] {
  return rows.map(transformCategory);
}

export function transformProductCategories(
  rows: SourceRecord[]
): TransformOutcome<ProductCategory>[] {
  return rows.map(transformProductCategory);
}
