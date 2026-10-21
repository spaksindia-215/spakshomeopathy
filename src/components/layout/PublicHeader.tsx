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

import { getCartContent, getTotalCartItem } from '@/lib/cart';
import { getDb } from '@/lib/mongodb/client';
import { getSiteSettings } from '@/lib/settings/repository';
import { SiteHeader } from './SiteHeader';


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
