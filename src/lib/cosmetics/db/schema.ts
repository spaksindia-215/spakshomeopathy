/**
 * Zod schema for the `cosmeticsProducts` MongoDB collection — the
 * persistence shape backing admin-added Cosmetics products.
 *
 * Deliberately REUSES `productSchema` from `@/lib/mongodb/schemas/product`
 * verbatim, same rationale as `@/lib/motherTincture/db/schema.ts`'s
 * header: this collection has no legacy table to trace to (per
 * `/homeopathy/cosmetics/page.tsx`'s own prior header comment — "no real
 * Cosmetics product line in the migrated data yet... will be added later
 * via an admin panel"), and reusing the full real `Product` shape means
 * merged results are directly usable by `HomeopathyProductCard`/
 * `HomeopathyCatalog` with zero adapter function.
 *
 * Kept in its own module tree (`src/lib/cosmetics/db/`), NOT added to
 * `src/lib/mongodb/schemas/`/`collections.ts` — same "parallel model,
 * no legacy table" posture as Herbs and Mother Tincture.
 */

import { productSchema } from '@/lib/mongodb/schemas/product';

export const cosmeticsProductDocSchema = productSchema;

export type CosmeticsProductDoc = ReturnType<typeof cosmeticsProductDocSchema.parse>;
