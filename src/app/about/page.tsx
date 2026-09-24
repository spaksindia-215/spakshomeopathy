import type { Metadata } from 'next';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { getAboutPage } from '@/lib/about/repository';

/**
 * `/about` — ported from `about.blade.php`.
 *
 * CORRECTIONS APPLIED (BCN-03 extended, see M1 Gate Report §9):
 * production (rank 6) governs over the stale local backup (rank 4):
 *   - <title> and meta description/keywords: local backup's title
 *     ("Homeopathy Clinic in South Delhi - No.1 Homeopathic Clinic In
 *     India | About Us") does not match production. Production's SEO
 *     block is reproduced here verbatim.
 *   - Body text "MHMS" -> "BHMS": the local backup has a typo that
 *     production does not currently have. The DEPLOYED value governs.
 *
 * ABOUT PAGE EDITOR WIRING (About Page editor feature): every content
 * region below (heading, paragraphs, image, clinic block, doctor block,
 * CTA button URLs) now reads from `getAboutPage()`
 * (`src/lib/about/repository.ts`), admin-editable at `/admin/edit-about`.
 * `DEFAULT_ABOUT_PAGE` there is copied verbatim from this file's own
 * previously-hardcoded values, so nothing changes until an admin edits
 * something. `<title>`/meta description above are unchanged (SEO
 * metadata admin control is a separate, not-yet-built gap).
 */
export const metadata: Metadata = {
  title: 'About Spaks Homeopathy | Trusted Homeopathy Clinic in India',
  description:
    'Dr. S.K. Meena, Founder of Spaks Homeopathy in Badarpur, South Delhi, provides safe and effective homeopathic care with 15+ years of experience and patient-focused treatment. Book your appointment online from any city worldwide and receive professional consultation with ease, convenience, and personalized care—no matter where you are located.',
  other: {
    'msapplication-TileColor': '#ffffff',
    'msapplication-TileImage': 'images/favicon/ms-icon-144x144.png',
    'theme-color': '#ffffff',
  },
};

export default async function AboutPage() {
  const db = await getDb();
  const about = await getAboutPage(db);
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
                    About Us
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <section className="feature-two homeabout">
          <div className="container">
            <div className="row">
              <div className="col-lg-7 col-md-7 colsm-7">
                <div className="aboutleft">
                  <div className="block-title">
                    <h2 className="block-title__title mb-3">{about.heading}</h2>
                    {about.introParagraphs.map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                    <h2 className="block-title__title  mb-3">{about.subheading}</h2>{' '}
                    {about.secondaryParagraphs.map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                    <p>
                      {' '}
                      <span>
                        <strong>
                          {' '}
                          We Send Online Medicines Payment Method Cash On Delivery
                        </strong>{' '}
                      </span>{' '}
                    </p>
                  </div>
                </div>
              </div>

              <div className="col-lg-5 col-md-5 col-sm-5 aboutimg">
                {' '}
                <img src={about.heroImage} alt="Awesome Image" className="wow fadeInUp " />
              </div>
            </div>
            {/* /.row */}
          </div>
          {/* /.container */}

          <div className="container">
            <div className="row jumbotron p-3">
              <div className="col-lg-8 col-md-8 col-sm-8">
                <div className="about-help">
                  <h5>Our Homeopathy Clinic Address</h5>
                  <h4>
                    <strong>{about.clinicName}</strong>
                  </h4>
                  <span>{about.clinicAddress}</span>
                  <br />
                  <span>Call Us : {about.clinicPhone}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="jumbotron text-center">
            <h2 className="display-4"> {about.doctorName} </h2>
            <p className="lead text-center">{about.doctorCredentials} </p>
            <hr className="my-4" />
            {/* OI-14: Blade emits `</a>\n<a ...>` between the two buttons; the
                newline renders as ONE space. `.btn` is display:inline-block, so
                that space is layout — production measures a 3px gap, without it
                the gap is 0. Same defect class as OI-13; reproduced explicitly
                as {' '}. No CSS or margin is introduced. */}
            <a href={about.videoAppointmentUrl} className="btn btn-success">
              {' '}
              Book a Video Appointment{' '}
            </a>{' '}
            <a href={about.clinicAppointmentUrl} className="btn btn-info">
              {' '}
              Book an In-Clinic Appointment
            </a>
          </div>
        </section>
        {/* /.feature-two */}
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
