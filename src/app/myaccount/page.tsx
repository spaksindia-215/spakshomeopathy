import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';
import { requireBuyerSession } from '@/lib/auth/guard';

/**
 * `/myaccount` — ported from `myaccount.blade.php` (93 lines),
 * `BuyerController@Myaccount` (`BuyerController.php:104-107`).
 *
 * Source controller method is `return view('myaccount');` — literally no
 * variables passed. The Blade view itself has ZERO dynamic content: a
 * breadcrumb and exactly four static links (My Profile → `/profile`, My
 * Orders → `/manage-orders`, Change Password → `/change-password`,
 * Logout → `/logout`). Reproduced verbatim, not embellished — this is a
 * genuinely content-free hub page in source, not a migration omission.
 *
 * LINK TARGETS: `/profile` and `/change-password` were built in a later
 * slice (`docs/GATE-REPORT-M4-AUTH.md` ADDENDUM 4) and now work.
 * `/manage-orders` is STILL NOT BUILT (needs real order data and a
 * decision on B-12's already-known-broken `view-order` route — out of
 * that slice's scope too, see its own header). The links are reproduced
 * exactly as source has them (plain `<a href>`, matching the Blade
 * `{{url(...)}}` helper, not `next/link`) — `/manage-orders` still 404s,
 * disclosed here, not silently hidden. `/logout` works
 * (`src/app/logout/route.ts`, unmodified).
 *
 * ROUTE PROTECTION (M4 buyer-guard slice): gated by `requireBuyerSession()`
 * (`src/lib/auth/guard.ts`), mirroring `routes/web.php`'s `checkBuyer`
 * middleware group (`web.php:104-119`) — `myaccount` is one of the
 * routes inside that group. Called as the first statement of this Server
 * Component, same placement pattern as `requireAdminSession()` in
 * `admin/(shell)/layout.tsx`, except here at page level: `/myaccount` has
 * no shared route-group layout to hook a guard into (Laravel has no
 * layout inheritance either — blueprint §4.1 — so there is no
 * `(buyer-shell)` group to create for a single page; adding one now for
 * exactly one route would be scope beyond this slice).
 */
export const metadata: Metadata = {
  title: 'Spakshomeopathy - Myaccount',
  other: {
    'msapplication-TileColor': '#ffffff',
    'theme-color': '#ffffff',
  },
};

export default async function MyaccountPage() {
  await requireBuyerSession();

  return (
    <div className="page-wrapper">
      <PublicStylesheets />
      <PublicHeader />

      <div className="row">
        <div className="col-12">
          <div className="breadcrumb-wrap">
            <nav aria-label="breadcrumb">
              <ul className="breadcrumb">
                <li className="breadcrumb-item">
                  <Link href="/">Home</Link>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  Myaccount
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>

      <section className="service-two thm-gray-bg-2">
        <div className="container">
          <div className="row">
            <div className="col-lg-6 col-md-6 col-sm-12">
              <div className="hvr-float-shadow service-two__wrap">
                <ul className="list-group">
                  <li>
                    <a href="/profile" className="list-group-item">
                      My Profile
                    </a>
                  </li>
                  <br />
                  <li>
                    <a href="/manage-orders" className="list-group-item">
                      My Orders
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="col-lg-6 col-md-6 col-sm-12">
              <div className="hvr-float-shadow service-two__wrap">
                <ul className="list-group">
                  <li>
                    <a href="/change-password" className="list-group-item">
                      Change Password
                    </a>
                  </li>
                  <br />
                  <li>
                    <a href="/logout" className="list-group-item">
                      Logout
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
      <PublicScripts />
    </div>
  );
}
