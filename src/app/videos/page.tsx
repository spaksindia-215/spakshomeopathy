import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';

/**
 * `/videos` — BROKEN BY DESIGN (contract Register B-01, blueprint §3.1 #6).
 *
 * `HomeController@VideosList` returns the `404` Blade view (not a real
 * HTTP 404 — the response status is 200) for this route. This is a known,
 * deliberate defect the contract requires reproducing exactly (NN-4/IR-9):
 * "Broken stays broken." Confirmed live in production: raw capture returns
 * HTTP 200 with the 404 view's content (title "Spakshomeopathy - 404 Page").
 *
 * Do NOT "fix" this into a real video listing or a real 404 response.
 * Repair requires an Approved Fix Register entry (contract §9.3), which
 * does not exist for B-01.
 *
 * ADDENDUM (2026-08-20, UI/visual demo migration session): the
 * `href="/"` "Back to website" link below was changed from a plain `<a>`
 * to `next/link`'s `<Link>` — required for `npm run build` to succeed
 * (discovered this session: `next build`'s ESLint pass,
 * `@next/next/no-html-link-for-pages`, already failed on this exact line
 * with a clean `.next` cache, independent of anything else in this
 * session). Only this one line changed; the broken-by-design content
 * above is untouched. `<Link>` renders an identical `<a href="/">` in the
 * DOM. See `docs/DEMO-UI-MIGRATION-REPORT.md`.
 */
export const metadata: Metadata = {
  title: 'Spakshomeopathy - 404 Page',
  other: {
    'msapplication-TileColor': '#ffffff',
    'theme-color': '#ffffff',
  },
};

export default function VideosBrokenPage() {
  return (
    <div className="page-wrapper">
      <PublicStylesheets />
      {/* /.topbar-one */}
      <PublicHeader />
      {/* /.header-one */}
      {/* /.inner-banner */}
      {/* /.sec-pad-two */}
      {/* /.faq-accrodion sec-pad */}
      <section className="sec-pad thm-gray-bg-2 text-center">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="block-title block-title__low-margin">
                <h2 className="block-title__title">Coming Soon..</h2>
              </div>
              {/* /.block-title */}
              <Link href="/" className="thm-btn">
                Back to website
              </Link>
            </div>
            {/* /.col-lg-12 */}
          </div>
          {/* /.row */}
        </div>
        {/* /.container */}
      </section>
      {/* /.sec-pad */}
      <PublicFooter />
      {/* /.footer-one */}
      {/* /.page-wrapper */}
      <PublicScripts />
    </div>
  );
}
