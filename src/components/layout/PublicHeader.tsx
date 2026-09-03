/**
 * Public site header. Ported from `inc/header.blade.php`, verified against a
 * raw (pre-JavaScript) capture of the live production HTML — see
 * `docs/GATE-REPORT-M1.md` §BCN-03 (extended). The local Blade backup is
 * stale: the deployed header has the search form and My-Account submenu
 * commented out server-side. That is reproduced here as JSX comments,
 * consistent with contract §12.4 (commented code renders nothing).
 *
 * MILESTONE 1 SCOPE (auth-conditional My-Account branch): still renders
 * the verified guest state only — UNVERIFIED against production for a
 * logged-in buyer (blocked by OI-1a); see the M1 Gate Report. Unaffected
 * by M5.
 *
 * M5 UPDATE (2026-08-31): the cart badge (`<span class="count">`) now
 * reads the REAL session cart's `TotalCartItem` (`src/lib/cart.ts`'s
 * `getTotalCartItem()`, mirroring `session()->get('TotalCartItem')` —
 * `inc/header.blade.php:119`'s `@if(session()->get('TotalCartItem') ==
 * null){{"0"}}@else{{session()->get('TotalCartItem')}}@endif`, P-08:
 * distinct line count, not total quantity) — no longer hardcoded at 0.
 * This makes `PublicHeader` (and therefore `StickyNavBody`, which renders
 * the badge) an ASYNC Server Component reading `cookies()` via
 * `getCartContent()`; every page that renders `<PublicHeader />` already
 * runs as a dynamic, per-request render (none of this app's pages are
 * statically generated with a cached `PublicHeader` output), so this adds
 * no new caching/staleness concern.
 *
 * ADDENDUM (2026-08-20, UI/visual demo migration session): three anchors
 * below (`href="/"` ×2, plus `href="/productsbydisease/24"` once that
 * route was built later in this same session) were changed from plain
 * `<a>` to `next/link`'s `<Link>`, discovered this session to be REQUIRED
 * for `npm run build` to succeed at all — `next build`'s own ESLint pass
 * (`@next/next/no-html-link-for-pages`, enforced via `next.config.ts`'s
 * explicit `eslint.ignoreDuringBuilds: false`) fails on a plain `<a
 * href="/some-internal-route">`. The `href="/"` cases were found to
 * already be breaking a clean-cache build BEFORE this session's changes
 * (a stale `.next` build cache in prior sessions had masked it); the
 * `/productsbydisease/24` case only started failing once this session
 * built that route (the rule apparently only fires for hrefs matching a
 * route that actually exists in the app). These are the ONLY changes in
 * this file this session — `<Link>` renders an `<a>` in the DOM with the
 * same href/text/classes,
 * so markup output and OI-10/OI-13/OI-14 behavior are unaffected. See
 * `docs/DEMO-UI-MIGRATION-REPORT.md` for the full discovery writeup.
 */

import Link from 'next/link';
import { getCartContent, getTotalCartItem } from '@/lib/cart';

/**
 * Shared inner markup of the sticky nav.
 *
 * OI-10: production ends up with TWO identical <nav> elements (see the
 * comment in PublicHeader). Rendering this once per nav guarantees they
 * stay byte-identical, exactly as jQuery's .clone(true) produced them —
 * a copy-paste duplicate could drift and silently break parity.
 */
async function StickyNavBody() {
  const cartContent = await getCartContent();
  const totalCartItem = getTotalCartItem(cartContent);
  return (
    <>
      <div className="container clearfix">
        {/* Brand and toggle get grouped for better mobile display */}
        <div className="logo-box clearfix">
          <Link className="navbar-brand" href="/">
            <img
              src="/assets/images/resources/logo.png"
              className="main-logo"
              alt="Awesome Image"
            />
          </Link>
          <button className="menu-toggler" data-target=".main-navigation">
            <span className="fa fa-bars"></span>
          </button>
        </div>
        {/* /.logo-box */}
        {/* Collect the nav links, forms, and other content for toggling */}
        <div className="main-navigation">
          <div className="row">
            {/*
                  <div class="wrap">
                      <form name="searchfrm" id="searchfrm" method="POST" action="{{url('search-products')}}">
                          @csrf
                     <div class="search">
                          <select class="searchTerm" name="p_type" id="p_type">
                            <option value="Diseases">Diseases</option>
                            <option value="Herbs">Herbs</option>
                        </select>
                        <input type="text" class="searchTerm" name="p_name" id="p_name" placeholder="Search For Diseases........">
                        <button type="submit" class="searchButton">
                          <i class="fa fa-search"></i>
                       </button>
                     </div>
                  </form>
                  </div>
                  */}

            {/*
                  <ul class=" navigation-box">
                  <li>
                  <a href="#"><i class="fa fa-user-circle-o" aria-hidden="true"></i> Myaccount</a>
                  <ul class="submenu">
                  <li><a href="{{url('register')}}">Register</a></li>
                  <li><a href="{{url('login')}}">Login</a></li>
                  </ul>
                  </li>
                  </ul>
                  */}
          </div>

          {/*
            OI-13: every `</li>` and the next `<li>` are separated by a NEWLINE
            in the Blade source, which HTML collapses to ONE rendered space.
            `<li>` here is `display:inline-block`, so that space is LAYOUT —
            production measures a uniform 35px inter-item gap; without it the
            gap is 32px and the menu creeps 3px left per item (18px total).
            JSX discards whitespace that contains a newline, so each separator
            is reproduced explicitly as {' '}. This is whitespace parity, not
            added spacing — no margin/padding/CSS is introduced.
          */}
          <ul className=" navigation-box">
            <li className="current">
              <Link href="/">Home</Link>
            </li>{' '}
            <li>
              <a href="/about">About Us</a>
            </li>{' '}
            {/* <li><a href="{{url('diseases-list')}}">Diseases</a></li> */}
            <li>
              <Link href="/productsbydisease/24">Herbs</Link>
            </li>{' '}
            <li>
              <a href="http://www.spakshomeopathy.com/public/catalogue-list.pdf">
                Diseases Catalogue
              </a>
            </li>{' '}
            {/* <li><a href="{{url('products')}}"> Herbs and Supplements</a></li> */}
            {/* <li><a href="https://herbandsupplements.com/" target="_blank"> Herbs and Supplements</a></li> */}
            {/* <li><a href="#">Video</a></li> */}
            {/* <li><a href="{{url('videos')}}">Video</a></li> */}
            <li>
              <a href="/video">Video</a>
            </li>{' '}
            {/*
                  <li>
                   <a href="">&#9662;	Catalogue <button class="sub-nav-toggler"> <span class="sr-only">Toggle navigation</span> <span class="icon-bar"></span> <span class="icon-bar"></span> <span class="icon-bar"></span> </button></a>
                                          <ul class="submenu">
                                             <li><a href="http://www.spakshomeopathy.com/public/Mother-Tincture-Price-list.pdf">Mother Tincture Price List</a></li>
                                              <li><a href="http://www.spakshomeopathy.com/public/Potencies-rate-list.pdf">Potencies Rate List </a></li>
                                                  </ul>
                                              </li>
                  */}
            <li>
              <a href="http://www.spakshomeopathy.com/public/Mother-Tincture-Price-list.pdf">
                Mother Tincture
              </a>
            </li>{' '}
            <li>
              <a href="http://www.spakshomeopathy.com/public/Potencies-rate-list.pdf">Potencies</a>
            </li>{' '}
            <li>
              <a href="/contact">Contact Us</a>
            </li>{' '}
            {/*
              CR-003 (docs/CR-003-HERBAL-ECOMMERCE-SECTION.md §10, owner
              amendment 2026-08-30) — ONE new item, appended at the end of
              the list rather than interleaved among the ported items, so
              none of the OI-13 whitespace-parity spacing above is
              disturbed. This is the only change in this file for the
              Herbs Store: no existing <li>, href, or spacing was touched.
            */}
            <li>
              <Link href="/herbs">Herbs Store</Link>
            </li>
          </ul>
        </div>
        {/* /.navbar-collapse */}
        <div className="right-side-box">
          <a className="header-one__shop-btn" href="/cart-list">
            <i className="material-icons">add_shopping_cart</i>{' '}
            <span className="count">{totalCartItem === 0 ? '0' : `${totalCartItem} `}</span>
          </a>
        </div>
      </div>
      {/* /.container */}
    </>
  );
}

export function PublicHeader() {
  return (
    <>
      <section className="topbar-one">
        <div className="container">
          {/* OI-13: newline between each `</li>`/`<li>` in the Blade source
              renders as one space; these items are inline-block, so the space
              is layout (production gap 3px, ours was 0). Reproduced as {' '}. */}
          <ul className="topbar-one__contact col-md-10">
            <li className="topbar-one__contact-item">
              <a href="mailto:spakshomeopathy@gmail.com">
                <i className="material-icons">email</i> spakshomeopathy@gmail.com{' '}
              </a>
            </li>{' '}
            <li className="topbar-one__contact-item">
              {' '}
              <a href="callto:8700458818">
                <i className="material-icons">local_phone</i>+91 8700458818
              </a>
            </li>{' '}
            <li>
              {/* Laravel emits a literal empty style="" attribute here.
                  React's style prop cannot produce a bare empty string;
                  an empty style attribute applies zero declarations and
                  is unobservable in rendered behavior (contract §7.2). */}
              <div id="google_translate_element"></div>
            </li>
          </ul>
          {/* /.topbar-one__contact */}

          <div className="topbar-one__buttons col-md-2">
            <div className="top-account">
              {/*
              <ul>
              <li><a href="{{url('register')}}">Register</a></li>
              <li><a href="{{url('login')}}">Login</a></li>
              </ul>
              */}
            </div>

            <div>
              {' '}
              <a href="/consultancy" className="topbar-one__btn">
                Dr. Consultancy
              </a>
            </div>
          </div>
          {/* /.topbar-one__buttons */}
        </div>
        {/* /.container */}
      </section>

      {/*
      {/*
        OI-10 — STICKY-HEADER CLONE. Option 1 (server-render the clone) was
        ATTEMPTED 2026-08-04 per the owner's architectural decision, and
        PROVEN TECHNICALLY IMPOSSIBLE without editing theme.js. Reverted to a
        single <nav>, matching the Blade source. See docs/GATE-REPORT-M1.md
        §13.2 for the full evidence.

        WHY IT CANNOT WORK
        ------------------
        `public/assets/js/theme.js:193` runs unconditionally on DOM-ready:

            if ($('.stricky').length) {
              $('.stricky').addClass('original').clone(true)
                           .insertAfter('.stricky')
                           .addClass('stricked-menu').removeClass('original');
            }

        The selector is `.stricky`, and BOTH the original and the clone carry
        that class in production. Server-rendering the clone therefore makes
        `$('.stricky')` match TWO elements, so `.clone(true)` produces TWO
        clones instead of one — 2 navs become 4, and with React's
        reconciliation the observed count reached SIX (measured: 2 pre-JS,
        6 after ~700ms).

        Suppressing that would require changing theme.js's selector or adding
        a guard — i.e. modifying a production asset, which contract F-30
        forbids (assets ship unchanged) and IR-8 forbids (no business/behavior
        logic changes without approval).

        THE ACTUAL ROOT CAUSE OF THE 20px (separate from hydration)
        -----------------------------------------------------------
        The missing 20px was NOT the clone. It is `.site-header{padding-top:
        10px; padding-bottom:10px}` — a rule that exists in PRODUCTION's
        style.css (188,980 bytes) but NOT in the stale local backup we copied
        (182,399 bytes). Production's stylesheet is a strict superset: 39
        selectors exist only in production, 0 only locally.

        Verified 2026-08-04 by temporarily serving production's style.css:
        header delta 0, body delta 0 — EXACT parity on /about. The stylesheet
        was then restored so the copied assets stay checksum-clean.

        This is BCN-03 (local backup ≠ deployed code) extending to assets.
        Resolving it requires an owner decision on OI-12.
      */}
      <header className="site-header header-one">
        <nav className="navbar navbar-expand-lg navbar-light header-navigation stricky">
          <StickyNavBody />
        </nav>
      </header>

      <script
        type="text/javascript"
        dangerouslySetInnerHTML={{
          __html: `
function googleTranslateElementInit() {
  new google.translate.TranslateElement({pageLanguage: 'en'}, 'google_translate_element');
}
`,
        }}
      />
      <script
        type="text/javascript"
        src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
      ></script>
    </>
  );
}
