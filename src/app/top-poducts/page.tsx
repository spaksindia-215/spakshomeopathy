import type { Metadata } from 'next';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { AltProductCard } from '@/components/cards/AltProductCard';
import { getTopProducts } from '@/lib/demo';

/**
 * `/top-poducts` (sic — route name misspelling preserved, per F-17) —
 * ported from `top-products.blade.php` (413 lines), `HomeController@TopProducts`
 * (`products` join `product_images` where `p_top=1 AND p_status=1`,
 * `groupBy`, `paginate(60)`).
 *
 * First page in the "alt-theme" (zeintext) family — see
 * `docs/asset-manifest.md` §4 and `AltProductCard.tsx`'s header for the
 * full writeup on this family's separate, mostly-404ing CSS/JS stack.
 * This page does NOT use `PublicStylesheets`/`PublicScripts`/
 * `LegacyScriptRunner` at all — source loads a completely different asset
 * stack (verified: `top-products.blade.php`'s own `<head>`/closing
 * `<script>` list has zero overlap with the public baseline's 9-script
 * list) and a different jQuery build (1.12.4, not the baseline's
 * unversioned `jquery.js`). `inc.header`/`inc.footer` ARE still included
 * (hence `PublicHeader`/`PublicFooter` below), so the DOM legitimately
 * mixes both theme/script stacks simultaneously — reproduced as source
 * has it, not "cleaned up" into one consistent theme.
 *
 * PRESERVED DEFECTS (verified this session):
 *   - `og:title`: "zeintOnline Shopping Site for Mobiles, Electronics,
 *     Furniture, Grocery, Lifestyle, Books & More. Best Offers!ext" — the
 *     literal scrambled string from source (D-M2-09,
 *     `docs/asset-manifest.md` §4.4), NOT a typo introduced by this
 *     migration.
 *   - The favicon (`assets/img/icon/favicon.jpg`) and 4 of the 7 other
 *     zeintext-specific assets 404 in PRODUCTION too (verified,
 *     `docs/asset-manifest.md` §4.3) — referenced verbatim below, not
 *     substituted or omitted.
 *   - The banner image (`assets/img/banner/category-image.jpg`) links to
 *     `href="#"` — a non-functional placeholder link in source.
 */
export const metadata: Metadata = {
  title:
    'Online Shopping Site for Mobiles, Electronics, Furniture, Grocery, Lifestyle, Books & More. Best Offers!',
  description:
    "India's biggest online store for Mobiles, Fashion (Clothes/Shoes), Electronics, Home Appliances, Books, Home, Furniture, Grocery, Jewelry, Sporting goods, Beauty & Personal Care and more! Find the largest selection from all brands at the lowest prices in India. Payment options - COD, EMI, Credit card, Debit card & more.",
  keywords: [
    'Online Shopping in India',
    'online Shopping store',
    'Online Shopping Site',
    'Buy Online',
    'Shop Online',
    'Online Shopping',
    'zeintext',
  ],
  openGraph: {
    // PRESERVED DEFECT — see file header. Not corrected.
    title:
      'zeintOnline Shopping Site for Mobiles, Electronics, Furniture, Grocery, Lifestyle, Books & More. Best Offers!ext',
    description:
      "India's biggest online store for Mobiles, Fashion (Clothes/Shoes), Electronics, Home Appliances, Books, Home, Furniture, Grocery, Jewelry, Sporting goods, Beauty & Personal Care and more! Find the largest selection from all brands at the lowest prices in India. Payment options - COD, EMI, Credit card, Debit card & more.",
    url: 'http://www.zeintext.com',
    images: [{ url: 'http://zeintext.com/assets/img/logo/logo-zeintext.png' }],
  },
  twitter: {
    // Source's literal meta tag is <meta name='twitter:card' content="app">
    // (verified). Next.js's typed Metadata API's 'app' card REQUIRES a
    // `twitter.app` object (iOS/iPad/Google Play app-store ids) — without
    // one, Next's own opengraph.js generator throws internally
    // (`Cannot read properties of undefined (reading 'iphone')`,
    // discovered this session). Source has no such app-store data (it's a
    // website, not an app — the 'app' card value itself looks like a
    // copy-paste artifact from the zeintext template's own origin, not a
    // deliberate choice). Using 'summary' here is the closest value the
    // typed API can actually emit without fabricating app-store ids;
    // this is a tooling constraint, not a fidelity decision — flagged
    // explicitly rather than silently changed.
    card: 'summary',
    site: '@zeintext',
    creator: '@zeintext',
    title:
      'Online Shopping Site for Mobiles, Electronics, Furniture, Grocery, Lifestyle, Books & More. Best Offers!',
    description:
      'Shop for electronics, apparels & more using our zeintext app Free shipping & COD.',
  },
  icons: {
    icon: '/assets/img/icon/favicon.jpg',
  },
};

export default function TopProductsPage() {
  const products = getTopProducts();

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
