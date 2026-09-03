import type { Metadata } from 'next';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';

/**
 * `/update-password` — ported from `update-password.blade.php` (176
 * lines), `HomeController@UpdatePassword` (`HomeController.php:616-620`).
 * Alt-theme ("zeintext") family — same asset stack as `/top-poducts` etc.
 *
 * `$token` (the password-reset token, normally embedded in the reset
 * email's link — `HomeController.php:572-612`'s `encrypt($email)`) has no
 * demo-session equivalent this milestone — rendered as an empty hidden
 * field, matching what an unset variable coerces to in `{{ }}`.
 *
 * Real, working "Show/Hide password" toggle script reproduced verbatim
 * (a small inline `<script>`, not a jQuery plugin — no
 * LegacyScriptRunner/PublicScripts involvement needed or used here).
 */
export const metadata: Metadata = {
  title:
    'Online Shopping Site for Mobiles, Electronics, Furniture, Grocery, Lifestyle, Books & More. Best Offers!',
  description:
    "India's biggest online store for Mobiles, Fashion (Clothes/Shoes), Electronics, Home Appliances, Books, Home, Furniture, Grocery, Jewelry, Sporting goods, Beauty & Personal Care and more! Find the largest selection from all brands at the lowest prices in India. Payment options - COD, EMI, Credit card, Debit card & more.",
  icons: {
    icon: '/assets/img/icon/favicon.jpg',
  },
};

export default function UpdatePasswordPage() {
  return (
    <>
      <link rel="stylesheet" href="/assets/css/bootstrap.min.css" />
      <link rel="stylesheet" href="/assets/css/font-awesome.min.css" />
      <link rel="stylesheet" href="/assets/css/linear-icon.css" />
      <link rel="stylesheet" href="/assets/css/plugins.css" />
      <link rel="stylesheet" href="/assets/css/default.css" />
      <link rel="stylesheet" href="/assets/css/style.css" />
      <link rel="stylesheet" href="/assets/css/responsive.css" />
      <script src="/assets/js/vendor/modernizr-3.5.0.min.js"></script>

      {/* Header/footer partials are @include'd in source via inc.header/
          inc.footer (verified: update-password.blade.php:48,148) — same
          shared components as every other page, matching top-poducts's
          own precedent for this asset family. */}
      <PublicHeader />

      <div className="breadcrumb-area">
        <div className="container-fluid">
          <div className="row">
            <div className="col-12">
              <div className="breadcrumb-wrap">
                <nav aria-label="breadcrumb">
                  <ul className="breadcrumb">
                    <li className="breadcrumb-item">
                      <a href="/home">Home</a>
                    </li>
                    <li className="breadcrumb-item active" aria-current="page">
                      Update Password
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="login-wrapper pb-70">
        <div className="container-fluid">
          <div className="row">
            <div className="col-12 col-sm-12 col-md-12 col-lg-12">
              <main id="primary" className="site-main">
                <div className="user-login">
                  <div className="row">
                    <div className="col-12 col-sm-12 col-md-12">
                      <div className="section-title text-center">
                        <h3>Update Password</h3>
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-12 col-sm-12 col-md-12 col-lg-8 col-xl-6 offset-lg-2 offset-xl-3">
                      <div className="login-form">
                        <form action="/user-update-password" method="post">
                          <div className="form-group row align-items-center mb-4">
                            <label
                              htmlFor="email"
                              className="col-12 col-sm-12 col-md-4 col-form-label"
                            >
                              New Password
                            </label>
                            <div className="col-12 col-sm-12 col-md-8">
                              <input
                                type="password"
                                className="form-control"
                                name="new_password"
                                placeholder="New Password"
                                required
                              />
                            </div>
                          </div>
                          <div className="form-group row align-items-center">
                            <label
                              htmlFor="c-password"
                              className="col-12 col-sm-12 col-md-4 col-form-label"
                            >
                              Confirm Password
                            </label>
                            <div className="col-12 col-sm-12 col-md-8">
                              <input type="hidden" name="token" value="" />
                              <input
                                type="password"
                                className="form-control"
                                name="confirm_password"
                                id="psw"
                                placeholder="Confirm Password"
                                required
                              />
                              <button className="pass-show-btn" type="button" id="pswShowBtn">
                                Show
                              </button>
                            </div>
                          </div>
                          <div className="login-box mt-5 text-center">
                            <button type="submit" name="submit" className="btn btn-success">
                              Update Password
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              </main>
            </div>
          </div>
        </div>
      </div>

      <div className="scroll-top not-visible">
        <i className="fa fa-angle-up"></i>
      </div>

      <PublicFooter />

      <script src="/assets/js/vendor/jquery-1.12.4.min.js"></script>
      <script src="/assets/js/popper.min.js"></script>
      <script src="/assets/js/bootstrap.min.js"></script>
      <script src="/assets/js/plugins.js"></script>
      <script src="/assets/js/ajax-mail.js"></script>
      <script src="/assets/js/main.js"></script>

      {/* Reproduced from source (update-password.blade.php:164-173), which
          wires this via a literal onclick="PasswordShowHide()" HTML
          attribute — not expressible in typed JSX (React's ButtonHTMLAttributes
          has no onclick prop, only onClick, which requires 'use client' on a
          Server Component page). Wired instead via an id + addEventListener,
          registered in this same inline script — same real behavior, same
          "plain script tag after the page body" pattern every other inline
          script in this migration uses (e.g. product-details/[slug]'s
          variant-selector script), not a React event handler. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
function PasswordShowHide() {
  var x = document.getElementById("psw");
  if (x.type === "password") { x.type = "text"; } else { x.type = "password"; }
}
(function(){
  var btn = document.getElementById("pswShowBtn");
  if (btn) btn.addEventListener("click", PasswordShowHide);
})();
`,
        }}
      />
    </>
  );
}
