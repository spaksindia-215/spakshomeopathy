import type { Metadata } from 'next';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ProductCard } from '@/components/cards/ProductCard';
import { getDb } from '@/lib/mongodb/client';
import { ProductRepository } from '@/lib/mongodb/repositories/productRepository';

/**
 * `/productsbydisease/{slug}` — ported from `products.blade.php` (96
 * lines), `HomeController@GetProductsbydiseases`.
 *
 * Despite the route param name `{slug}`, source uses it as an INTEGER
 * category id, not a slug string — `products WHERE p_status=1 AND
 * p_cat={slug} ORDER BY id DESC` (docs/M3-APPLICATION-MAPPING.md row #4,
 * a confirmed naming oddity, preserved). This route's dynamic segment is
 * named `[slug]` here only to match the URL shape Next.js needs, matching
 * the Laravel route param's own (misleading) name — its VALUE is parsed
 * as a number below, exactly as source does implicitly via PHP's loose
 * `WHERE p_cat={slug}` comparison.
 *
 * Reuses `ProductCard` directly — this page's card markup is
 * byte-identical to `ProductCard`'s source (confirmed by diff against
 * `products.blade.php:49-67`, the same fragment `ProductCard`'s own file
 * header cites).
 *
 * CR-006 Phase 5 (docs/CR-006-PHASE-5-PLAN.md §3/§4): live-wired from
 * `@/lib/demo`'s `getProductsByCategory` to real MongoDB. This is the ONE
 * catalog page this phase live-wires — deliberately not extended to
 * `products`/`herbs`/other still-demo-backed pages, which is out of this
 * phase's scope (see the plan's §4 "delivers now vs. defers" table).
 *
 * QUERY STRATEGY, DISCLOSED: tries the NEW `findByDiseaseCategoryIds`
 * first (the multi-disease capability this phase adds), and FALLS BACK
 * to the ORIGINAL `findByCategory` (single-`pCat` match) if that returns
 * nothing — because the `diseaseCategoryIds` backfill script
 * (`scripts/backfill-disease-category-ids.ts`) has been WRITTEN BUT NOT
 * YET RUN (owner instruction, §7.3) as of this phase. Once the backfill
 * runs for real, every product will have `diseaseCategoryIds` populated
 * (seeded from its existing `pCat`), and this fallback becomes a no-op in
 * practice — it is not removed preemptively, since removing it before the
 * backfill runs would make this page regress to showing nothing for any
 * product that hasn't been backfilled yet.
 */
export function generateMetadata(): Metadata {
  return {
    title: 'Spakshomeopathy - Products',
    other: {
      'msapplication-TileColor': '#ffffff',
      'theme-color': '#ffffff',
    },
  };
}

export default async function ProductsByDiseasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pCat = Number.parseInt(slug, 10);

  let products: Awaited<ReturnType<ProductRepository['findByCategory']>> = [];
  if (Number.isFinite(pCat)) {
    const db = await getDb();
    const repo = new ProductRepository(db);
    products = await repo.findByDiseaseCategoryIds(pCat, 1);
    if (products.length === 0) {
      // Fallback for not-yet-backfilled products — see file header.
      products = await repo.findByCategory(pCat, 1);
    }
  }

  return (
    <div className="page-wrapper">
      <PublicStylesheets />
      <PublicHeader />
      <Breadcrumb items={[{ label: 'Kit List' }]} />

      <section className="shop-one sec-pad">
        <div className="container">
          <div className="row masonary-layout">
            {products.map((product) => (
              <div className="col-lg-3 col-md-3 col-sm-12" key={product.legacyId}>
                <div className="masonary-item">
                  <ProductCard product={product} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />
      <PublicScripts />
    </div>
  );
}
