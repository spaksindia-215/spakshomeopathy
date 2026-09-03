import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';
import { readAndClearFlash } from '@/lib/auth/flash';
import { generateCsrfToken } from '@/lib/auth/csrf';

/**
 * `/login` — ported from `login.blade.php` (123 lines),
 * `HomeController@Login`.
 *
 * PRESERVED DEFECT — P-05: `<title>Spakshomeopathy - Register</title>` —
 * the login page's `<title>` literally says "Register", verified
 * directly in source. Not corrected.
 *
 * M4: `/user-login` (src/app/user-login/route.ts) now really
 * authenticates against `spaks_dev.users`. The `session()->has('message')`
 * / `('AuthMsg')` blocks below are now WIRED to a real one-shot flash
 * cookie (src/lib/auth/flash.ts), reproducing Laravel's redirect-flash
 * semantics. `$errors` (Laravel's separate validation-error bag) is still
 * not wired — see user-login/route.ts's header for why that gap is
 * currently folded into the 'message' flash instead.
 *
 * M5-B: added the `_token` hidden field, wired to `csrf.ts` (source has
 * `@csrf` here — `login.blade.php:69`, confirmed directly this slice) —
 * `user-login/route.ts` now verifies it.
 */
export const metadata: Metadata = {
  title: 'Spakshomeopathy - Register',
  other: {
    'msapplication-TileColor': '#ffffff',
    'theme-color': '#ffffff',
  },
};

export default async function LoginPage() {
  const message = await readAndClearFlash('message');
  const authMsg = await readAndClearFlash('AuthMsg');
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
                  Login
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
            {authMsg !== null && <div className="alert alert-danger">{authMsg}</div>}
            <form action="/user-login" method="post">
              <input type="hidden" name="_token" value={csrfToken} />
              <div className="row align-items-end">
                <div className="col-xl-2 col-lg-2"> </div>
                <div className="col-xl-8 col-lg-8">
                  <div className="col-xl-12 col-lg-12">
                    <div className="appointment-one__form-group">
                      <input
                        type="text"
                        name="email"
                        className="appointment-one__field"
                        placeholder="Email Id"
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
                      />
                    </div>
                  </div>

                  <div className="col-xl-3 col-lg-12">
                    <input type="hidden" name="backuser" value="seller_buyer" />
                    <button type="submit" className="appointment-one__btn thm-btn">
                      Login Now
                    </button>
                  </div>

                  <div className="col-xl-6 col-lg-12">
                    <a href="/reset-password">Forgot your password?</a>
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
