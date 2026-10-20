import type { Metadata } from 'next';
import Link from 'next/link';
import { HerbsShell } from '@/components/herbs/HerbsShell';
import { HerbArt } from '@/components/herbs/HerbArt';
import { HerbIcon } from '@/components/herbs/HerbIcon';
import { HerbCategoryGrid, WellnessCategoryGrid } from '@/components/herbs/HerbCategoryGrid';
import { HerbProductCard } from '@/components/herbs/HerbProductCard';
import {
  HerbalEducationSection,
  HerbalVideoSection,
  NewsletterSection,
  PromoBanner,
  TestimonialsSection,
  TrustSection,
} from '@/components/herbs/HerbsMarketingSections';
import {
  getBestsellerHerbProducts,
  getFeaturedHerbProducts,
  getNewArrivalHerbProducts,
} from '@/lib/herbs/queries';
import { getMergedHerbCatalog } from '@/lib/herbs/catalog';

/**
 * `/herbs` — Herbs Store homepage (CR-003, implemented under the owner's
 * 2026-08-30 amendment — see `docs/CR-003-HERBAL-ECOMMERCE-SECTION.md`
 * §10). New route, additive to the existing site; does not replace or
 * modify `/products` (the legacy herbs-list page) or the legacy "Herbs"
 * nav item pointing at `/productsbydisease/24`.
 *
 * UI/UX structure inspired by indianjadibooti.com/Jadistore/'s section
 * ordering (top bar → hero → shop-by-form → shop-by-wellness → featured
 * products → trust → testimonials → education → newsletter); all copy,
 * branding, imagery and product data are original Spaks content, not
 * copied from that reference site.
 */
export const metadata: Metadata = {
  title: 'Spaks Herbs — Herbal Wellness Store | Spaks Homeopathy',
  description:
    'Shop traditional herbs, powders, roots, teas and herbal combinations from Spaks Herbs — the herbal wellness store from Spaks Homeopathy.',
  alternates: { canonical: '/herbs' },
  openGraph: {
    title: 'Spaks Herbs — Herbal Wellness Store',
    description: 'Traditional herbs and herbal wellness products from Spaks Homeopathy.',
    url: '/herbs',
    type: 'website',
  },
};

/** ISR — see `@/lib/herbs/catalog`'s "STATIC GENERATION CAVEAT" for why
 * this exists once a real database is configured. */
export const revalidate = 60;

export default async function HerbsHomePage() {
  const catalog = await getMergedHerbCatalog();
  const featured = getFeaturedHerbProducts(8, catalog);
  const bestsellers = getBestsellerHerbProducts(4, catalog);
  const newArrivals = getNewArrivalHerbProducts(4, catalog);

  return (
    <HerbsShell catalog={catalog}>
      <main>
        {/* Hero */}
        <section className="hs-hero">
          <div className="container hs-hero__grid">
            <div>
              <span className="hs-hero__eyebrow">
                <HerbIcon name="leaf" size={14} /> Spaks Herbs
              </span>
              <h1 className="hs-hero__title">
                Traditional Herbs for <em>Everyday Wellness</em>
              </h1>
              <p className="hs-hero__text">
                Discover whole herbs, powders, roots, teas and curated combinations — sourced
                thoughtfully and brought to you by the team behind Spaks Homeopathy.
              </p>
              <div className="hs-hero__actions">
                <Link href="/herbs/products" className="hs-btn hs-btn--primary">
                  Shop Herbs
                </Link>
                <Link href="/herbs/category/whole-herbs" className="hs-btn hs-btn--outline">
                  Explore Categories
                </Link>
              </div>
            </div>
            <div className="hs-hero__art">
              <HerbArt
                art="leaf-powder-deep-green"
                label="Herbal wellness"
                style={{ width: '100%', height: '100%' }}
              />
              <div className="hs-hero__stat">
                <strong>24+</strong>
                <span>Herbs &amp; blends</span>
              </div>
            </div>
          </div>
        </section>

        {/* Nutrition & Supplements Section */}
        <section className="hs-section" id="nutrition-supplements" style={{ paddingTop: 36, paddingBottom: 20 }}>
          <div className="container">
            <div className="hs-section__head" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#0a6a4b',
                    background: 'rgba(10, 106, 75, 0.08)',
                    padding: '4px 12px',
                    borderRadius: '999px',
                    marginBottom: '10px',
                  }}
                >
                  Nutrition &amp; Supplement
                </span>
                <h2 className="hs-section__title" style={{ fontSize: '26px', fontWeight: 800, color: 'var(--herb-ink, #0f172a)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                  Nutrition &amp; Supplements
                </h2>
                <p className="hs-section__subtitle" style={{ fontSize: '14.5px', color: 'var(--herb-ink-soft, #64748b)', margin: 0, lineHeight: 1.5 }}>
                  Essential daily nutrition, targeted vitamins and restorative herbal supplements
                </p>
              </div>
              <Link
                href="/nutrition"
                className="hs-section__link"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#0a6a4b',
                  fontWeight: 700,
                  fontSize: '14px',
                  textDecoration: 'none',
                }}
              >
                Explore all supplements{' '}
                <HerbIcon name="chevron-down" size={14} style={{ transform: 'rotate(-90deg)' }} />
              </Link>
            </div>

            {/* Single Box for Nutrition & Supplements */}
            <Link
              href="/nutrition"
              className="hs-nutrition-single-card"
              style={{
                background: 'linear-gradient(135deg, #0a6a4b 0%, #075239 45%, #0f4469 100%)',
                color: '#ffffff',
                borderRadius: '20px',
                padding: '36px 40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '32px',
                minHeight: '220px',
                cursor: 'pointer',
                textDecoration: 'none',
                boxShadow: '0 14px 32px -8px rgba(10, 106, 75, 0.45)',
                transition: 'all 0.25s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ flex: '1 1 560px', zIndex: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '999px',
                      background: 'rgba(255, 255, 255, 0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      flexShrink: 0,
                    }}
                  >
                    <HerbIcon name="shield" size={24} />
                  </div>
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'rgba(255, 255, 255, 0.85)',
                    }}
                  >
                    Division 03 • Daily Wellness Care
                  </span>
                </div>

                <h3
                  style={{
                    fontSize: '26px',
                    fontWeight: 800,
                    margin: '0 0 10px',
                    color: '#ffffff',
                    lineHeight: 1.25,
                    letterSpacing: '-0.01em',
                  }}
                >
                  Nutritional &amp; Dietary Supplements
                </h3>

                <p
                  style={{
                    fontSize: '14.5px',
                    lineHeight: 1.6,
                    color: 'rgba(255, 255, 255, 0.92)',
                    margin: '0 0 20px',
                    maxWidth: '680px',
                  }}
                >
                  Everyday nutrition and wellness support alongside treatment. Browse genuine multivitamins,
                  calcium complexes, standardized botanical extracts, and restorative herbal tonics.
                </p>

                {/* Sub-tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 22 }}>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      background: 'rgba(255, 255, 255, 0.16)',
                      padding: '5px 14px',
                      borderRadius: '999px',
                      color: '#ffffff',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    Vitamins &amp; Minerals
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      background: 'rgba(255, 255, 255, 0.16)',
                      padding: '5px 14px',
                      borderRadius: '999px',
                      color: '#ffffff',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    Herbal Dietary Extracts
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      background: 'rgba(255, 255, 255, 0.16)',
                      padding: '5px 14px',
                      borderRadius: '999px',
                      color: '#ffffff',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    Superfoods &amp; Tonics
                  </span>
                </div>

                <span
                  style={{
                    fontSize: '14.5px',
                    fontWeight: 700,
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'rgba(255, 255, 255, 0.22)',
                    padding: '9px 20px',
                    borderRadius: '10px',
                    transition: 'background 0.2s ease',
                  }}
                >
                  Browse Nutrition Store →
                </span>
              </div>

              {/* Media image on right */}
              <div
                className="hs-nutrition-single-media"
                style={{
                  flex: '0 0 220px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                }}
              >
                <img
                  src="/assets/images/redesign/division-nutrition.png"
                  alt="Glass jar of supplement capsules surrounded by fresh green leaves"
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                    maxHeight: '190px',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.25))',
                  }}
                />
              </div>
            </Link>
          </div>
        </section>

        {/* Shop by Herb Form */}
        <section className="hs-section">
          <div className="container">
            <div className="hs-section__head">
              <div>
                <h2 className="hs-section__title">Shop by Herb Form</h2>
                <p className="hs-section__subtitle">
                  Find herbs in the form that suits your routine
                </p>
              </div>
              <Link href="/herbs/products" className="hs-section__link">
                View all herbs{' '}
                <HerbIcon name="chevron-down" size={14} style={{ transform: 'rotate(-90deg)' }} />
              </Link>
            </div>
            <HerbCategoryGrid />
          </div>
        </section>

        {/* Shop by Wellness */}
        <section className="hs-section hs-section--alt">
          <div className="container">
            <div className="hs-section__head">
              <div>
                <h2 className="hs-section__title">Shop by Wellness</h2>
                <p className="hs-section__subtitle">
                  Explore herbs by everyday wellness focus areas
                </p>
              </div>
              <Link href="/herbs/wellness" className="hs-section__link">
                View all
              </Link>
            </div>
            <WellnessCategoryGrid />
          </div>
        </section>

        {/* Featured products */}
        <section className="hs-section">
          <div className="container">
            <div className="hs-section__head">
              <div>
                <h2 className="hs-section__title">Featured Herbs</h2>
                <p className="hs-section__subtitle">A curated selection from our catalogue</p>
              </div>
              <Link href="/herbs/products?sort=featured" className="hs-section__link">
                View all
              </Link>
            </div>
            <div className="hs-product-grid">
              {featured.map((p) => (
                <HerbProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>

        {/* Promo banner */}
        <section className="hs-section hs-section--tight">
          <div className="container">
            <PromoBanner />
          </div>
        </section>

        {/* Best sellers */}
        <section className="hs-section">
          <div className="container">
            <div className="hs-section__head">
              <div>
                <h2 className="hs-section__title">Best Sellers</h2>
                <p className="hs-section__subtitle">Customer favourites this season</p>
              </div>
              <Link href="/herbs/products?sort=popular" className="hs-section__link">
                View all
              </Link>
            </div>
            <div className="hs-product-grid">
              {bestsellers.map((p) => (
                <HerbProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>

        {/* New arrivals */}
        <section className="hs-section hs-section--alt">
          <div className="container">
            <div className="hs-section__head">
              <div>
                <h2 className="hs-section__title">New Arrivals</h2>
                <p className="hs-section__subtitle">Recently added to the Spaks Herbs catalogue</p>
              </div>
              <Link href="/herbs/products?sort=newest" className="hs-section__link">
                View all
              </Link>
            </div>
            <div className="hs-product-grid">
              {newArrivals.map((p) => (
                <HerbProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="hs-section hs-section--tight">
          <div className="container">
            <TrustSection />
          </div>
        </section>

        {/* Testimonials */}
        <section className="hs-section">
          <div className="container">
            <div className="hs-section__head">
              <div>
                <h2 className="hs-section__title">What Customers Say</h2>
                <p className="hs-section__subtitle">
                  Demo testimonials — replace with real reviews via admin
                </p>
              </div>
            </div>
            <TestimonialsSection />
          </div>
        </section>

        {/* Video */}
        <section className="hs-section hs-section--alt">
          <div className="container">
            <div className="hs-section__head">
              <div>
                <h2 className="hs-section__title">Learn About Herbs</h2>
              </div>
            </div>
            <HerbalVideoSection />
          </div>
        </section>

        {/* Herbal education */}
        <section className="hs-section">
          <div className="container">
            <div className="hs-section__head">
              <div>
                <h2 className="hs-section__title">Herbal Knowledge</h2>
                <p className="hs-section__subtitle">
                  Guides and articles for building a herbal routine
                </p>
              </div>
            </div>
            <HerbalEducationSection />
          </div>
        </section>

        {/* Newsletter */}
        <section className="hs-section hs-section--tight">
          <div className="container">
            <NewsletterSection />
          </div>
        </section>
      </main>
    </HerbsShell>
  );
}
