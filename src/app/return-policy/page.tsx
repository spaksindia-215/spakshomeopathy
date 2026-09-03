import type { Metadata } from 'next';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';

/**
 * `/return-policy` — ported from `return-policy.blade.php`. Body verified
 * byte-identical to production (raw capture).
 *
 * The <title> "Spakshomeopathy - About Us" and the breadcrumb label
 * "Terms Conditions" (not "Return Policy") are both copy-paste bugs,
 * CONFIRMED LIVE in production (contract rank 6), preserved verbatim (F-17).
 */
export const metadata: Metadata = {
  title: 'Spakshomeopathy - About Us',
  other: {
    'msapplication-TileColor': '#ffffff',
    'msapplication-TileImage': 'images/favicon/ms-icon-144x144.png',
    'theme-color': '#ffffff',
  },
};

export default function ReturnPolicyPage() {
  return (
    <>
      <div className="page-wrapper">
        <PublicStylesheets />
        {/* /.topbar-one */}
        <PublicHeader />
        {/* /.header-one */}
        {/* /.inner-banner */}
        {/* /.sec-pad */}
        <div className="breadcrumb">
          <div className="container">
            <div className="row">
              <div className="col-12">
                <ul className="breadcrumb">
                  <li className="breadcrumb-item">
                    <a href="http://spakshomeopathy.com">Home</a>
                  </li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Terms Conditions{' '}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <section className="feature-two homeabout">
          <div className="container">
            <div className="row">
              <div className="col-12">
                <img
                  src="assets/images/return.jpg"
                  className="img-fluid"
                  alt="Terms and Conditions"
                />
              </div>
            </div>
          </div>
        </section>
        {/* /.feature-two */}

        <section className="cover-page feature-two homeabout">
          <div className="container">
            <div className="row">
              <h1 className="head1 f-w-700 t-center m-t-1-5 m-m-t-2">Return &amp; Refund Policy</h1>
              <strong className="mb-4">
                At Spaks Homeopathy, your satisfaction and wellness are our top priorities. We
                strive to ensure that every order reaches you in perfect condition and meets your
                expectations. However, if you are not completely satisfied, we&rsquo;re here to
                help.{' '}
              </strong>

              <div className="col-lg-12 col-md-12 wapper-grid">
                <h4>Return Eligibility</h4>
                <ul>
                  <li>Returns are accepted within 7 days of product delivery.</li>
                  <li>
                    Only unused, unopened, and sealed products in original packaging are eligible.
                  </li>
                  <li>
                    Opened medicines or partially used products cannot be returned, due to safety
                    and hygiene concerns.
                  </li>
                </ul>
              </div>

              <div className="col-lg-12 col-md-12 wapper-grid">
                <h4>Non-Returnable Items:</h4>
                <ul>
                  <li>Products purchased during clearance sales or promotions.</li>
                  <li>Custom-prepared homeopathic remedies or formulations.</li>
                  <li>Health consultation service fees (if any).</li>
                </ul>
              </div>

              <div className="col-lg-12 col-md-12 wapper-grid">
                <h4>Return Process:</h4>
                <p>
                  Email our customer support at{' '}
                  <a href="mailto:support@spakshomeopathy.com">support@spakshomeopathy.com </a>
                  <br />
                  with your Order ID and reason for return. <br />
                  Once approved, we&rsquo;ll guide you on the shipping process. <br />
                  The cost of return shipping is borne by the customer unless the error was on our
                  part.
                </p>
              </div>

              <div className="col-lg-12 col-md-12 wapper-grid">
                <h4>Refunds:</h4>
                <ul>
                  <li>
                    Upon inspection, if the return is approved, your refund will be processed within
                    7 business days.
                  </li>
                  <li>Refunds will be made to the original payment method.</li>
                  <li>
                    For any queries, please contact our support team. We&rsquo;re happy to assist
                    you in any way we can!
                  </li>
                </ul>
              </div>
            </div>
            {/* 18 */}
          </div>
        </section>
        {/* /.about-two */}
        {/* /.fun-fact-one */}
        {/* /.testimonials-one */}
        {/* /.team-two */}
        {/* /.blog-two */}
        <PublicFooter />
        {/* /.footer-one */}
        {/* /.page-wrapper */}
      </div>
      <PublicScripts />
    </>
  );
}
