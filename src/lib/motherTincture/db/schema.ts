/**
 * Zod schema for the `motherTinctureProducts` MongoDB collection — the
 * persistence shape backing admin-added Mother Tincture medicines.
 *
 * Deliberately REUSES `productSchema` from `@/lib/mongodb/schemas/product`
 * verbatim (imported, not copy-pasted) rather than redefining the real
 * `Product` shape a second time — the task brief calls for "the smallest
 * sensible subset of it) so merged results are directly usable by
 * `HomeopathyProductCard`/`HomeopathyCatalog`/`AddToCartForm` without
 * adapters". A hand-picked subset would need an adapter (to fill in the 9
 * unused variant slots, `images`/`reviews`/`specifications` arrays, etc.)
 * before it could satisfy `Product` — reusing the full schema and letting
 * the admin form populate only the fields it collects (with empty-slot/
 * empty-array defaults for the rest, same posture as
 * `@/lib/herbs/db/actions.ts`'s "fields the form doesn't collect get sane
 * defaults") is both smaller in code and needs zero adapter function.
 *
 * Kept in its own module tree (`src/lib/motherTincture/db/`), NOT added to
 * `src/lib/mongodb/schemas/` or `collections.ts` — those are the governed,
 * 1:1-traced artifact of the legacy MariaDB schema (see `collections.ts`'s
 * own header). This collection has no legacy table to trace to; admin-
 * added rows are net-new, unmigrated data, same "parallel model" posture
 * as `@/lib/herbs/db/schema.ts`.
 */

import { productSchema } from '@/lib/mongodb/schemas/product';

export const motherTinctureProductDocSchema = productSchema;

export type MotherTinctureProductDoc = ReturnType<typeof motherTinctureProductDocSchema.parse>;
