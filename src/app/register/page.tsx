import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';
import { readAndClearFlash } from '@/lib/auth/flash';
import { generateCsrfToken } from '@/lib/auth/csrf';

/**
 * `/register` — ported from `register.blade.php` (132 lines),
 * `HomeController@Register` (`HomeController.php:287-291`).
 *
 * Source's own controller loads `statezones` (all rows) for this view,
 * but the Blade template itself has NO state dropdown or any reference
 * to that variable anywhere in its markup (verified — the form only has
 * name/email/mobile/password fields) — a real, pre-existing gap between
 * what the controller supplies and what the view actually uses. Not
 * "fixed" by adding a state field that doesn't exist in source.
 *
 * Hardcoded `utype=3` (buyer) on every registration — sellers register
 * via the separate `/seller-register` page (Batch B, not yet built).
 *
 * M4: `/save-user` (src/app/save-user/route.ts) now really registers a
 * buyer into `spaks_dev.users` + embedded `buyerProfile`. The
 * `session()->has('message')` block below is wired to the same one-shot
 * flash cookie as /login.
 *
 * M5-B: added the `_token` hidden field, wired to `csrf.ts` (source has
 * `@csrf` here — `register.blade.php:69`, confirmed directly this slice) —
 * `save-user/route.ts` now verifies it for this (utype=3) branch.
 */
export const metadata: Metadata = {
  title: 'Spakshomeopathy - Register',
  other: {
    'msapplication-TileColor': '#ffffff',
    'theme-color': '#ffffff',
  },
};

export default async function RegisterPage() {
  const message = await readAndClearFlash('message');
  const csrfToken = generateCsrfToken();

  return (
    <div className="page-wrapper">
      <PublicStylesheets />
      <PublicHeader />

      <div className="breadcrumb">
        <div className="container">
          <div className="row">
            <div className="col-12">
              <ul className="breadcrumb">
                <li className="breadcrumb-item">
                  <Link href="/">Home</Link>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  Register
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <section className="cart-section sec-pad pb-0">
        <div className="container">
          <div className="inner-container">
            {message !== null && <div className="alert alert-success">{message}</div>}
            <form action="/save-user" method="post">
              <input type="hidden" name="_token" value={csrfToken} />
              <input type="hidden" name="utype" value="3" />
              <div className="row align-items-end">
                <div className="col-xl-2 col-lg-2"> </div>
                <div className="col-xl-8 col-lg-8">
                  <div className="col-xl-12 col-lg-12">
                    <div className="appointment-one__form-group">
                      <input
                        type="text"
                        name="name"
                        className="appointment-one__field"
                        placeholder="Full Name"
                        required
                      />
                    </div>
                  </div>

                  <div className="col-xl-12 col-lg-12">
                    <div className="appointment-one__form-group">
                      <input
                        type="text"
                        name="email"
                        className="appointment-one__field"
                        placeholder="Email Id"
                        required
                      />
                    </div>
                  </div>

                  <div className="col-xl-12 col-lg-12">
                    <div className="appointment-one__form-group">
                      <input
                        type="text"
                        name="mobile"
                        className="appointment-one__field"
                        placeholder="Phone Number"
                        required
                      />
                    </div>
                  </div>

                  <div className="col-xl-12 col-lg-12">
                    <div className="appointment-one__form-group">
                      <input
                        type="password"
                        name="password"
                        className="appointment-one__field"
                        placeholder="Enter Password"
                        required
                      />
                    </div>
                  </div>

                  <div className="col-xl-3 col-lg-12">
                    <button type="submit" className="appointment-one__btn thm-btn">
                      Register Now
                    </button>
                  </div>
                </div>
                <div className="col-xl-2 col-lg-2"> </div>
              </div>
            </form>
            <div className="result"></div>
          </div>
        </div>
      </section>
      <br />
      <br />

      <PublicFooter />
      <PublicScripts />
    </div>
  );
}
