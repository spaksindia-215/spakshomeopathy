import type { Metadata } from 'next';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';
import { readAndClearFlash } from '@/lib/auth/flash';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { getDb } from '@/lib/mongodb/client';
import { getSiteSettings } from '@/lib/settings/repository';

/**
 * `/contact` — ported from `contact.blade.php`. Verified byte-identical to
 * production (raw capture) except session-dependent state, which is out of
 * M1 scope.
 *
 * M5-A: `/save-enquiry` (src/app/save-enquiry/route.ts) now really inserts
 * into `spaks_dev.enquiries`. The `session()->has('message')` block below
 * is wired to the same one-shot flash cookie as `/login`/`/register`, same
 * `alert-success` markup as source (`contact.blade.php:56-60`).
 *
 * `$errors` (Laravel's separate ValidationException bag,
 * `contact.blade.php:45-53`) is NOT wired — same pre-existing, already-
 * disclosed gap as every other form in this app (no `$errors`-equivalent
 * mechanism exists yet anywhere).
 *
 * M5-B: the `_token` hidden field (previously a placeholder, `value=""`)
 * is now a real token from `csrf.ts` — `save-enquiry/route.ts` verifies
 * it.
 *
 * SITE SETTINGS WIRING (Site Settings feature): the address/phone/email in
 * "Contact Detail" now read from `getSiteSettings()`
 * (`src/lib/settings/repository.ts`), admin-editable at
 * `/admin/site-settings` — same wiring rationale as `PublicFooter.tsx`'s
 * header comment. The 4 social icons below are left untouched (hardcoded
 * `href="#"`, matching production, which has no real links here either —
 * out of scope for this feature; see `PublicFooter.tsx`'s real social URLs
 * for the ones production does have).
 */
export const metadata: Metadata = {
  title: 'Spakshomeopathy - Contact Us',
  other: {
    'msapplication-TileColor': '#ffffff',
    'theme-color': '#ffffff',
  },
};

export default async function ContactPage() {
  const message = await readAndClearFlash('message');
  const csrfToken = generateCsrfToken();
  const db = await getDb();
  const settings = await getSiteSettings(db);
  return (
    <>
      <div className="page-wrapper">
        <PublicStylesheets />
        {/* /.topbar-one */}
        <PublicHeader />

        <div className="breadcrumb">
          <div className="container">
            <div className="row">
              <div className="col-12">
                <ul className="breadcrumb">
                  <li className="breadcrumb-item">
                    <a href="http://spakshomeopathy.com">Home</a>
                  </li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Contact Us
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <section className="contact-one">
          <div className="container">
            <div className="row justify-content-between no-gutters">
              <div className="col-lg-5">
                <h3 className="contact-one__title">Get in Touch</h3>
                {/* /.contact-one__title */}

                {/* $errors bag — not wired yet, see file header */}

                {message !== null && <div className="alert alert-success">{message}</div>}

                <form
                  method="post"
                  action="/save-enquiry"
                  className="contact-one__form contact-form-validated"
                >
                  <input type="hidden" name="_token" value={csrfToken} />
                  <input type="text" name="name" placeholder="Full Name" required />
                  <input type="text" name="phone" placeholder="Mobile No" required />
                  <input type="text" name="email" placeholder="Email Address" required />
                  <input type="text" name="subject" placeholder="Subject" />
                  <textarea placeholder="Your Messege" name="message"></textarea>
                  <button type="submit" className="thm-btn contact-one__btn">
                    Send
                  </button>
                </form>
                {/* /.contact-one__form */}
              </div>
              {/* /.col-lg-5 */}
              <div className="col-lg-4">
                <div className="contact-one__info">
                  <div className="contact-one__icon">
                    <i className="clainc-icon-information-button"></i>
                  </div>
                  {/* /.contact-one__icon */}
                  <h3 className="contact-one__info__title">Contact Detail</h3>
                  {/* /.contact-one__info__title */}
                  <p className="contact-one__info__text">{settings.address}</p>
                  {/* /.contact-one__info__text */}
                  <p className="contact-one__info__text">
                    <span>Call us:</span> <br /> {settings.contactPhone}
                  </p>
                  {/* /.contact-one__info__text */}
                  <p className="contact-one__info__text">
                    <span>Mail us:</span> <br /> {settings.contactEmail}
                  </p>
                  {/* /.contact-one__info__text */}
                  {/*
                    SIGNIFICANT WHITESPACE — DO NOT REMOVE THE {' '} SEPARATORS.

                    The Blade source has a newline between each <a>, which HTML
                    renders as a single significant space between inline-block
                    elements. These four icons are 36px wide inside a container
                    that fits three per row WITH the spaces, so production wraps
                    them onto two rows (block height 72px).

                    JSX strips whitespace between sibling elements on separate
                    lines. Without explicit {' '}, all four fit one row and the
                    block collapses to 36px — a 36px page-height difference that
                    fails V-02 screenshot parity (contract NN-5).

                    Verified against production 2026-08-04:
                      prod  .contact-one__info__social h=72
                      local (before fix)              h=36
                  */}
                  <div className="contact-one__info__social">
                    <a href="#">
                      <i className="fa fa-facebook-f"></i>
                    </a>{' '}
                    <a href="#">
                      <i className="fa fa-twitter"></i>
                    </a>{' '}
                    <a href="#">
                      <i className="fa fa-pinterest-p"></i>
                    </a>{' '}
                    <a href="#">
                      <i className="fa fa-youtube-play"></i>
                    </a>
                  </div>
                  {/* /.contact-one__info__social */}
                </div>
                {/* /.contact-one__info */}
              </div>
              {/* /.col-lg-4 */}
            </div>
            {/* /.row justify-content-end */}
          </div>
          {/* /.container */}
        </section>
        {/* /.contact-one */}
        {/* /.contact-page-map-wrapper */}
        <PublicFooter />
        {/* /.footer-one */}
        {/* /.page-wrapper */}
      </div>
      <PublicScripts />
    </>
  );
}
