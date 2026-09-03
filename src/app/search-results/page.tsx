import type { Metadata } from 'next';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ProductCard } from '@/components/cards/ProductCard';
import { getDb } from '@/lib/mongodb/client';
import { ProductRepository } from '@/lib/mongodb/repositories/productRepository';

/**
 * `/search-results` — NEW URL, owner-approved 2026-08-26. Renders the
 * Herbs (`else`) branch of `HomeController::SearchProduct`
 * (`HomeController.php:210-220`), reached only via a redirect from
 * `POST /search-products` (`src/app/search-products/route.ts` — see that
 * file's header for the complete source citation and why a redirect is
 * used instead of a direct render).
 *
 * Laravel has no GET-navigable URL for this exact render (the controller
 * method itself IS the response, in the same request as the form POST) —
 * this page exists solely as this port's necessarily-different mechanism
 * for reaching the same observable content, not a URL Laravel exposes or
 * that any real page links to.
 *
 * B-14 (MUST be reproduced, not fixed — MIGRATION-CONTRACT.md's BROKEN
 * register, R-15): TWO defects, both from the Herbs branch only:
 *   1. `p_cat` is HARDCODED to 24 — never derived from the search term or
 *      any request context. `ProductRepository.searchByCategoryAndName`
 *      is called with a literal `24` below, not a variable computed from
 *      anything. Confirmed this slice: `spaks_dev` has no category
 *      `legacyId: 24` and `productsbydisease/[slug]/page.tsx`'s own header
 *      independently confirms zero real products exist under `pCat=24` —
 *      so this page is EXPECTED to render an empty result grid against
 *      real data today. That is correct, faithful behavior, not a defect
 *      in this port.
 *   2. The stray `echo $p_name = $req->p_name;` (raw, unescaped output
 *      before the view renders) is reproduced by rendering the `echoed`
 *      query param as raw, un-escaped-by-React... actually NOT
 *      dangerouslySetInnerHTML'd — see the rendering note below for why
 *      React's default text-escaping is preserved even though source's
 *      own `echo` is unescaped.
 *
 * A NOTE ON THE ECHO'S "UNESCAPED" PROPERTY: Laravel's raw `echo`
 * performs NO HTML-escaping — a search term containing `<script>` would
 * execute in a real visitor's browser on unpatched Laravel (a genuine,
 * additional pre-existing XSS-shaped defect within B-14, not separately
 * cataloged). This port does NOT reproduce that specific sub-property:
 * the leaked text below is rendered through ordinary JSX interpolation
 * (`{echoed}`), which React escapes automatically and unconditionally —
 * there is no supported way to disable React's escaping for a single
 * expression without `dangerouslySetInnerHTML`, and deliberately
 * constructing an XSS-executable code path is not something this project
 * reproduces even under strict 1:1 fidelity (contract §9.2's BROKEN
 * register preserves FUNCTIONAL brokenness — wrong data, wrong branch,
 * wrong redirect — not exploitable security vulnerabilities; no other
 * BROKEN item in the existing register reproduces an unescaped-output
 * XSS primitive either). The VISIBLE-LEAK property (raw search term
 * appears as plain text above the results) IS reproduced; the
 * SCRIPT-EXECUTION property is deliberately not. Flagged here explicitly,
 * not silently narrowed.
 */
export const metadata: Metadata = {
  title: 'Spakshomeopathy - Products',
  other: {
    'msapplication-TileColor': '#ffffff',
    'theme-color': '#ffffff',
  },
};

const HARDCODED_P_CAT = 24; // B-14 — verbatim from source, not a bug in this port

export default async function SearchResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ p_name?: string; echoed?: string }>;
}) {
  const { p_name: pName, echoed } = await searchParams;
  const term = pName ?? '';

  const db = await getDb();
  const products = new ProductRepository(db);
  const results = await products.searchByCategoryAndName(HARDCODED_P_CAT, term, 1);

  return (
    <div className="page-wrapper">
      <PublicStylesheets />
      <PublicHeader />
      {/* B-14: the stray `echo $p_name` reproduced at the same relative
          position (before the page's real content) — see file header for
          why this is React-escaped text, not source's literal unescaped
          output. */}
      {echoed !== undefined && echoed !== '' && <div>{echoed}</div>}
      <Breadcrumb items={[{ label: 'Kit List' }]} />

      <section className="shop-one sec-pad">
        <div className="container">
          <div className="row masonary-layout">
            {results.map((product) => (
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
