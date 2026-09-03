/**
 * `products` (+ embedded `product_images`/`product_review`/
 * `product_specification`) transformation.
 *
 * Mirrors docs/M3-DATABASE-MAPPING.md §1.2. The 10 variant slots are
 * mapped individually, matching schemas/product.ts's explicitly-named
 * fields — NOT collapsed into an array (F-20 forbids restructuring this
 * table).
 */

import type {
  Product,
  ProductImage,
  ProductReview,
  ProductSpecification,
  VariantSlot,
} from '@/lib/mongodb/schemas';
import { toDate, toLegacyId } from '@/lib/mongodb/mapping';
import type { SourceRecord, TransformOutcome } from './types';

function s(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v);
}
function n(v: unknown): number | null {
  return v === null || v === undefined ? null : Number(v);
}

function transformSlot(row: SourceRecord, n_: number): VariantSlot {
  return {
    pImage: s(row[`p_image${n_}`]),
    pName: s(row[`p_name${n_}`]),
    pMrp: n(row[`p_mrp${n_}`]),
    pPrice: n(row[`p_price${n_}`]),
    pDesc: s(row[`p_desc${n_}`]),
  };
}

function transformImage(row: SourceRecord): ProductImage {
  return { legacyId: toLegacyId(row.id as number | string), pImage: s(row.p_image) };
}

function transformReview(row: SourceRecord): ProductReview {
  return {
    legacyId: toLegacyId(row.id as number | string),
    rName: s(row.r_name),
    rEmail: s(row.r_email),
    rRating: n(row.r_rating),
    rReview: s(row.r_review),
    rStatus: n(row.r_status),
  };
}

function transformSpecification(row: SourceRecord): ProductSpecification {
  return {
    legacyId: toLegacyId(row.id as number | string),
    pHeading: s(row.p_heading),
    pSpecification: s(row.p_specification),
  };
}

export function transformProduct(
  row: SourceRecord,
  imageRows: SourceRecord[],
  reviewRows: SourceRecord[],
  specificationRows: SourceRecord[]
): TransformOutcome<Product> {
  const legacyId = row.id;
  if (legacyId === null || legacyId === undefined) {
    return { ok: false, legacyId: null, reason: 'missing id', sourceRecord: row };
  }

  try {
    // pHeading is NOT NULL in source (docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md §6)
    // — if a row somehow has a null/missing p_heading, that is a genuine
    // data-integrity finding to REPORT (see verify stage), not silently
    // default here. Transform still produces a best-effort value ('') so
    // downstream Zod validation is the single place this gets rejected,
    // per this pipeline's "each stage independently testable" design —
    // transformation attempts a mapping, validation judges it.
    const product: Product = {
      legacyId: toLegacyId(legacyId as number | string),
      pCat: n(row.p_cat),
      pSubcat: n(row.p_subcat),
      pOcat: n(row.p_ocat),
      ptype: n(row.ptype),
      pTop: n(row.p_top),
      pTrending: n(row.p_trending),
      pFeatured: n(row.p_featured),
      uid: n(row.uid),
      pName: s(row.p_name),
      pHeading: s(row.p_heading) ?? '',
      pBestimg: s(row.p_bestimg),
      pMrp: n(row.p_mrp),
      pPrice: n(row.p_price),
      pQuantity: n(row.p_quantity),
      pRating: n(row.p_rating),
      pShortDesc: s(row.p_short_desc),
      pDesc: s(row.p_desc),
      pColor: s(row.p_color),
      pSize: s(row.p_size),
      videoLink: s(row.VideoLink),
      reffNo: n(row.reffNo),
      hsnCode: s(row.hsn_code),
      shippingTime: s(row.shipping_time),
      searchTerms: s(row.search_terms),
      pSlug: s(row.p_slug),
      pDesc1: s(row.p_desc1),
      slot2: transformSlot(row, 2),
      slot3: transformSlot(row, 3),
      slot4: transformSlot(row, 4),
      slot5: transformSlot(row, 5),
      slot6: transformSlot(row, 6),
      slot7: transformSlot(row, 7),
      slot8: transformSlot(row, 8),
      slot9: transformSlot(row, 9),
      slot10: transformSlot(row, 10),
      pStatus: n(row.p_status),
      createdAt: toDate(row.created_at as string) ?? new Date(0),
      updatedAt: toDate(row.updated_at as string) ?? new Date(0),
      images: imageRows.map(transformImage),
      reviews: reviewRows.map(transformReview),
      specifications: specificationRows.map(transformSpecification),
    };

    return { ok: true, value: product, legacyId: product.legacyId };
  } catch (e) {
    return {
      ok: false,
      legacyId: legacyId as number | string,
      reason: e instanceof Error ? e.message : String(e),
      sourceRecord: row,
    };
  }
}

/**
 * Batch entry point. Matches `product_images`/`product_review`/
 * `product_specification` rows to their parent product by `p_id`
 * (by-convention, no FK — docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md §4).
 *
 * DOCUMENTED per the owner's §5 orphan-detection instruction (applies to
 * products too, not just the orders group): a `product_images` row whose
 * `p_id` matches no product in `productRows` is silently excluded from
 * every product's `images[]` array by this map-based matching — it is
 * NOT an error at the transform stage (transform never throws for
 * unmatched children), but it MUST be caught by the verify stage's
 * orphan-detection pass (src/lib/migration/verify/orphans.ts), which
 * this function does not perform itself.
 */
export function transformProducts(
  productRows: SourceRecord[],
  imageRows: SourceRecord[],
  reviewRows: SourceRecord[],
  specificationRows: SourceRecord[]
): TransformOutcome<Product>[] {
  const imagesByPid = groupByPid(imageRows);
  const reviewsByPid = groupByPid(reviewRows);
  const specsByPid = groupByPid(specificationRows);

  return productRows.map((row) => {
    const pid = row.id;
    const key = typeof pid === 'number' ? pid : null;
    return transformProduct(
      row,
      key !== null ? (imagesByPid.get(key) ?? []) : [],
      key !== null ? (reviewsByPid.get(key) ?? []) : [],
      key !== null ? (specsByPid.get(key) ?? []) : []
    );
  });
}

function groupByPid(rows: SourceRecord[]): Map<number, SourceRecord[]> {
  const map = new Map<number, SourceRecord[]>();
  for (const row of rows) {
    const pid = row.p_id;
    if (typeof pid !== 'number') continue;
    const existing = map.get(pid);
    if (existing) existing.push(row);
    else map.set(pid, [row]);
  }
  return map;
}
