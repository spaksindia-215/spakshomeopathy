/**
 * Public site footer. Ported from `inc/footer.blade.php`, verified
 * byte-identical against raw production capture (see M1 Gate Report).
 *
 * The trailing newline inside each `url('privacy-policy\n')` call in the
 * Blade source produces a literal line break inside the href attribute
 * value in the rendered HTML. That is reproduced here exactly — it is
 * cosmetically odd but observably part of the shipped markup (contract
 * NN-5), not a defect this project may correct.
 */
export function PublicFooter() {
  return (
    <footer className="footer-one">
      {/* /.footer-one__top */}
      <div className="footer-one__middle">
        <div className="container">
          <div className="inner-container">
            <div className="row align-items-center">
              <div className="col-lg-5 col-md-5 col-sm-5">
                <div className="footer-one__widget about-widget">
                  <h4 style={{ color: '#fff' }}>Spaks India Business Solution Pvt Ltd </h4>
                  <p className="footer-one__text">
                    We are here to help you find the answers and make the most of your potential. As
                    the first step, get in touch with us.
                  </p>
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
                      spakshomeopathy@gmail.com{' '}
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
                      <i className="fa fa-phone" aria-hidden="true"></i> +91 8700458818
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
                      <i className="fa fa-map-marker" aria-hidden="true"></i> E-38, Budh Vihar,
                      Badarpur, New Delhi 110044
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
          <p className="footer-one__copy-text">&copy; 2020 spakshomeopathy | All Right Reserved</p>
          {/* /.copy-text */}

          <div className="social-accounts">
            {/* OI-13: the social icons are inline-block and the Blade source
                separates each `</li>`/`<li>` with a newline, rendering as one
                space (production gap 3px, ours was 0). Reproduced as {' '}. */}
            <ul>
              <li>
                {/* No rel="noreferrer" — Laravel's source omits it; contract
                    F-9 forbids adding unrequested security hardening. */}
                <a href="https://www.facebook.com/spaks.homeopathy.16" target="_blank">
                  <img
                    src="https://www.neweraeducation.in/assets/images007/social-media/fb.svg"
                    style={{ width: '30px' }}
                    alt="facebook"
                  />
                </a>
              </li>{' '}
              <li>
                <a href="https://www.instagram.com/spakshomeopathy38/" target="_blank">
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
                <a href="https://www.youtube.com/channel/UCheXjhoIQFgLMyOY027cGEQ" target="_blank">
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
