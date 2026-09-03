import type { Metadata } from 'next';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { AltProductCard } from '@/components/cards/AltProductCard';
import { getProductCategoryBySlug, getProductsByCategory } from '@/lib/demo';

/**
 * `/category-poducts/{cat_slug}` (sic, misspelling preserved) — ported
 * from `main-category-products.blade.php` (411 lines),
 * `HomeController@GetCatProducts` (`HomeController.php:133-151`).
 *
 * See `top-poducts/page.tsx`'s header for the full alt-theme-family
 * writeup (separate CSS/JS stack, mostly 404 in production too) — this
 * page shares that exact same asset/script list and card markup
 * (`AltProductCard`), differing only in its data source (filtered by
 * `product_category` slug instead of `p_top=1`) and breadcrumb.
 *
 * Source resolves `product_category WHERE cat_slug` first, NO NULL GUARD
 * — same pattern as `main-category-products/[cat_slug]/page.tsx`'s
 * sibling route; this demo uses `notFound()`-equivalent (empty product
 * list, not a crash) for an unmatched slug.
 *
 * The real controller SELECTs `products.id as prdc_id` — explains
 * `AltProductCard`'s "Buy Now" form's `prdc_id` reference (a real query
 * alias in source, not a typo) — `AltProductCard` still renders that
 * field empty since the demo `Product` type has no such alias, per that
 * component's own header note.
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

export default async function CategoryProductsPage({
  params,
}: {
  params: Promise<{ cat_slug: string }>;
}) {
  const { cat_slug } = await params;
  const category = getProductCategoryBySlug(cat_slug);
  const products = category ? getProductsByCategory(category.legacyId, 1) : [];

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
                    {/* PRESERVED DEFECT: source's breadcrumb literally reads
                        "Top Products" on this page too — a copy-pasted
                        head/breadcrumb block shared verbatim with
                        top-products.blade.php, not customized per page.
                        Reproduced exactly, not corrected to the real
                        category name. */}
                    <li className="breadcrumb-item active" aria-current="page">
                      Top Products
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
