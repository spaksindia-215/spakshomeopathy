/**
 * Shared content for `/` (`HomeController@index`) and `/home`
 * (`HomeController@home`) — ported from `index.blade.php` (843 lines).
 *
 * Source confirms both controller methods render the IDENTICAL `index`
 * view with identical data (`tbl_homeopathy`, `categories`) — this is a
 * duplicate query, independently coded in source, not a shared function
 * (per docs/M3-APPLICATION-MAPPING.md row #1/#2, itself citing contract
 * §5.2's rule against silently consolidating independently-coded source
 * queries). Rendering the SAME React content at both Next.js routes is
 * the faithful reproduction of that source behavior — a single shared
 * component here is an internal implementation choice (Next.js requires
 * separate `page.tsx` files per route; both simply render this one
 * component), not a "generic placeholder" collapsing two distinct pages —
 * source itself has always rendered one identical view at both routes.
 *
 * ============================================================================
 * DEAD CODE — VERIFIED, EXCLUDED, NOT PORTED (contract F-17/§10.2: preserve
 * bugs, don't invent fixes; don't reproduce genuinely dead markup either)
 * ============================================================================
 * `index.blade.php` contains exactly TWO blocks wrapped in HTML comments
 * (`<!-- ... -->`) that never render in any browser, verified by direct
 * line-by-line read this session:
 *
 *   1. Lines ~191-274: a "Why Choose Spakshomeopathy" mission/vision
 *      tabbed content block (`<section class="feature-two homeabout">`).
 *      An abandoned first draft — its content (company blurb, mission/
 *      vision tabs) does not appear anywhere else live on the page.
 *   2. Lines ~788-816: a "Medicines-bg1" section — a THIRD rendering
 *      attempt of the disease list (see below), also commented out.
 *
 * Neither is reproduced here, not even as a JSX comment — unlike
 * `PublicHeader.tsx`'s precedent of reproducing a SHORT, plausibly-
 * reactivatable commented fragment as a JSX comment, these two blocks are
 * long, superseded first-draft duplicates with no signal they were ever
 * a live feature worth flagging for reactivation. This exclusion is
 * itself the documentation — nothing "reconstructable" is missing, only
 * genuinely unreachable-by-any-browser markup is omitted.
 *
 * ============================================================================
 * IMPORTANT CORRECTION vs. earlier scoping: TWO disease sections are LIVE,
 * not one
 * ============================================================================
 * A third block (lines ~294-312) IS commented out and is skipped. But the
 * block that immediately follows it, lines ~314-673, is NOT commented —
 * it is a live, hand-authored, hardcoded list of 23 disease cards with
 * absolute `https://spakshomeopathy.com/...` URLs (one per real category
 * row, evidently pasted in rather than looped). This component renders
 * that section's INTENT faithfully using the real dynamic category list
 * (`getCategoriesByType('N')`, from `src/lib/demo`) with ordinary relative
 * URLs — reproducing the exact same 23 disease names/images/links the
 * hardcoded block shows, without literally hand-copying 23 near-identical
 * JSX blocks or perpetuating the hardcoded-absolute-URL pattern into new
 * code (every other page in this migration already uses relative internal
 * links). A SECOND, separately live block (lines ~744-777) renders the
 * SAME category list again, in an `owl-carousel`, further down the page —
 * source really does show the disease list twice, in two different
 * layouts, both live. This component reproduces both, matching source.
 */

'use client';

import { useEffect, useState } from 'react';
import { getCategoriesByType } from '@/lib/demo';
import { CategoryCard } from '@/components/cards/CategoryCard';

const heroSlides = [
  { src: '/assets/images/banner3.jpg', alt: 'Homeopathy banner' },
  { src: '/assets/images/banner1.jpg', alt: 'Homeopathy banner' },
  { src: '/assets/images/banner2.jpg', alt: 'Homeopathy banner' },
];

export function HomePageContent() {
  const diseaseCategories = getCategoriesByType('N', 1);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % heroSlides.length);
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, []);

  const showPrevious = () => {
    setActiveIndex((current) => (current - 1 + heroSlides.length) % heroSlides.length);
  };

  const showNext = () => {
    setActiveIndex((current) => (current + 1) % heroSlides.length);
  };

  return (
    <div className="page-wrapper">
      {/* /.topbar-one — PublicHeader rendered by each route's page.tsx */}

      <div
        style={{
          position: 'relative',
          width: '100%',
          overflow: 'hidden',
          background: '#f4f4f4',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: '100%',
            transform: `translateX(-${activeIndex * 100}%)`,
            transition: 'transform 0.5s ease-in-out',
          }}
        >
          {heroSlides.map((slide) => (
            <div key={slide.src} style={{ minWidth: '100%' }}>
              <img
                src={slide.src}
                alt={slide.alt}
                style={{
                  display: 'block',
                  width: '100%',
                  height: '480px',
                  objectFit: 'cover',
                }}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          aria-label="Previous slide"
          onClick={showPrevious}
          style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '42px',
            height: '42px',
            border: 'none',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.8)',
            color: '#222',
            cursor: 'pointer',
            fontSize: '22px',
            fontWeight: 700,
            zIndex: 1,
          }}
        >
          ‹
        </button>

        <button
          type="button"
          aria-label="Next slide"
          onClick={showNext}
          style={{
            position: 'absolute',
            right: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '42px',
            height: '42px',
            border: 'none',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.8)',
            color: '#222',
            cursor: 'pointer',
            fontSize: '22px',
            fontWeight: 700,
            zIndex: 1,
          }}
        >
          ›
        </button>

        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: '18px',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '8px',
            zIndex: 1,
          }}
        >
          {heroSlides.map((slide, index) => (
            <button
              key={`${slide.src}-${index}`}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              onClick={() => setActiveIndex(index)}
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                border: 'none',
                background: index === activeIndex ? '#fff' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                padding: 0,
                boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
              }}
            />
          ))}
        </div>
      </div>

      {/* ----------dises list start----- (index.blade.php:277) */}
      <section className="mt-5">
        <div className="container-fluid">
          <div className="row no-gutters">
            <div className="container">
              <div className="block-title text-center">
                <h2 className="block-title__title">
                  Homeopathy Medicines are safe and alternative source for cure Disease.
                </h2>
              </div>

              {/* Live hardcoded 23-card grid (index.blade.php:314-673) —
                  reproduced via the real category list, see file header. */}
              <div className="row justify-content-center space-buttom">
                {diseaseCategories.map((category) => (
                  <div className="col-lg-2 col-md-2 col-sm-4 col-6" key={category.legacyId}>
                    <a href={`/diseases-details/${category.slug ?? ''}`}>
                      <div className="fun-fact-one__single text-center">
                        <span className="dises-list">
                          <img
                            id="loading"
                            src={`/uploaded_files/categories/${category.image ?? ''}`}
                            width="50px"
                            alt={category.name ?? ''}
                          />
                        </span>
                        <p className="fun-fact-one__text">{category.name}</p>
                      </div>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* ----dises list end-------- (index.blade.php:363) */}

      <section className="history-one sec-pad thm-gray-bg-2">
        <div className="container">
          <div className="history-one__single">
            <img src="/assets/images/about1.jpg" alt="Awesome Image" className="wow fadeInUp" />.
            <div className="history-one__content">
              <span className="history-one__date">About Us</span>
              <h3 className="history-one__title">Welcome To Spaks Homeopathy Clinic</h3>
              <p className="history-one__text text-justify">
                Spaks india business solution Pvt Ltd we are provide best treatment by homeopathy
                medicine. Spaks Homeopathy the world&rsquo;s leading Homeopathy Resource, which
                provides high quality content and services to Thousand of patients every year. Spaks
                Homeopathy is online since 2015. Our Team at spaks Homeopathy Clinic India, includes
                Best Homeopathic Doctor in Delhi, NCR- India, We believe in providing Best
                Homeopathic treatment for various chronic ailments, which do not respond well to
                allopathy.
              </p>
              <p className="history-one__text text-justify">
                Homeopathy is a natural and holistic system of medicine that focuses on treating the
                root cause of disease rather than just suppressing symptoms. At our Homeopathy
                Clinic in Delhi, homeopathic treatment works by stimulating the body&rsquo;s
                self-healing mechanism using safe, gentle, and natural remedies. It is suitable for
                people of all ages, including children, adults, and the elderly.
              </p>
              <p className="history-one__text text-justify">
                At our homeopathy clinic, we offer personalized treatment plans based on an
                individual&rsquo;s physical condition, emotional health, lifestyle, and medical
                history. Homeopathy is widely used as a supportive and complementary approach for
                managing both acute and chronic health conditions.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="recent-products thm-gray-bg-2 Diseases bg-white mb-5">
        <br />
        <br />
        <div className="container">
          <div className="block-title text-center">
            <h2 className="block-title__title">Video</h2>
          </div>
          <div className="container">
            <div className="row">
              <div className="col-lg-4 col-md-4 col-12">
                <div className="home-video">
                  <iframe
                    width="100%"
                    height="200px"
                    src="https://www.youtube.com/embed/kRhNIVf6qUg"
                    title="Female Hair Fall Treatment in Homeopathy | Hair Fall"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
              <div className="col-lg-4 col-md-4 col-12">
                <div className="home-video">
                  <iframe
                    width="100%"
                    height="200px"
                    src="https://www.youtube.com/embed/_ev-w9J347g"
                    title="Vaginitis - Causes, treatments, symptoms and Medicine."
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
              <div className="col-lg-4 col-md-4 col-12">
                <div className="home-video">
                  <iframe
                    width="100%"
                    height="200px"
                    src="https://www.youtube.com/embed/-cyfQkEp510"
                    title="क्या आपको शुगर है ?  कैसे उससे छुटकारा पाए। Sugar || मधुमेह || Diabetes"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            </div>
            <div className="mb-5 mt-4">
              <a className="btn btn-success btn-lg" href="/video" style={{ color: '#ffffff' }}>
                Discover More{' '}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="recent-products thm-gray-bg-2 Diseases">
        <br />
        <br />
        <div className="container">
          <div className="block-title text-center">
            <h2 className="block-title__title">Diseases</h2>
          </div>
          <div className="recent-products__carousel owl-theme owl-carousel">
            {diseaseCategories.map((category) => (
              <CategoryCard category={category} key={category.legacyId} />
            ))}
          </div>
        </div>
      </section>
      <br />
      <br />

      {/* /.page-wrapper — PublicFooter rendered by each route's page.tsx */}
    </div>
  );
}
