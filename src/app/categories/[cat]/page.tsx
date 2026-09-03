import type { Metadata } from 'next';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { getProductCategoryBySlug, getChildProductCategories } from '@/lib/demo';

/**
 * `/categories/{cat}` — ported from `categories.blade.php` (106 lines),
 * `HomeController@SubCategory` (`HomeController.php:188-195`).
 *
 * Alt-theme ("zeintext") family — same asset stack as `/top-poducts`/
 * `/category-poducts`/`/poducts-list` (see `top-poducts/page.tsx`'s
 * header for the full writeup: mostly-404-in-production CSS/JS, jQuery
 * 1.12.4, no overlap with `PublicScripts`/`LegacyScriptRunner`'s fixed
 * list). This page does NOT use `PublicStylesheets`/`PublicScripts`.
 *
 * PRESERVED DEFECTS, verified this session:
 *   - `assets/img/icon/wrapper5.png` (the fixed icon every subcategory
 *     card uses, regardless of the real category) does NOT exist on disk
 *     — confirmed absent, consistent with this family's documented
 *     mostly-404 asset situation (`docs/asset-manifest.md` §4.3).
 *     Referenced verbatim, not substituted.
 *   - Links to `/products/{cat_slug}` — NOT a registered route anywhere
 *     in `routes/web.php` (confirmed against the full 172-route table in
 *     `docs/M3-APPLICATION-MAPPING.md`; the real `/products` route takes
 *     no parameter and renders `herbs-list.blade.php`). This is a broken
 *     link in source itself, reproduced as-is.
 *   - No breadcrumb block exists in this view (unlike most other pages)
 *     — verified, not omitted by this migration.
 *   - Source resolves `product_category WHERE cat_slug={cat}` first, NO
 *     NULL GUARD — same pattern as the sibling alt-theme routes; this
 *     demo renders an empty grid for an unmatched slug rather than
 *     reproducing a crash (consistent with every other dynamic route in
 *     this migration).
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

export default async function CategoriesPage({ params }: { params: Promise<{ cat: string }> }) {
  const { cat } = await params;
  const parent = getProductCategoryBySlug(cat);
  const children = parent ? getChildProductCategories(parent.legacyId) : [];

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
                  {children.map((child) => (
                    <div className="col-lg-3 col-md-4 col-sm-6" key={child.legacyId}>
                      <div className="product-item mb-30">
                        <a href={`/products/${child.catSlug ?? ''}`}>
                          <div className="feature-item">
                            <div className="feature-icon">
                              <img src="/assets/img/icon/wrapper5.png" alt="" />
                            </div>
                            <div className="feature-content">
                              <br />
                              <h4>{child.catName}</h4>
                            </div>
                          </div>
                        </a>
                      </div>
                    </div>
                  ))}
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
