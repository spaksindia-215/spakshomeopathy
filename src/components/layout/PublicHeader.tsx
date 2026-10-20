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
import { getDb } from '@/lib/mongodb/client';
import { getSiteSettings } from '@/lib/settings/repository';
import { LanguageSwitcher } from './LanguageSwitcher';
import { SiteHeader } from './SiteHeader';

/**
 * SITE SETTINGS WIRING (Site Settings feature): the topbar email/phone
 * (previously hardcoded below) now read from `getSiteSettings()`
 * (`src/lib/settings/repository.ts`), admin-editable at
 * `/admin/site-settings` — same wiring rationale as `PublicFooter.tsx`'s
 * header comment. `PublicHeader` was already forced async by the M5 cart
 * badge change (see file header above), so this adds no new async
 * surface.
 */

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
          <a
            className="navbar-brand"
            href="https://www.spakshomeopathy.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="/assets/images/resources/logo.png"
              className="main-logo"
              alt="Awesome Image"
            />
          </a>
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
            {/*
              Consolidated per owner request (2026-09-07): About Us, Herbs,
              Diseases Catalogue, Video, and Herbs Store no longer sit as
              separate top-level items — they're grouped under one "Menu"
              dropdown placed immediately before Mother Tincture. Reuses the
              theme's existing `.submenu` hover-dropdown CSS (see
              public/assets/css/style.css `ul.navigation-box > li > .submenu`,
              previously only exercised by the commented-out Myaccount/
              Catalogue submenus above) — no new styles added.
            */}
            <li>
              <a href="#">
                Menu <button className="sub-nav-toggler"> <span className="sr-only">Toggle navigation</span> <span className="icon-bar"></span> <span className="icon-bar"></span> <span className="icon-bar"></span> </button>
              </a>
              <ul className="submenu">
                <li>
                  <a href="/about">About Us</a>
                </li>
                <li>
                  <Link href="/productsbydisease/24">Herbs</Link>
                </li>
                <li>
                  <a href="http://www.spakshomeopathy.com/public/catalogue-list.pdf">
                    Diseases Catalogue
                  </a>
                </li>
                <li>
                  <a href="/video">Video</a>
                </li>
                <li>
                  <Link href="/herbs">Herbs Store</Link>
                </li>
              </ul>
            </li>{' '}
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
            </li>
            {/*
              CR-003 (docs/CR-003-HERBAL-ECOMMERCE-SECTION.md §10, owner
              amendment 2026-08-30) originally appended Herbs Store here as
              its own top-level item. 2026-09-07 consolidation folded it
              into the new "Menu" dropdown above instead (see that comment)
              — kept out of the top-level list so it isn't duplicated.
            */}
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

export async function PublicHeader() {
  const db = await getDb();
  const settings = await getSiteSettings(db);
  const cartContent = await getCartContent();
  const totalCartItem = getTotalCartItem(cartContent);

  return (
    <SiteHeader
      contactEmail={settings.contactEmail}
      contactPhone={settings.contactPhone}
      cartCountOverride={totalCartItem}
    />
  );
}
