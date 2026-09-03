/**
 * `POST /search-products` — mirrors `routes/web.php:82`
 * (`Route::post('search-products','HomeController@SearchProduct')`)
 * exactly, including its cataloged BROKEN behavior (B-14, contract §BROKEN
 * register, R-15).
 *
 * SOURCE (`HomeController.php:198-220`, verified directly this slice):
 *
 *   public function SearchProduct(Request $req) {
 *     $req->p_type;
 *     if ($req->p_type == 'Diseases') {
 *       $p_name = $req->p_name;
 *       $getCat = DB::table('categories')->where('type','=','N')
 *         ->where('status','=','1')
 *         ->where('categories.name','like','%'.$p_name.'%')
 *         ->orderBy('name','ASC')->get();
 *       return view('diseases-list', ['getCat' => $getCat]);
 *     } else {
 *       echo $p_name = $req->p_name;
 *       $getPData = DB::table('products')->where('products.p_status','=',1)
 *         ->where('products.p_cat','=','24')
 *         ->where('products.p_name','like','%'.$p_name.'%')
 *         ->orderBy('products.id','DESC')->paginate(24);
 *       return view('products', ['getPData' => $getPData]);
 *     }
 *   }
 *
 * B-14 (MUST be reproduced, not fixed — MIGRATION-CONTRACT.md's BROKEN
 * register + blueprint.md R-15's explicit instruction: "Reproduce both the
 * stray echo and the hardcoded 24. Flag."), Herbs (`else`) branch ONLY —
 * the Diseases branch has no stray output, verified by direct re-reading
 * this slice:
 *   1. `echo $p_name = $req->p_name;` writes the raw, UNESCAPED search
 *      term directly to the response stream BEFORE `view('products', ...)`
 *      is returned — Laravel does not discard or buffer this; a real
 *      visitor sees the raw term as plain text prepended above the
 *      `products.blade.php` page, in the same PHP response (this is a
 *      single request/response cycle in source — NOT a redirect).
 *   2. The Herbs branch filters `p_cat='24'`, HARDCODED — never the
 *      category the user is actually searching within (there is no
 *      category context in this branch's request at all). Verified this
 *      slice: `spaks_dev`'s current `categories` collection has no
 *      document with `legacyId: 24` (confirmed via the demo-fixture
 *      snapshot, itself sourced from a real production dump), and
 *      `productsbydisease/[slug]/page.tsx`'s own header comment
 *      independently confirms `pCat=24` has ZERO real products in
 *      production — so this branch is expected to return an empty result
 *      set against real data today, not a bug introduced by this port.
 *
 * NO UI ENTRY POINT — DELIBERATE, MATCHES REAL PRODUCTION: the header
 * search form (`inc/header.blade.php`'s `#searchfrm`, the only form in
 * Laravel that ever posts to this route) is HTML-commented-out in source
 * AND confirmed absent from a real, live production HTML capture
 * (`docs/BCN-HEADER-SEARCH-FORM-RESOLUTION.md`, 2026-08-16 — a genuine
 * production capture, not just a source-file reading). `PublicHeader.tsx`
 * already, correctly, reproduces this exact commented-out state
 * (unmodified by this slice). This route and `/search-results` therefore
 * exist as real, live, working infrastructure with NO discoverable UI path
 * to reach them on either the real site or this port — the same
 * "Public, LIVE-orphan" pattern already established for `/seller-register`
 * (`docs/M3-APPLICATION-MAPPING.md` row #17). Un-commenting the header form
 * would be inventing new UX Laravel does not currently expose, out of this
 * slice's scope.
 *
 * OWNER-APPROVED DATA SOURCE (2026-08-26): live `spaks_dev`, not the
 * demo-fixture pattern the rest of the still-fixture-based catalog uses —
 * consistent with M5-A/M5-B, which both extended live-data code paths, not
 * new fixture consumers. This is a deliberate inconsistency with
 * `/products`, `/diseases-list` (both still fixture-backed for their
 * OWN direct-navigation rendering) accepted explicitly by the owner for
 * this slice, not defaulted into.
 *
 * REDIRECT, NOT DIRECT RENDER: a route.ts handler cannot render JSX, and a
 * route.ts/page.tsx cannot coexist at one URL segment (confirmed directly
 * during M4's `change-password`/`update-password` route-collision
 * investigation) — so this redirects to a results page instead, matching
 * the "distinct mechanism, same observable outcome" precedent already
 * established for session.ts/orderToken.ts/csrf.ts:
 *   - Diseases branch → `/diseases-list` (already exists; extended this
 *     slice to accept an optional `p_name` query param — see that page's
 *     own header). No echo to carry (source has none on this branch).
 *   - Herbs branch → `/search-results` (NEW, owner-approved URL,
 *     2026-08-26 — no existing Next.js page renders `products.blade.php`'s
 *     exact template against a hardcoded `p_cat=24` + name filter
 *     combination; the closest existing page, `/productsbydisease/[slug]`,
 *     is itself still fixture-backed and has no name-filter parameter,
 *     retrofitting it is out of this slice's scope). The raw search term
 *     is passed through as a query param (`echoed`) specifically so
 *     `/search-results` can render it as leaked, unescaped text ABOVE the
 *     actual results — the same relative position Laravel's stray echo
 *     occupies (before the page content) — reproducing the defect's
 *     user-visible EFFECT (raw text leaks above the results) via a
 *     necessarily different MECHANISM (query param + render, since a
 *     redirect response's own body is never seen by a browser). Disclosed
 *     here and in `search-results/page.tsx`, not a silent fix.
 *
 * CSRF (M5-B consistency): `inc/header.blade.php:41`'s (commented-out)
 * form DOES have `@csrf` — so this route is protected on real Laravel
 * whenever/if that form is ever un-commented. `verifyCsrfToken()` is
 * applied here for the same consistency reason, even though nothing
 * currently submits to this route in practice. Unlike every other
 * CSRF-protected route, there is no "originating page" with an established
 * flash-message convention to redirect a rejected request back to (the
 * form itself doesn't render) — a mismatch redirects to `/home`, the
 * generic public fallback, rather than inventing a flash convention for a
 * page that doesn't exist.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCsrfToken } from '@/lib/auth/csrf';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();
  const origin = request.nextUrl.origin;

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    return NextResponse.redirect(new URL('/home', origin), 303);
  }

  const pType = String(formData.get('p_type') ?? '');
  const pName = String(formData.get('p_name') ?? '');

  if (pType === 'Diseases') {
    const url = new URL('/diseases-list', origin);
    url.searchParams.set('p_name', pName);
    return NextResponse.redirect(url, 303);
  }

  // Herbs branch — B-14: carries the raw term twice, matching source's own
  // two independent uses of `$p_name` (the stray echo, and the LIKE filter
  // — both read the exact same unsanitized value).
  const url = new URL('/search-results', origin);
  url.searchParams.set('p_name', pName);
  url.searchParams.set('echoed', pName);
  return NextResponse.redirect(url, 303);
}
