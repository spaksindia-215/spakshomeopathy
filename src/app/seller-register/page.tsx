import type { Metadata } from 'next';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { generateCsrfToken } from '@/lib/auth/csrf';

/**
 * `/seller-register` — ported from `seller-register.blade.php` (338
 * lines), `HomeController@SellerRegister` (`HomeController.php:293-296`).
 * Cataloged **Public, LIVE-orphan** in `docs/M3-APPLICATION-MAPPING.md`
 * row #17 (no nav link, but a real, live route).
 *
 * Alt-theme family (same asset stack as `/top-poducts` etc.), but with
 * REAL Spaks-branded meta content (not the generic zeintext placeholder
 * metadata the other alt-theme pages carry) — verified directly this
 * session, confirming the earlier M2-milestone finding that this specific
 * page was "de-zeintext-ified" with real content while keeping the same
 * template/asset family.
 *
 * A large multi-section registration form (seller/wholesaler account
 * type, profile, address, KYC documents, bank details) with SEVEN
 * `type="file"` inputs — all visually rendered, all non-functional (no
 * upload backend this milestone, per the "forms render, submission does
 * not persist" scope). The `enctype="multipart/form-data"` attribute is
 * preserved even though nothing consumes it here.
 *
 * `SellerProfile()`/`BuyerProfile()` (source lines 315-323) toggle the
 * `.SellerProfile` section's visibility via jQuery — reproduced verbatim
 * as an inline script, but note: NEITHER function is ever called from any
 * event handler anywhere in this page (verified — no `onclick`/`onchange`
 * wires to either function; the "Seller"/"Whole Seller" radio buttons
 * have no change handler at all) — the `.SellerProfile` section is
 * therefore ALWAYS visible in practice, a real pre-existing dead-code
 * pattern in source, not something this migration removed or added.
 *
 * M5-B: added the `_token` hidden field, wired to `csrf.ts` (source has
 * `@csrf` here — `seller-register.blade.php:98`, confirmed directly this
 * slice). `save-user/route.ts` reads `_token` before its utype-branch
 * check, so this submission is CSRF-verified even though it is then
 * rejected (HTTP 501) for being a non-buyer utype — the two checks are
 * independent, matching Laravel's own middleware-then-controller ordering
 * (`VerifyCsrfToken` runs before any controller method, including one that
 * would itself reject the request for an unrelated reason).
 */
export const metadata: Metadata = {
  title:
    'Spaks Homeopathy Delhi | Dr. S.K.Meena Clinic | Online Homeopathic Medicines & Consultation',
  description:
    'Spaks Homeopathy offers advanced natural treatments for chronic and epidemic diseases. From kidney and skin care to infertility, diabetes, respiratory disorders, and cancer, our medicines promote deep biological healing without side effects.',
  icons: {
    icon: '/assets/img/icon/favicon.jpg',
  },
};

export default function SellerRegisterPage() {
  const csrfToken = generateCsrfToken();
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
                      Register
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
                        <h3>Create an Account</h3>
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-12 col-sm-12 col-md-12 col-lg-12 col-xl-8 offset-xl-2">
                      <div className="registration-form login-form">
                        <form action="/save-user" method="post" encType="multipart/form-data">
                          <input type="hidden" name="_token" value={csrfToken} />
                          <div className="login-info mb-20">
                            <p>
                              Already have an account? <a href="/login">Log in instead!</a>
                            </p>
                          </div>

                          <div className="form-group row align-items-center">
                            <label className="col-12 col-sm-12 col-md-4 col-form-label">
                              User Type
                            </label>
                            <div className="col-12 col-sm-12 col-md-8 col-lg-8">
                              <div className="form-row">
                                <div className="col-6 col-sm-3">
                                  <div className="custom-radio">
                                    <input
                                      className="form-check-input"
                                      type="radio"
                                      name="utype"
                                      id="seller"
                                      value="2"
                                    />
                                    <span className="checkmark"></span>
                                    <label className="form-check-label" htmlFor="seller">
                                      Seller
                                    </label>
                                  </div>
                                </div>
                                <div className="col-6 col-sm-4">
                                  <div className="custom-radio">
                                    <input
                                      className="form-check-input"
                                      type="radio"
                                      name="utype"
                                      id="WholeSeller"
                                      value="4"
                                    />
                                    <span className="checkmark"></span>
                                    <label className="form-check-label" htmlFor="WholeSeller">
                                      Whole Seller
                                    </label>
                                  </div>
                                </div>
                                <div className="col-6 col-sm-3"></div>
                              </div>
                            </div>
                          </div>

                          <div className="form-group row">
                            <label
                              htmlFor="f-name"
                              className="col-12 col-sm-12 col-md-4 col-form-label"
                            >
                              Name
                            </label>
                            <div className="col-12 col-sm-12 col-md-8 col-lg-8">
                              <input
                                type="text"
                                className="form-control"
                                name="name"
                                required
                                autoComplete="off"
                              />
                            </div>
                          </div>

                          <div className="form-group row">
                            <label
                              htmlFor="f-name"
                              className="col-12 col-sm-12 col-md-4 col-form-label"
                            >
                              Display Name
                            </label>
                            <div className="col-12 col-sm-12 col-md-8 col-lg-8">
                              <input
                                type="text"
                                className="form-control"
                                name="DisplayName"
                                required
                                autoComplete="off"
                              />
                            </div>
                          </div>

                          <div className="form-group row">
                            <label
                              htmlFor="l-name"
                              className="col-12 col-sm-12 col-md-4 col-form-label"
                            >
                              Email Address
                            </label>
                            <div className="col-12 col-sm-12 col-md-8 col-lg-8">
                              <input type="text" className="form-control" name="email" required />
                            </div>
                          </div>

                          <div className="form-group row">
                            <label
                              htmlFor="email"
                              className="col-12 col-sm-12 col-md-4 col-form-label"
                            >
                              Mobile No
                            </label>
                            <div className="col-12 col-sm-12 col-md-8 col-lg-8">
                              <input
                                type="text"
                                className="form-control"
                                name="mobile"
                                required
                                autoComplete="off"
                              />
                            </div>
                          </div>

                          <div className="form-group row">
                            <label
                              htmlFor="inputpassword"
                              className="col-12 col-sm-12 col-md-4 col-form-label"
                            >
                              Password
                            </label>
                            <div className="col-12 col-sm-12 col-md-8 col-lg-8">
                              <input
                                type="password"
                                className="form-control"
                                name="password"
                                id="psw"
                                placeholder="Password"
                                required
                              />
                              <button className="pass-show-btn" type="button" id="pswShowBtn">
                                Show
                              </button>
                            </div>
                          </div>

                          <div className="alert alert-secondary" role="alert">
                            <center>Profile Details</center>
                          </div>

                          <div className="form-group row">
                            <label
                              htmlFor="f-name"
                              className="col-12 col-sm-12 col-md-4 col-form-label"
                            >
                              Profile Image{' '}
                              <span style={{ color: 'red' }}>(Max File size 2MB)</span>:
                            </label>
                            <div className="col-12 col-sm-12 col-md-8 col-lg-8">
                              <input type="file" className="form-control" name="image" required />
                            </div>
                          </div>

                          <div className="form-group row">
                            <label
                              htmlFor="f-name"
                              className="col-12 col-sm-12 col-md-4 col-form-label"
                            >
                              Signature <span style={{ color: 'red' }}>(Max File size 2MB)</span>:
                            </label>
                            <div className="col-12 col-sm-12 col-md-8 col-lg-8">
                              <input
                                type="file"
                                className="form-control"
                                name="Signature"
                                required
                              />
                            </div>
                          </div>

                          <div className="SellerProfile">
                            <div className="form-group row">
                              <label
                                htmlFor="f-name"
                                className="col-12 col-sm-12 col-md-4 col-form-label"
                              >
                                Permanent Address:
                              </label>
                              <div className="col-12 col-sm-12 col-md-8 col-lg-8">
                                <input
                                  type="text"
                                  className="form-control"
                                  name="PermanentAddress"
                                  required
                                />
                              </div>
                            </div>

                            <div className="form-group row">
                              <label
                                htmlFor="f-name"
                                className="col-12 col-sm-12 col-md-4 col-form-label"
                              >
                                Store Address:
                              </label>
                              <div className="col-12 col-sm-12 col-md-8 col-lg-8">
                                <input
                                  type="text"
                                  className="form-control"
                                  name="StoreAddress"
                                  required
                                />
                              </div>
                            </div>

                            <div className="form-group row">
                              <label
                                htmlFor="f-name"
                                className="col-12 col-sm-12 col-md-4 col-form-label"
                              >
                                Adhar Card <span style={{ color: 'red' }}>(Max File size 2MB)</span>
                                :
                              </label>
                              <div className="col-12 col-sm-12 col-md-8 col-lg-8">
                                <input
                                  type="file"
                                  className="form-control"
                                  name="AdharCard"
                                  required
                                />
                              </div>
                            </div>

                            <div className="form-group row">
                              <label
                                htmlFor="f-name"
                                className="col-12 col-sm-12 col-md-4 col-form-label"
                              >
                                Pan Card <span style={{ color: 'red' }}>(Max File size 2MB)</span>:
                              </label>
                              <div className="col-12 col-sm-12 col-md-8 col-lg-8">
                                <input
                                  type="file"
                                  className="form-control"
                                  name="PanCard"
                                  required
                                />
                              </div>
                            </div>

                            <div className="form-group row">
                              <label
                                htmlFor="f-name"
                                className="col-12 col-sm-12 col-md-4 col-form-label"
                              >
                                GST Number(Optional):
                              </label>
                              <div className="col-12 col-sm-12 col-md-8 col-lg-8">
                                <input
                                  type="text"
                                  className="form-control"
                                  name="GSTNumber"
                                  placeholder="GST Number (Optional)"
                                  autoComplete="off"
                                />
                              </div>
                            </div>

                            <div className="form-group row">
                              <label
                                htmlFor="f-name"
                                className="col-12 col-sm-12 col-md-4 col-form-label"
                              >
                                GST File:
                              </label>
                              <div className="col-12 col-sm-12 col-md-8 col-lg-8">
                                <input
                                  type="file"
                                  className="form-control"
                                  name="GSTFile"
                                  autoComplete="off"
                                  required
                                />
                              </div>
                            </div>

                            <div className="alert alert-secondary" role="alert">
                              <center>Bank Details</center>
                            </div>

                            <div className="form-group row">
                              <label
                                htmlFor="f-name"
                                className="col-12 col-sm-12 col-md-4 col-form-label"
                              >
                                Account Number:
                              </label>
                              <div className="col-12 col-sm-12 col-md-8 col-lg-8">
                                <input
                                  type="text"
                                  className="form-control"
                                  name="AccNumber"
                                  autoComplete="off"
                                  required
                                />
                              </div>
                            </div>

                            <div className="form-group row">
                              <label
                                htmlFor="f-name"
                                className="col-12 col-sm-12 col-md-4 col-form-label"
                              >
                                Bank Branch Name:
                              </label>
                              <div className="col-12 col-sm-12 col-md-8 col-lg-8">
                                <input
                                  type="text"
                                  className="form-control"
                                  name="BranchName"
                                  autoComplete="off"
                                  required
                                />
                              </div>
                            </div>

                            <div className="form-group row">
                              <label
                                htmlFor="f-name"
                                className="col-12 col-sm-12 col-md-4 col-form-label"
                              >
                                IFSC Code:
                              </label>
                              <div className="col-12 col-sm-12 col-md-8 col-lg-8">
                                <input
                                  type="text"
                                  className="form-control"
                                  name="IFSCCode"
                                  autoComplete="off"
                                  required
                                />
                              </div>
                            </div>

                            <div className="form-group row">
                              <label
                                htmlFor="f-name"
                                className="col-12 col-sm-12 col-md-4 col-form-label"
                              >
                                Bank Statement{' '}
                                <span style={{ color: 'red' }}>(Max File size 2MB)</span>:
                              </label>
                              <div className="col-12 col-sm-12 col-md-8 col-lg-8">
                                <input
                                  type="file"
                                  className="form-control"
                                  name="BankStatement"
                                  autoComplete="off"
                                  required
                                />
                              </div>
                            </div>
                          </div>

                          <div className="form-check row p-0 mt-5">
                            <div className="col-12 col-sm-12 col-md-8 offset-md-4 col-lg-6 offset-lg-4">
                              <div className="custom-checkbox">
                                <input className="form-check-input" type="checkbox" id="terms" />
                                <span className="checkmark"></span>
                                <label className="form-check-label" htmlFor="terms">
                                  <a href="/terms" target="_blank">
                                    Accept terms and condition
                                  </a>
                                </label>
                              </div>
                            </div>
                          </div>

                          <div className="register-box d-flex justify-content-end mt-20">
                            <button type="submit" name="submit" className="btn btn-secondary">
                              Register
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

      {/* Reproduced verbatim from source (lines 314-336) — SellerProfile/
          BuyerProfile are real functions in source but never called from
          any event handler anywhere in this page (see file header).
          PasswordShowHide is the "Show" button's real, working handler,
          wired via id + addEventListener since source's literal
          onclick="PasswordShowHide()" attribute isn't expressible in
          typed JSX on a Server Component — see update-password/page.tsx's
          identical note for the full reasoning. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
function SellerProfile(){ $(".SellerProfile").show(); }
function BuyerProfile(){ $(".SellerProfile").hide(); }
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
