import { HERB_PRODUCTS } from './data/products';
import { readHerbProductsFromDb } from './db/service';
import type { HerbProduct } from './types';
import type { HerbProductDoc } from './db/schema';

/**
 * SERVER-ONLY entry point for merging the static seed catalogue with any
 * DB-persisted products (CR-003 follow-on: "wire storefront to DB").
 *
 * The `server-only` npm package (which turns an accidental client-side
 * import into a build error) is NOT a dependency of this project and was
 * deliberately not added for this one call site (§46: avoid unnecessary
 * dependencies) — `next`'s own bundled copy exists but isn't resolvable
 * outside its webpack build, so declaring it would need a real
 * `package.json` entry for a guard this file's own naming/doc-comment
 * already communicates. MUST only be imported from a Server Component
 * (every `/herbs/**` page, none of which have `'use client'`) — it calls
 * `readHerbProductsFromDb()`, which touches MongoDB and must never run
 * in the browser. Called ONCE per request/build; the result is passed
 * down as a prop into whichever client component needs it
 * (`HerbCatalog`, `HerbProductDetail`, `HerbsWishlistPage`,
 * `HerbsHeader`) — see `@/lib/herbs/queries`'s own header for why those
 * stay synchronous rather than each fetching independently.
 *
 * DB-saved products are prepended (take precedence in de-duplication by
 * `id`) so an admin edit of a seed-catalogue product's `id` — not
 * possible today since `add-herb` always mints a new `hp-...` id, but a
 * defensive rule worth stating — would show the saved version, not the
 * stale seed one.
 *
 * STATIC GENERATION CAVEAT — read before relying on this in production:
 * when `MONGODB_*` is unset at build time (this sandbox's actual state,
 * and Next's own static-analysis behavior — confirmed this session:
 * `readHerbProductsFromDb()` short-circuits via `isHerbsDbConfigured()`
 * before touching any dynamic API), every `/herbs/**` page calling this
 * still builds as prerendered static HTML (`○`/`●` in `next build`'s
 * route table), same as before this file existed. Once a real database
 * IS configured, those same pages become effectively dynamic (Next
 * detects the awaited MongoDB call) UNLESS each page also sets
 * `export const revalidate = <seconds>` (ISR) — added to every page that
 * calls this function, so admin edits/adds become visible within that
 * window rather than only at the next full rebuild/deploy. Do not remove
 * those `revalidate` exports without understanding this tradeoff.
 */
export async function getMergedHerbCatalog(): Promise<HerbProduct[]> {
  const dbDocs = await readHerbProductsFromDb();
  if (!dbDocs || dbDocs.length === 0) return HERB_PRODUCTS;

  const dbProducts = dbDocs.map(docToProduct);
  const dbIds = new Set(dbProducts.map((p) => p.id));
  const seedRemainder = HERB_PRODUCTS.filter((p) => !dbIds.has(p.id));

  return [...dbProducts, ...seedRemainder];
}

/**
 * `HerbProductDoc` (the Zod-validated persistence shape,
 * `@/lib/herbs/db/schema`) and `HerbProduct` (the UI type,
 * `@/lib/herbs/types`) are deliberately kept as separate types even
 * though their fields are currently identical — the persistence schema
 * is allowed to diverge (e.g. stricter/looser validation) without
 * forcing every UI component's prop type to change. This function is the
 * one place that assumes today's identical shape.
 */
function docToProduct(doc: HerbProductDoc): HerbProduct {
  return doc as HerbProduct;
}
