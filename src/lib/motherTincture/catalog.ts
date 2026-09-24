import { getActiveProducts } from '@/lib/homeopathy/liveQueries';
import { readMotherTinctureProductsFromDb } from './db/service';
import type { Product } from '@/lib/mongodb/schemas';

/**
 * SERVER-ONLY entry point merging the real curated homeopathy catalogue
 * (`getActiveProducts()`, 125 real active products) with any admin-added
 * Mother Tincture products persisted via `/admin/add-mother-tincture` —
 * mirrors `@/lib/herbs/catalog.ts#getMergedHerbCatalog()` exactly in
 * shape and caveats (see that file's own header for the full static-
 * generation/ISR caveat, which applies identically here).
 *
 * MUST only be imported from a Server Component — it calls
 * `readMotherTinctureProductsFromDb()`, which touches MongoDB and must
 * never run in the browser. Called ONCE per request from a Server
 * Component page and passed down as a prop (never fetched independently
 * per-component), same rule as `getMergedHerbCatalog()` and
 * `getActiveProducts()` itself.
 *
 * MERGE-INCLUSION DECISION: admin-added Mother Tincture products are
 * merged in here AND used by `/mother-tincture`, `/homeopathy/products`,
 * and `/nutrition` (all three call this function instead of
 * `getActiveProducts()` directly) — per the owner's framing that Mother
 * Tincture is "useful for adding other medicines", i.e. a cross-cutting
 * category, not a siloed product line. An admin-added product is real
 * `Product`-shaped data (this module's whole point — see
 * `@/lib/motherTincture/db/schema.ts`'s header), so showing it everywhere
 * the real catalogue already shows is consistent with how every other
 * real product behaves, not a special case.
 *
 * Real products take precedence in de-duplication by `legacyId` (defensive
 * — admin-added products use a synthetic id namespace starting at 100000,
 * see `db/actions.ts`, so a collision should never actually occur, but
 * the real catalogue winning ties matches `getMergedHerbCatalog()`'s own
 * "DB-saved take precedence" rule inverted for the one case where the
 * real catalogue is the trusted source of truth).
 */
export async function getMergedMotherTinctureCatalog(): Promise<Product[]> {
  const base = await getActiveProducts();
  const dbDocs = await readMotherTinctureProductsFromDb();
  if (!dbDocs || dbDocs.length === 0) return base;

  const baseIds = new Set(base.map((p) => p.legacyId));
  const adminAdded = dbDocs.filter((p) => !baseIds.has(p.legacyId));

  return [...base, ...adminAdded];
}
