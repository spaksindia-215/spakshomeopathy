import type { Metadata } from 'next';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';

/**
 * `/mother-tincture` — ported from `mother-tincture.blade.php`. Body
 * verified byte-identical to production (raw capture).
 *
 * The <title> "Spakshomeopathy - Register" is a copy-paste bug, CONFIRMED
 * LIVE in production (contract rank 6), preserved verbatim (F-17).
 *
 * The iframe `src` is a relative path with a literal trailing newline
 * inside the attribute value (from `{{...}}\n"` in the Blade source) —
 * preserved exactly; it resolves relative to the current page URL, not
 * asset root, matching Laravel's behavior.
 */
export const metadata: Metadata = {
  title: 'Spakshomeopathy - Register',
  other: {
    'msapplication-TileColor': '#ffffff',
    'msapplication-TileImage': 'images/favicon/ms-icon-144x144.png',
    'theme-color': '#ffffff',
  },
};

export default function MotherTincturePage() {
  return (
    <>
      <div className="page-wrapper">
        <PublicStylesheets />
        {/* /.topbar-one */}
        <PublicHeader />
        {/* /.header-one */}

        <div className="breadcrumb">
          <div className="container">
            <div className="row">
              <div
                className="col-12 text-center"
                style={{ justifyContent: 'center', display: 'flex' }}
              >
                <ul className="breadcrumb">
                  <li className="breadcrumb-item active" aria-current="page">
                    Mother Tincture Price List
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="container">
          <div className="row">
            <div className="col-lg-8 col-md-8 mt-5 mb-5 offset-md-2 offset-lg-2">
              <iframe
                src={'Mother-Tincture-Price-list.pdf\n'}
                style={{ height: '800px', width: '100%' }}
                title="Iframe Example"
              ></iframe>
            </div>
          </div>
        </div>

        <PublicFooter />
        {/* /.footer-one */}
        {/* /.page-wrapper */}
      </div>
      <PublicScripts />
    </>
  );
}
