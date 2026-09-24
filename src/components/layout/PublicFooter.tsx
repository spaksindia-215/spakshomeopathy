/**
 * Public site footer. Ported from `inc/footer.blade.php`, verified
 * byte-identical against raw production capture (see M1 Gate Report).
 *
 * The trailing newline inside each `url('privacy-policy\n')` call in the
 * Blade source produces a literal line break inside the href attribute
 * value in the rendered HTML. That is reproduced here exactly — it is
 * cosmetically odd but observably part of the shipped markup (contract
 * NN-5), not a defect this project may correct.
 *
 * SITE SETTINGS WIRING (Site Settings feature): every text value that was
 * previously hardcoded here (company name, blurb, email, phone, address,
 * copyright line, social hrefs) now reads from `getSiteSettings()`
 * (`src/lib/settings/repository.ts`), admin-editable at
 * `/admin/site-settings`. `DEFAULT_SETTINGS` there is copied verbatim from
 * this file's own previously-hardcoded values, so byte-parity with
 * production (contract NN-5) holds unless/until an admin changes
 * something — no markup, class, or whitespace-parity `{' '}` separator
 * below was touched, only the text nodes and `href`s. A blank social URL
 * hides that platform's `<li>` entirely (Twitter/Pinterest default to
 * blank, matching production, which has those two commented out).
 */
import { getDb } from '@/lib/mongodb/client';
import { getSiteSettings } from '@/lib/settings/repository';

export async function PublicFooter() {
  const db = await getDb();
  const settings = await getSiteSettings(db);
  return (
    <footer className="footer-one">
      {/* /.footer-one__top */}
      <div className="footer-one__middle">
        <div className="container">
          <div className="inner-container">
            <div className="row align-items-center">
              <div className="col-lg-5 col-md-5 col-sm-5">
                <div className="footer-one__widget about-widget">
                  <h4 style={{ color: '#fff' }}>{settings.companyName} </h4>
                  <p className="footer-one__text">{settings.footerAboutText}</p>
                </div>
                {/* /.footer-one_widget */}
              </div>
              {/* /.col-lg-4 */}
              <div className="col-lg-3 col-md-3 col-sm-2">
                <div className="footer-one__widget contact-widget">
                  <h3 className="footer-one__widget-title">Email</h3>
                  {/* /.footer-one__widget-title */}
                  <ul className="footer-one__contact-list">
                    <li className="footer-one__contact-list-item">
                      {' '}
                      <i className="fa fa-envelope" aria-hidden="true"></i>{' '}
                      {settings.contactEmail}{' '}
                    </li>
                  </ul>
                  {/* /.footer-one__contact-list */}
                </div>
                {/* /.footer-one_widget */}
              </div>
              {/* /.col-lg-2 */}
              <div className="col-lg-2 col-md-6 col-sm-12">
                <div className="footer-one__widget contact-widget">
                  <h3 className="footer-one__widget-title">Phone</h3>
                  {/* /.footer-one__widget-title */}
                  <ul className="footer-one__contact-list">
                    <li className="footer-one__contact-list-item">
                      {/* OI-13: Blade emits `</i>\n +91 …` — the newline plus
                          space renders as ONE space between icon and text.
                          JSX drops newline-containing whitespace, so it is
                          reproduced explicitly. */}
                      <i className="fa fa-phone" aria-hidden="true"></i> {settings.contactPhone}
                    </li>
                  </ul>
                  {/* /.footer-one__contact-list */}
                </div>
                {/* /.footer-one_widget */}
              </div>
              {/* /.col-lg-3 */}

              <div className="col-lg-2 col-md-2 col-sm-2">
                <div className="footer-one__widget contact-widget">
                  <h3 className="footer-one__widget-title">Address</h3>
                  {/* /.footer-one__widget-title */}
                  <ul className="footer-one__contact-list">
                    <li className="footer-one__contact-list-item">
                      {/* OI-13: Blade emits `</i>\n E-38, …` — see above. */}
                      <i className="fa fa-map-marker" aria-hidden="true"></i> {settings.address}
                    </li>
                  </ul>
                  {/* /.footer-one__contact-list */}
                </div>
                {/* /.footer-one_widget */}
              </div>
              {/* /.col-lg-3 */}
            </div>
            {/* /.row */}
          </div>
          {/* /.inner-container */}
        </div>
        {/* /.container */}
      </div>
      {/* /.footer-one__middle */}
      <br /> <br />
      <div className="footer-one__bottom">
        <div className="container">
          <p className="footer-one__copy-text">{settings.copyrightText}</p>
          {/* /.copy-text */}

          <div className="social-accounts">
            {/* OI-13: the social icons are inline-block and the Blade source
                separates each `</li>`/`<li>` with a newline, rendering as one
                space (production gap 3px, ours was 0). Reproduced as {' '}. */}
            <ul>
              <li>
                {/* No rel="noreferrer" — Laravel's source omits it; contract
                    F-9 forbids adding unrequested security hardening. */}
                <a href={settings.facebookUrl} target="_blank">
                  <img
                    src="https://www.neweraeducation.in/assets/images007/social-media/fb.svg"
                    style={{ width: '30px' }}
                    alt="facebook"
                  />
                </a>
              </li>{' '}
              <li>
                <a href={settings.instagramUrl} target="_blank">
                  <img
                    src="https://www.neweraeducation.in/assets/images007/social-media/instagram-icon.svg"
                    style={{ width: '30px' }}
                    alt="instagram"
                  />
                </a>
              </li>{' '}
              {/* <li><a href="" target="_blank"><img src="https://www.neweraeducation.in/assets/images007/social-media/Twitter.svg" style="width: 30px;" alt="twitter"></a></li> */}
              {/* <li><a href="" target="_blank"><img src="https://www.neweraeducation.in/assets/images007/social-media/Linkdin.svg" style="width: 30px;" alt="linkedin"></a></li> */}
              <li>
                <a href={settings.youtubeUrl} target="_blank">
                  <img
                    src="https://www.neweraeducation.in/assets/images007/social-media/Youtube.svg"
                    style={{ width: '30px' }}
                    alt="youtube"
                  />
                </a>
              </li>
            </ul>
          </div>

          {/* OI-13: inline-block items separated by newlines in Blade, which
              render as one space (production gap 21px, ours was 18px).
              Reproduced as {' '}. */}
          <ul className="footer-one__bottom-links">
            <li className="footer-one__bottom-links-item">
              <a
                href={`/privacy-policy
`}
              >
                Privacy and Policy
              </a>
            </li>{' '}
            <li className="footer-one__bottom-links-item">
              <a
                href={`/return-policy
`}
              >
                Return &amp; Refund Policy
              </a>
            </li>{' '}
            <li className="footer-one__bottom-links-item">
              <a
                href={`/terms
`}
              >
                Terms and Conditions{' '}
              </a>
            </li>
          </ul>
          {/* /.footer-one__bottom-links */}
        </div>
        {/* /.container */}
      </div>
      {/* /.footer-one__bottom */}
    </footer>
  );
}
