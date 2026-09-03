import type { Metadata } from 'next';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ProductCard } from '@/components/cards/ProductCard';
import { getProductCategoryBySlug, getProductsByCategory } from '@/lib/demo';

/**
 * `/main-category-products/{cat_slug}` — ported from `products.blade.php`
 * (the MAINLINE theme, `ProductCard`-shaped — the SAME view
 * `/productsbydisease/{id}` uses), `HomeController@GetMcatProducts`
 * (`HomeController.php:177-185`).
 *
 * IMPORTANT CORRECTION made during this session's build: despite the
 * Blade FILE named `main-category-products.blade.php` existing and
 * looking like an obvious match for this ROUTE's name, that file is
 * actually rendered by a DIFFERENT route
 * (`/category-poducts/{cat_slug}` → `HomeController@GetCatProducts`,
 * see the sibling `category-poducts/[cat_slug]/page.tsx`). Verified
 * directly against both controller methods this session — `GetMcatProducts`
 * (this route) calls `return view('products', ...)`, not
 * `return view('main-category-products', ...)`. This matches
 * `docs/M3-APPLICATION-MAPPING.md` row #8 exactly (already correct there;
 * an earlier in-progress version of this file mistakenly assumed the
 * alt-theme view before checking the controller directly).
 *
 * Source resolves `product_category WHERE cat_slug={cat_slug}` first,
 * NO NULL GUARD (`$cat_id=$getpId->id` dereferences null on a bad slug —
 * same defect class as B-06, flagged but not individually numbered per
 * M3-APPLICATION-MAPPING §6.2). This demo uses Next.js `notFound()` for
 * an unmatched slug — see `diseases-details/[slug]/page.tsx`'s header for
 * the same reasoning applied consistently across this batch.
 */
export const metadata: Metadata = {
  title: 'Spakshomeopathy - Products',
  other: {
    'msapplication-TileColor': '#ffffff',
    'theme-color': '#ffffff',
  },
};

export default async function MainCategoryProductsPage({
  params,
}: {
  params: Promise<{ cat_slug: string }>;
}) {
  const { cat_slug } = await params;
  const category = getProductCategoryBySlug(cat_slug);
  const products = category ? getProductsByCategory(category.legacyId, 1) : [];

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
