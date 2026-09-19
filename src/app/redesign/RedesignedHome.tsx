import type { CSSProperties } from 'react';
import Link from 'next/link';
import './redesign.css';

const WHY_SPAKS = [
  {
    n: '01',
    icon: LeafIcon,
    tone: 'light' as const,
    title: 'A holistic system,\nnot symptom suppression',
    body: "Homeopathy stimulates the body's own self-healing mechanism using safe, gentle, natural remedies.",
    image: '/assets/images/redesign/why-holistic.png',
    alt: 'Dropper bottle of homeopathic remedy surrounded by fresh herbs and daisies',
  },
  {
    n: '02',
    icon: HeartIcon,
    tone: 'dark' as const,
    title: 'Personalised\ntreatment plans',
    body: 'Built around physical condition, emotional health, lifestyle and medical history — not a fixed prescription.',
    image: '/assets/images/redesign/why-personalised.png',
    alt: 'Personalised care plan clipboard listing physical health, emotional wellbeing, lifestyle and medical history',
  },
  {
    n: '03',
    icon: LeafIcon,
    tone: 'light' as const,
    title: 'Focused on\nchronic ailments',
    body: 'Our clinic works with chronic conditions that do not respond well to allopathy, alongside acute care.',
    image: '/assets/images/redesign/why-chronic.png',
    alt: 'Stethoscope beside a bowl of fresh herbs',
  },
  {
    n: '04',
    icon: FamilyIcon,
    tone: 'dark' as const,
    title: 'Suitable for\nevery age',
    body: 'Children, adults and the elderly are treated with the same method and the same care.',
    image: '/assets/images/redesign/why-every-age.png',
    alt: 'Three generations of one family smiling together outdoors',
  },
];

const NAV_LINKS = [{ label: 'Home', href: '/', active: true }];

// Consolidated per owner request (2026-09-07, same change applied to the
// legacy header — see PublicHeader.tsx): About, Homeopathy, Herbs, Diseases
// and Videos no longer sit as separate top-level items here either. They're
// grouped under one "Menu" dropdown, placed immediately before Mother
// Tincture, same as the legacy header's consolidation.
const NAV_MENU_LINKS = [
  { label: 'About', href: '/about' },
  { label: 'Homeopathy', href: '/homeopathy' },
  { label: 'Herbs', href: '/herbs' },
  { label: 'Diseases', href: '/all-diseases' },
  { label: 'Videos', href: '/videos' },
];

const NAV_LINKS_AFTER_MENU = [
  { label: 'Mother Tincture', href: '/mother-tincture' },
  { label: 'Potencies', href: '/mother-tincture' },
  { label: 'Contact', href: '/contact' },
];

/**
 * Homepage redesign — a from-scratch visual direction, not a migration
 * port. ORIGINALLY built and previewed at /redesign, fully independent of
 * the migration-governed `/` route and its legacy header/footer/CSS
 * (MIGRATION-CONTRACT.md IR-1 governed that route; this page was
 * explicitly authorized by the project owner as separate work, outside
 * that contract).
 *
 * SWAPPED IN as the real homepage (owner request, 2026-09-07): this
 * component now renders at both `/` and `/home` (`src/app/page.tsx` and
 * `src/app/home/page.tsx`) — the site's actual homepage, no longer just a
 * preview. The legacy `index.blade.php`-ported content that used to live
 * at those two routes (`HomePageContent`, still byte-verified against
 * production) moved to `/redesign` instead, so nothing was deleted — see
 * that route's own page.tsx for the full swap rationale. Internal links
 * inside this component that used to point at `/redesign` (the logo, the
 * nav's "Home" item) now point at `/`, matching this component's new home.
 *
 * The three division photos (Homeopathy dilution bottle/mortar, Herbs
 * mortar-and-pestle, Nutrition capsule jar) were cropped from the
 * approved design mockup and live at
 * public/assets/images/redesign/division-*.png. The five Why Spaks photos
 * (banner mortar shot, dropper bottle, care-plan clipboard, stethoscope,
 * family) were cropped the same way from the "Why Spaks" mockup and live
 * at public/assets/images/redesign/why-*.png — a couple of those crops
 * (why-holistic, why-chronic) carry a faint light-colored sliver in one
 * corner where the source mockup masked the photo into a non-rectangular
 * shape; `object-fit: cover` in `.sp-why-card-img` crops most of it away
 * at real card proportions, but a sharper future export from the design
 * source (not this mockup screenshot) would remove it outright. See
 * PlaceholderImage for any other photo slot the design calls for that the
 * asset library still doesn't have a real shot for.
 *
 * MOTHER TINCTURE SECTION REMOVED (owner request, 2026-09-07): the
 * standalone "Mother Tincture" band that used to sit between Divisions
 * and About is gone from this homepage. Nav ("Mother Tincture" /
 * "Potencies") and footer links to `/mother-tincture` are unchanged —
 * that page itself was not touched, only this homepage's dedicated
 * teaser section for it.
 */
export function RedesignedHome() {
  const headline = 'Natural care, rooted in classical homeopathy.';

  return (
    <div className="sp-redesign">
      {/* Utility bar */}
      <div className="sp-utility">
        <div className="sp-container">
          <div className="sp-utility-group">
            <span>spakshomeopathy@gmail.com</span>
            <span className="sp-utility-sep">|</span>
            <span>+91 8700458818</span>
          </div>
          <div className="sp-utility-group">
            <a href="/assets/Mother-Tincture-Price-list.pdf" style={{ color: 'inherit' }}>
              Diseases Catalogue (PDF)
            </a>
            <span className="sp-utility-sep">|</span>
            <Link href="/consultancy" style={{ color: '#f6fbff', fontWeight: 600 }}>
              Dr. Consultancy
            </Link>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="sp-header">
        <div className="sp-container">
          <Link href="/" className="sp-logo">
            <img src="/assets/images/resources/logo.png" alt="Spaks Homeopathy" />
          </Link>
          <nav className="sp-nav">
            {NAV_LINKS.map((link) => (
              <Link key={link.label} href={link.href} className={link.active ? 'active' : undefined}>
                {link.label}
              </Link>
            ))}
            <div className="sp-nav-dropdown">
              <button type="button" className="sp-nav-dropdown-trigger">
                Menu
              </button>
              <div className="sp-nav-dropdown-panel">
                {NAV_MENU_LINKS.map((link) => (
                  <Link key={link.label} href={link.href}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            {NAV_LINKS_AFTER_MENU.map((link) => (
              <Link key={link.label} href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="sp-header-actions">
            <button type="button" className="sp-icon-btn" aria-label="Search">
              <SearchIcon />
            </button>
            <button type="button" className="sp-icon-btn" aria-label="Cart, 0 items">
              <CartIcon />
              <span className="sp-cart-badge">0</span>
            </button>
            <Link href="/products" className="sp-btn sp-btn-primary" style={{ padding: '13px 22px', fontSize: 14 }}>
              Explore Products
            </Link>
            <button type="button" className="sp-mobile-toggle" aria-label="Open menu">
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="sp-hero">
        <div className="sp-container sp-hero-grid">
          <div>
            <div className="sp-chip">
              <span style={{ width: 6, height: 6, borderRadius: 999, background: '#0f4469' }} />
              Online since 2015 · Delhi NCR, India
            </div>
            <h1 className="sp-heading sp-hero-headline" style={{ marginTop: 28 }}>
              {headline}
            </h1>
            <p className="sp-hero-copy">
              Homeopathy is a natural, holistic system of medicine that treats the root cause rather than
              suppressing symptoms. Spaks Homeopathy brings medicines, herbs and mother tinctures — with
              personalised treatment plans from our clinic in Delhi NCR.
            </p>
            <div className="sp-hero-actions">
              <a href="#divisions" className="sp-btn sp-btn-primary">
                Explore Products →
              </a>
              <Link href="/consultancy" className="sp-btn sp-btn-secondary">
                Book a consultation
              </Link>
            </div>
            <div className="sp-hero-stats">
              <div>
                <div className="sp-stat-num">2015</div>
                <div className="sp-stat-label">Serving patients online since</div>
              </div>
              <div>
                <div className="sp-stat-num">22</div>
                <div className="sp-stat-label">Health-condition categories</div>
              </div>
              <div>
                <div className="sp-stat-num">3</div>
                <div className="sp-stat-label">Product divisions</div>
              </div>
            </div>
          </div>
          <div className="sp-hero-media">
            <div className="sp-hero-media-frame">
              <img
                src="/assets/images/dr-meena.jpeg"
                alt="Dr. S.K. Meena"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center 15%',
                }}
              />
            </div>
            <div className="sp-hero-card">
              <div className="sp-hero-card-avatar">
                <img
                  src="/assets/images/dr-meena.jpeg"
                  alt="Dr. S.K. Meena"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div>
                <div className="sp-hero-card-name">Dr. S.K. Meena</div>
                <div className="sp-hero-card-role">
                  Spaks Homeopathy Clinic
                  <br />
                  Delhi NCR
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Divisions */}
      <section id="divisions" className="sp-section" style={{ background: '#ffffff' }}>
        <div className="sp-container">
          <div className="sp-divisions-head">
            <div className="sp-eyebrow-rule">
              <span />
              What we make
              <span />
            </div>
            <h2 className="sp-heading sp-divisions-title">Three divisions, one standard of care</h2>
            <p className="sp-divisions-intro">
              Every Spaks product line is prepared and dispensed under the same clinical supervision.
            </p>
          </div>

          <div className="sp-divisions-stack">
            {/* Division 01 — Homeopathy, split into Medicines / Cosmetics */}
            <div className="sp-division-split">
              <div className="sp-division-card sp-division-card-dark sp-division-card-split">
                <LeafBranchDecor style={{ top: -18, left: -10, transform: 'scaleX(-1)' }} />
                <LeafBranchDecor style={{ top: -18, right: -10 }} />
                <div className="sp-division-card-copy">
                  <div className="sp-division-card-head">
                    <span className="sp-division-badge sp-division-badge-dark">Division 01</span>
                    <span className="sp-division-icon sp-division-icon-dark">
                      <MortarIcon />
                    </span>
                  </div>
                  <h3 className="sp-division-card-title">
                    Homeopathy
                    <br />
                    for <span className="sp-division-card-title-accent-blue">Medicines</span>
                  </h3>
                  <p className="sp-division-card-desc">
                    Classical homeopathic medicines, prepared in the potencies our clinic
                    prescribes.
                  </p>
                  <Link
                    href="/homeopathy/products"
                    className="sp-division-cta sp-division-cta-accent"
                  >
                    Explore Medicines →
                  </Link>
                </div>
              </div>

              <div className="sp-division-card sp-division-card-forest sp-division-card-split">
                <LeafBranchDecor style={{ top: -18, left: -10, transform: 'scaleX(-1)' }} />
                <LeafBranchDecor style={{ top: -18, right: -10 }} />
                <div className="sp-division-card-copy">
                  <div className="sp-division-card-head">
                    <span className="sp-division-badge sp-division-badge-dark">Division 01</span>
                    <span className="sp-division-icon sp-division-icon-dark">
                      <MortarIcon />
                    </span>
                  </div>
                  <h3 className="sp-division-card-title">
                    Homeopathy
                    <br />
                    for <span className="sp-division-card-title-accent-green">Cosmetics</span>
                  </h3>
                  <p className="sp-division-card-desc">
                    Natural homeopathic cosmetics, gentle care for healthy, radiant you.
                  </p>
                  <Link
                    href="/homeopathy/cosmetics"
                    className="sp-division-cta sp-division-cta-accent"
                  >
                    Explore Cosmetics →
                  </Link>
                </div>
              </div>
            </div>

            {/* Division 02 — Herbs */}
            <div className="sp-division-card sp-division-card-light">
              <div className="sp-division-card-media sp-division-card-media-left">
                <img
                  src="/assets/images/redesign/division-herbs.png"
                  alt="Wooden mortar and pestle filled with fresh herbs and daisies"
                  className="sp-division-card-img"
                />
              </div>
              <div className="sp-division-card-copy">
                <div className="sp-division-card-head">
                  <span className="sp-division-icon sp-division-icon-light">
                    <LeafIcon />
                  </span>
                  <span className="sp-division-badge sp-division-badge-light">Division 02</span>
                </div>
                <h3 className="sp-division-card-title sp-division-card-title-dark">Herbs</h3>
                <p className="sp-division-card-desc sp-division-card-desc-dark">
                  Herbal products and natural remedies from the Spaks Herbs Store.
                </p>
                <div className="sp-division-tags">
                  <span className="sp-tag sp-tag-light">
                    <TeaIcon /> Herbal Teas
                  </span>
                  <span className="sp-tag sp-tag-light">
                    <LeafIcon /> Raw Herbs
                  </span>
                  <span className="sp-tag sp-tag-light">
                    <MortarIcon /> Natural Remedies
                  </span>
                </div>
                <Link href="/herbs" className="sp-division-cta sp-division-cta-forest">
                  Visit Herbs Store →
                </Link>
              </div>
              <span className="sp-division-tagline sp-division-tagline-dark">
                Pure
                <br />
                Plants
                <br />
                Real Care
              </span>
              <LeafBranchDecor style={{ bottom: -12, right: 12, opacity: 0.28 }} />
            </div>

            {/* Division 03 — Nutritional & Supplements */}
            <div className="sp-division-card sp-division-card-cream">
              <div className="sp-division-card-copy">
                <div className="sp-division-card-head">
                  <span className="sp-division-badge sp-division-badge-accent">Division 03</span>
                  <span className="sp-division-icon sp-division-icon-accent">
                    <CapsuleIcon />
                  </span>
                </div>
                <h3 className="sp-division-card-title sp-division-card-title-dark">
                  Nutritional &amp; Supplements
                </h3>
                <p className="sp-division-card-desc sp-division-card-desc-dark">
                  Everyday nutrition and wellness support alongside treatment.
                </p>
                <div className="sp-division-tags">
                  <span className="sp-tag sp-tag-cream">
                    <ShieldIcon /> Vitamins
                  </span>
                  <span className="sp-tag sp-tag-cream">
                    <BoltIcon /> Minerals
                  </span>
                  <span className="sp-tag sp-tag-cream">
                    <HeartIcon /> Wellness Support
                  </span>
                </div>
                <Link href="/nutrition" className="sp-division-cta sp-division-cta-accent">
                  Browse division →
                </Link>
              </div>
              <div className="sp-division-card-media sp-division-card-media-right">
                <img
                  src="/assets/images/redesign/division-nutrition.png"
                  alt="Glass jar of supplement capsules surrounded by fresh green leaves"
                  className="sp-division-card-img"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="sp-section" style={{ background: '#ffffff' }}>
        <div className="sp-container sp-about-grid">
          <div className="sp-about-media">
            <div className="sp-about-media-main">
              <img
                src="/assets/images/clinic-interior.png"
                alt="Spaks Homeopathy clinic interior — dispensary shelves and consultation counter"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>
          <div>
            <div className="sp-eyebrow" style={{ marginBottom: 18 }}>
              About us
            </div>
            <h2 className="sp-heading sp-about-title">Welcome to Spaks Homeopathy Clinic</h2>
            <p className="sp-about-copy">
              Spaks India Business Solution Pvt Ltd provides treatment through homeopathic medicine. Online
              since 2015, our team at Spaks Homeopathy Clinic includes homeopathic doctors in Delhi NCR, and
              we focus on chronic ailments that do not respond well to allopathy.
            </p>
            <p className="sp-about-copy" style={{ marginTop: 16 }}>
              Treatment plans are personalised to an individual&apos;s physical condition, emotional health,
              lifestyle and medical history — suitable for children, adults and the elderly alike.
            </p>
            <div className="sp-about-pills">
              <span className="sp-pill">Personalised treatment plans</span>
              <span className="sp-pill">Acute &amp; chronic conditions</span>
              <span className="sp-pill">All age groups</span>
            </div>
            <Link
              href="/about"
              style={{ display: 'inline-block', marginTop: 28, fontSize: 15, fontWeight: 600, color: '#0f4469' }}
            >
              Read the full story →
            </Link>
          </div>
        </div>
      </section>

      {/* Why Spaks */}
      <section className="sp-why">
        <div className="sp-why-banner">
          <div className="sp-container sp-why-banner-grid">
            <div>
              <div className="sp-chip">
                <LeafIcon />
                Why Spaks
              </div>
              <h2 className="sp-heading sp-why-banner-title" style={{ marginTop: 22 }}>
                Gentle by method.
                <br />
                Clinical by practice.
              </h2>
              <p className="sp-why-banner-copy">
                Thoughtfully designed care, backed by science and rooted in nature.
              </p>
            </div>
            <div className="sp-why-banner-media">
              <img
                src="/assets/images/redesign/why-banner.png"
                alt="Mortar and pestle with fresh herbs, daisies and a dropper bottle"
                className="sp-why-banner-img"
              />
            </div>
          </div>
        </div>

        <div className="sp-container sp-why-stack">
          {WHY_SPAKS.map((w, i) => {
            const Icon = w.icon;
            const imageFirst = i % 2 === 1;
            return (
              <div
                key={w.n}
                className={`sp-why-card ${w.tone === 'dark' ? 'sp-why-card-dark' : 'sp-why-card-light'}`}
              >
                {imageFirst && (
                  <div className="sp-why-card-media sp-why-card-media-left">
                    <img src={w.image} alt={w.alt} className="sp-why-card-img" />
                  </div>
                )}
                <div className="sp-why-card-copy">
                  <div className="sp-why-card-head">
                    <span className={`sp-why-num sp-why-num-${w.tone}`}>{w.n}</span>
                    <span className={`sp-why-icon sp-why-icon-${w.tone}`}>
                      <Icon />
                    </span>
                  </div>
                  <h3 className="sp-why-card-title">
                    {w.title.split('\n').map((line, li) => (
                      <span key={li}>
                        {line}
                        {li === 0 && <br />}
                      </span>
                    ))}
                  </h3>
                  <p className="sp-why-card-body">{w.body}</p>
                  <Link
                    href="/about"
                    className={`sp-why-card-cta sp-why-card-cta-${w.tone}`}
                  >
                    Learn More →
                  </Link>
                </div>
                {!imageFirst && (
                  <div className="sp-why-card-media">
                    <img src={w.image} alt={w.alt} className="sp-why-card-img" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Videos */}
      <section className="sp-section" style={{ background: '#ffffff' }}>
        <div className="sp-container">
          <div className="sp-section-head">
            <div>
              <div className="sp-eyebrow" style={{ marginBottom: 16 }}>
                Education
              </div>
              <h2 className="sp-heading sp-section-title">Learn more about homeopathy</h2>
            </div>
            <Link href="/videos" style={{ fontSize: 14.5, fontWeight: 600, color: '#0f4469' }}>
              All videos →
            </Link>
          </div>
          <div className="sp-videos-grid">
            <a
              href="https://www.youtube.com/watch?v=kRhNIVf6qUg"
              target="_blank"
              rel="noreferrer"
              className="sp-video-main"
            >
              <img src="https://img.youtube.com/vi/kRhNIVf6qUg/maxresdefault.jpg" alt="Spaks Homeopathy video" />
              <div className="sp-video-scrim" />
              <div className="sp-video-main-body">
                <div className="sp-play-btn">
                  <PlayIcon />
                </div>
                <h3 className="sp-video-main-title">Featured video from the Spaks channel</h3>
                <div className="sp-video-main-sub">
                  Titles and descriptions pulled from the existing video library
                </div>
              </div>
            </a>
            <div className="sp-videos-side">
              <a
                href="https://www.youtube.com/watch?v=_ev-w9J347g"
                target="_blank"
                rel="noreferrer"
                className="sp-video-thumb"
              >
                <img src="https://img.youtube.com/vi/_ev-w9J347g/hqdefault.jpg" alt="Spaks Homeopathy video" />
                <div className="sp-video-scrim" />
                <div className="sp-video-thumb-title">Existing video 02</div>
              </a>
              <a
                href="https://www.youtube.com/watch?v=-cyfQkEp510"
                target="_blank"
                rel="noreferrer"
                className="sp-video-thumb"
              >
                <img src="https://img.youtube.com/vi/-cyfQkEp510/hqdefault.jpg" alt="Spaks Homeopathy video" />
                <div className="sp-video-scrim" />
                <div className="sp-video-thumb-title">Existing video 03</div>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="sp-cta">
        <div className="sp-container">
          <h2 className="sp-heading sp-cta-title">Begin your journey towards better wellness.</h2>
          <p className="sp-cta-copy">
            Speak to our clinic about a personalised homeopathic treatment plan, or browse the Spaks
            product range.
          </p>
          <div className="sp-cta-actions">
            <Link href="/contact" className="sp-btn sp-btn-primary">
              Contact Spaks
            </Link>
            <a href="tel:+918700458818" className="sp-btn sp-btn-secondary">
              +91 8700458818
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="sp-footer">
        <div className="sp-container">
          <div className="sp-footer-grid">
            <div>
              <p className="sp-footer-brand">Spaks India Business Solution Pvt Ltd</p>
              <p className="sp-footer-tagline">
                We are here to help you find the answers and make the most of your potential. As the
                first step, get in touch with us.
              </p>
              <div className="sp-social-row">
                <a
                  href="https://www.facebook.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="sp-social-btn"
                  aria-label="Facebook"
                >
                  f
                </a>
                <a
                  href="https://www.instagram.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="sp-social-btn"
                  aria-label="Instagram"
                >
                  ig
                </a>
                <a
                  href="https://www.youtube.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="sp-social-btn"
                  aria-label="YouTube"
                >
                  yt
                </a>
              </div>
            </div>
            <div>
              <div className="sp-footer-col-title">Explore</div>
              <ul className="sp-footer-links">
                <li>
                  <Link href="/homeopathy">Homeopathy</Link>
                </li>
                <li>
                  <Link href="/herbs">Herbs Store</Link>
                </li>
                <li>
                  <Link href="/nutrition">Nutritional &amp; Supplements</Link>
                </li>
                <li>
                  <Link href="/mother-tincture">Mother Tincture</Link>
                </li>
                <li>
                  <Link href="/mother-tincture">Potencies</Link>
                </li>
              </ul>
            </div>
            <div>
              <div className="sp-footer-col-title">Company</div>
              <ul className="sp-footer-links">
                <li>
                  <Link href="/about">About Us</Link>
                </li>
                <li>
                  <Link href="/all-diseases">Diseases Catalogue</Link>
                </li>
                <li>
                  <Link href="/videos">Videos</Link>
                </li>
                <li>
                  <Link href="/consultancy">Dr. Consultancy</Link>
                </li>
                <li>
                  <Link href="/contact">Contact Us</Link>
                </li>
              </ul>
            </div>
            <div>
              <div className="sp-footer-col-title">Reach us</div>
              <div className="sp-footer-contact">
                <a href="mailto:spakshomeopathy@gmail.com">spakshomeopathy@gmail.com</a>
                <a href="tel:+918700458818">+91 8700458818</a>
                <span>
                  E-38, Budh Vihar, Badarpur,
                  <br />
                  New Delhi 110044
                </span>
              </div>
            </div>
          </div>
          <div className="sp-footer-bottom">
            <span>© 2026 Spaks Homeopathy · All rights reserved</span>
            <div className="sp-footer-legal">
              <Link href="/privacy-policy">Privacy Policy</Link>
              <Link href="/return-policy">Return &amp; Refund Policy</Link>
              <Link href="/terms">Terms &amp; Conditions</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SearchIcon({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function MortarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12a7 7 0 0 0 14 0" />
      <path d="M3 12h18" />
      <path d="M12 3v4M8.5 4.5 10 7M15.5 4.5 14 7" />
    </svg>
  );
}

function LeafIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 4 13c0-6 7-11 15-11 0 8-5 15-11 15a7 7 0 0 1-4-1" />
      <path d="M4 20 12 12" />
    </svg>
  );
}

function CapsuleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(-35 12 12)" />
      <path d="M9.5 9.5 14.5 14.5" />
    </svg>
  );
}

function TeaIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8h14v6a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8Z" />
      <path d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17" />
      <path d="M7 3c-.7.9-.7 1.7 0 2.6M11 3c-.7.9-.7 1.7 0 2.6" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3Z" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20.5s-7.5-4.6-10-9.2C.4 8 2 4.5 5.5 4c2-.3 3.7.6 4.9 2.2l1.6 2 1.6-2C14.8 4.6 16.5 3.7 18.5 4c3.5.5 5.1 4 3.5 7.3-2.5 4.6-10 9.2-10 9.2Z" />
    </svg>
  );
}

function FamilyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8.5" cy="7" r="3" />
      <circle cx="17" cy="8.5" r="2.4" />
      <path d="M2.5 20.5c0-3.6 2.7-6 6-6s6 2.4 6 6" />
      <path d="M14.5 14.8c2.6.3 4.5 2.4 4.5 5.2" />
    </svg>
  );
}

function LeafBranchDecor({ style }: { style?: CSSProperties }) {
  return (
    <svg
      width="90"
      height="110"
      viewBox="0 0 90 110"
      fill="none"
      aria-hidden="true"
      style={{ position: 'absolute', color: 'var(--forest)', opacity: 0.35, ...style }}
    >
      <path d="M8 108C6 70 14 30 40 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M12 66c10-6 22-6 30 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="34" cy="60" rx="15" ry="8" transform="rotate(28 34 60)" fill="currentColor" opacity=".55" />
      <path d="M18 88c11-4 22-2 28 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="40" cy="86" rx="15" ry="8" transform="rotate(20 40 86)" fill="currentColor" opacity=".55" />
      <path d="M22 36c8-8 19-10 27-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="38" cy="26" rx="13" ry="7" transform="rotate(-30 38 26)" fill="currentColor" opacity=".55" />
    </svg>
  );
}
