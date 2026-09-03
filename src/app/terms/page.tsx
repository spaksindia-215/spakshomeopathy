import type { Metadata } from 'next';
import type { AnchorHTMLAttributes } from 'react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';

/**
 * `/terms` — ported from `terms.blade.php`. Body verified byte-identical to
 * production (raw capture).
 *
 * The <title> "Spakshomeopathy - About Us" is a copy-paste bug in the
 * Blade source. It is CONFIRMED LIVE in production (raw capture, contract
 * rank 6) and therefore preserved verbatim per contract F-17/P-05-class
 * rule: user-visible text, including bugs, is not corrected without an
 * Approved Fix Register entry.
 */
export const metadata: Metadata = {
  title: 'Spakshomeopathy - About Us',
  other: {
    'msapplication-TileColor': '#ffffff',
    'msapplication-TileImage': 'images/favicon/ms-icon-144x144.png',
    'theme-color': '#ffffff',
  },
};

export default function TermsPage() {
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
                  src="assets/images/term.jpg"
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
              <h1 className="head1 f-w-700 t-center m-t-1-5 m-m-t-2">
                Terms and Conditions – Spaks Homeopathy
              </h1>
              <strong className="mb-4">
                Welcome to Spaks Homeopathy. These Terms and Conditions (&ldquo;Terms&rdquo;) govern
                your use of our website (www.spakshomeopathy.com) and services. By accessing our
                site, you agree to comply with these Terms.
              </strong>

              <div>
                {/* wapper-grid start */}
                <div className="col-lg-12 col-md-12">
                  <h4> 1. Use of the Website</h4>
                  <ul>
                    <li>This website is intended for personal, non-commercial use. </li>
                    <li>
                      {' '}
                      You agree not to misuse the content or use the website for any unlawful
                      purpose.
                    </li>
                  </ul>
                </div>
              </div>
              {/* wapper-grid end */}

              <div>
                {/* wapper-grid start */}
                <div className="col-lg-12 col-md-12">
                  <h4>2. Medical Disclaimer </h4>
                  <ul>
                    <li>
                      {' '}
                      All content on this website is for informational purposes only and is not a
                      substitute for professional medical advice.
                    </li>
                    <li>
                      {' '}
                      Always consult with a licensed healthcare professional before starting any
                      treatment.
                    </li>
                  </ul>
                </div>
              </div>
              {/* wapper-grid end */}

              <div>
                {/* wapper-grid start */}
                <div className="col-lg-12 col-md-12">
                  <h4> 3. Orders and Payments</h4>
                  <ul>
                    <li>
                      All product prices are listed in INR and are subject to change without
                      notice.{' '}
                    </li>
                    <li>
                      We reserve the right to cancel any order at our discretion and will notify you
                      accordingly.
                    </li>
                  </ul>
                </div>
              </div>
              {/* wapper-grid end */}

              <div>
                {/* wapper-grid start */}
                <div className="col-lg-12 col-md-12">
                  <h4> 4. Shipping &amp; Returns</h4>
                  <ul>
                    <li>
                      Please refer to our Return Policy for details on returns, exchanges, and
                      refunds.{' '}
                    </li>
                  </ul>
                </div>
              </div>
              {/* wapper-grid end */}

              <div>
                {/* wapper-grid start */}
                <div className="col-lg-12 col-md-12">
                  <h4>5. Intellectual Property </h4>
                  <ul>
                    <li>
                      All website content, including text, images, and logos, is the property of
                      Spaks Homeopathy and protected under copyright laws.{' '}
                    </li>
                  </ul>
                </div>
              </div>
              {/* wapper-grid end */}

              <div>
                {/* wapper-grid start */}
                <div className="col-lg-12 col-md-12">
                  <h4>6. Limitation of Liability </h4>
                  <ul>
                    <li>
                      Spaks Homeopathy is not liable for any indirect or consequential damages
                      resulting from the use or inability to use our services.{' '}
                    </li>
                  </ul>
                </div>
              </div>
              {/* wapper-grid end */}

              <div>
                {/* wapper-grid start */}
                <div className="col-lg-12 col-md-12">
                  <h4>7. Governing Law </h4>
                  <ul>
                    <li> These Terms are governed by the laws of India.</li>
                  </ul>
                </div>
              </div>
              {/* wapper-grid end */}

              <div>
                {/* wapper-grid start */}
                <div className="col-lg-12 col-md-12">
                  <h4> Contact</h4>
                  <ul>
                    <li>
                      If you have any questions, please contact us at{' '}
                      <a href="mailto:homeopathicdoctors9@gmail.com">
                        homeopathicdoctors9@gmail.com{' '}
                      </a>{' '}
                      ,{' '}
                      {/* `herf` (not `href`) is the actual broken markup shipped in production —
                        preserved verbatim per contract F-17/NN-5. TSX's typed <a> props reject
                        an unrecognized attribute name, so it is passed via an untyped props
                        object to avoid both a type error and adding a wrapper element. */}
                      <a
                        {...({
                          herf: 'trl:+91 922 032 8072',
                        } as AnchorHTMLAttributes<HTMLAnchorElement>)}
                      >
                        {' '}
                        +91 922 032 8072
                      </a>{' '}
                    </li>
                  </ul>
                </div>
              </div>
              {/* wapper-grid end */}
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
