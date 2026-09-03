import type { Metadata } from 'next';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { AltProductCard } from '@/components/cards/AltProductCard';
import { getProductsByOcat } from '@/lib/demo';

/**
 * `/poducts-list/{cat_slug}` (sic) — ported from `all-products.blade.php`
 * (409 lines), `HomeController@GetAllProducts` (`HomeController.php:153-169`).
 *
 * Same alt-theme card family as `/category-poducts` and `/top-poducts` —
 * see `top-poducts/page.tsx`'s header for the full writeup. Filters by
 * `p_ocat` (a SEPARATE overloaded field from `p_cat`, see
 * `schemas/product.ts`), not `p_cat`.
 *
 * VERIFIED FINDING, this session: `p_ocat` is NULL across ALL 397 real
 * production products — zero exceptions (checked by extracting the full,
 * unfiltered real dump, not just the curated demo subset). This route
 * therefore renders genuinely empty for EVERY possible `cat_slug` in real
 * production, not just an unlucky/invalid one. Consistent with
 * `docs/M3-APPLICATION-MAPPING.md` row #10's own note that this route
 * "confirmed 500 for non-matching slugs" (OI-19) — the underlying data
 * that would make it non-empty appears not to exist at all. This demo
 * reproduces that honestly (an empty grid / "Product Not Available"
 * state for every slug) rather than fabricating `p_ocat` values that
 * don't exist in the real dump.
 *
 * Source resolves `product_category WHERE cat_slug` first, NO NULL GUARD
 * — same pattern as the sibling alt-theme routes.
 */
export const metadata: Metadata = {
  title:
    'Online Shopping Site for Mobiles, Electronics, Furniture, Grocery, Lifestyle, Books & More. Best Offers!',
  description:
    "India's biggest online store for Mobiles, Fashion (Clothes/Shoes), Electronics, Home Appliances, Books, Home, Furniture, Grocery, Jewelry, Sporting goods, Beauty & Personal Care and more! Find the largest selection from all brands at the lowest prices in India. Payment options - COD, EMI, Credit card, Debit card & more.",
  icons: {
    icon: '/assets/img/icon/favicon.jpg',
  },
};

export default async function PoductsListPage({
  params,
}: {
  params: Promise<{ cat_slug: string }>;
}) {
  // cat_slug is resolved to a product_category id in source, then used to
  // filter p_ocat — but p_ocat is always null in real data (see file
  // header), so no product will ever match regardless of the slug. The
  // param is still consumed (satisfying the dynamic route) even though
  // it has no effect on the result, matching the real underlying data.
  await params;
  const products = getProductsByOcat(0);

  return (
    <>
      <link rel="stylesheet" href="/assets/css/bootstrap.min.css" />
      <link rel="stylesheet" href="/assets/css/font-awesome.min.css" />
      <link rel="stylesheet" href="/assets/css/linear-icon.css" />
      <link rel="stylesheet" href="/assets/css/plugins.css" />
      <link rel="stylesheet" href="/assets/css/default.css" />
      <link rel="stylesheet" href="/assets/css/style.css" />
      <link rel="stylesheet" href="/assets/css/responsive.css" />
      <script src="/assets/js/vendor/modernizr-3.5.0.min.js"></script>

      <PublicHeader />

      <div className="breadcrumb-area mb-30">
        <div className="container-fluid">
          <div className="row">
            <div className="col-12">
              <div className="breadcrumb-wrap">
                <nav aria-label="breadcrumb">
                  <ul className="breadcrumb">
                    <li className="breadcrumb-item">
                      <a href="/home">Home</a>
                    </li>
                    <li className="breadcrumb-item active" aria-current="page">
                      Products
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="main-wrapper pt-35">
        <div className="container-fluid">
          <div className="row">
            <div className="col-lg-12">
              <div className="product-shop-main-wrapper mb-50">
                <div className="shop-baner-img mb-70">
                  <a href="#">
                    <img src="/assets/img/banner/category-image.jpg" alt="" />
                  </a>
                </div>

                <div className="shop-product-wrap grid row">
                  {products.length !== 0 ? (
                    products.map((product) => (
                      <AltProductCard product={product} key={product.legacyId} />
                    ))
                  ) : (
                    <div className="product-item">
                      <div className="product-caption">
                        <div className="manufacture-product">
                          <h3>Product Not Available</h3>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="paginatoin-area style-2 pt-35 pb-20">
                  <div className="row">
                    <div className="col-sm-6"></div>
                    <div className="col-sm-6">
                      <div className="pagination-box pagination-style-2 pull-right"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="scroll-top not-visible">
        <i className="fa fa-angle-up"></i>
      </div>

      <PublicFooter />

      <script src="/assets/js/vendor/jquery-1.12.4.min.js"></script>
      <script src="/assets/js/popper.min.js"></script>
      <script src="/assets/js/bootstrap.min.js"></script>
      <script src="/assets/js/plugins.js"></script>
      <script src="/assets/js/ajax-mail.js"></script>
      <script src="/assets/js/main.js"></script>
    </>
  );
}
