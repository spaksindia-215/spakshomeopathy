import { readCosmeticsProductsFromDb } from './db/service';
import type { Product } from '@/lib/mongodb/schemas';

/**
 * SERVER-ONLY entry point for the Cosmetics product line — mirrors
 * `@/lib/motherTincture/catalog.ts#getMergedMotherTinctureCatalog()` in
 * shape, but WITHOUT merging in the real curated catalogue as a base:
 * unlike Mother Tincture (framed by the owner as "useful for adding other
 * medicines", a cross-cutting category shown alongside the main
 * catalogue), Cosmetics is its own distinct product line with no real
 * curated products behind it at all (see `/homeopathy/cosmetics/page.tsx`'s
 * prior header comment) — admin-added Cosmetics products are the ENTIRE
 * pool, not an addition to another one.
 *
 * MUST only be imported from a Server Component — it calls
 * `readCosmeticsProductsFromDb()`, which touches MongoDB and must never
 * run in the browser. Called ONCE per request from a Server Component
 * page and passed down as a prop.
 */
export async function getCosmeticsCatalog(): Promise<Product[]> {
  const dbDocs = await readCosmeticsProductsFromDb();
  return dbDocs ?? [];
}
