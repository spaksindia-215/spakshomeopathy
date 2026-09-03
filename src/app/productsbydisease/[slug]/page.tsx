import type { Metadata } from 'next';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ProductCard } from '@/components/cards/ProductCard';
import { getProductsByCategory } from '@/lib/demo';

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
 * A `productsbydisease-24` baseline screenshot exists, but VERIFIED this
 * session by extracting the real dump: pCat=24 has ZERO real products in
 * production — the baseline was very likely captured against a
 * genuinely-empty category page. Rather than fabricate products under
 * pCat=24, the curated demo data ensures pCat=1 (the best-represented
 * real category, 34 real products) is fully populated instead —
 * `/productsbydisease/1` shows real, non-empty content;
 * `/productsbydisease/24` correctly renders empty, matching real data.
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
  const products = Number.isFinite(pCat) ? getProductsByCategory(pCat, 1) : [];

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
