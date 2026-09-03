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
