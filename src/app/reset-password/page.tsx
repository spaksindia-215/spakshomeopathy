import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';

/**
 * `/reset-password` — ported from `forgot-password.blade.php` (115
 * lines), `HomeController@ResetPassword` (`HomeController.php:567-570`).
 *
 * PRESERVED DEFECT: `<title>Spakshomeopathy - Register</title>` — same
 * literal "Register" title defect as `/login`, verified directly in
 * source. Not corrected.
 *
 * No real password-reset backend exists this milestone — submitting is
 * non-functional. Session-flash message blocks are structurally present
 * but never populated (no server-side session this milestone).
 */
export const metadata: Metadata = {
  title: 'Spakshomeopathy - Register',
  other: {
    'msapplication-TileColor': '#ffffff',
    'theme-color': '#ffffff',
  },
};

export default function ResetPasswordPage() {
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
                  Forgot Password
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <section className="cart-section sec-pad pb-0">
        <div className="container">
          <div className="inner-container">
            <form action="/user-reset-password" method="post">
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
                        required
                      />
                    </div>
                  </div>
                  <div className="col-xl-3 col-lg-12">
                    <button type="submit" className="appointment-one__btn thm-btn">
                      Submit
                    </button>
                  </div>

                  <div className="col-xl-6 col-lg-12">
                    <a href="/login">Login Now?</a>
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
