import type { Metadata } from 'next';
import Link from 'next/link';
import { HomeopathyShell } from '@/components/homeopathy/HomeopathyShell';
import { HomeopathyIcon } from '@/components/homeopathy/HomeopathyIcon';
import { HomeopathyCategoryGrid } from '@/components/homeopathy/HomeopathyCategoryGrid';
import { HomeopathyProductCard } from '@/components/homeopathy/HomeopathyProductCard';
import {
  NewsletterSection,
  PromoBanner,
  TestimonialsSection,
  TrustSection,
} from '@/components/homeopathy/HomeopathyMarketingSections';
import {
  getActiveProducts,
  getHomeopathyBestsellers,
  getHomeopathyFeaturedProducts,
  getHomeopathyNewArrivals,
} from '@/lib/homeopathy/queries';
import { getCategoriesByType } from '@/lib/demo/categories';

/**
 * `/homeopathy` — Homeopathy Store homepage. New route, additive to the
 * existing site; recreates the Herbs Store's (`/herbs`) UI/UX and section
 * ordering (hero → shop-by-category → featured → promo → bestsellers →
 * new arrivals → trust → testimonials → newsletter) as a new presentation
 * layer over the site's REAL homeopathy medicine catalogue and REAL
 * session cart — see `src/components/homeopathy/**` and
 * `src/lib/homeopathy/queries.ts` for the data-provenance notes. Does not
 * replace or modify `/products`, `/categories`, or any other legacy page.
 */
export const metadata: Metadata = {
  title: 'Spaks Homeopathy — Medicine Store | Spaks Homeopathy',
  description:
    'Shop classical homeopathic medicines by condition from Spaks Homeopathy — genuine remedies, dispensed under clinical supervision.',
  alternates: { canonical: '/homeopathy' },
  openGraph: {
    title: 'Spaks Homeopathy — Medicine Store',
    description: 'Classical homeopathic medicines from Spaks Homeopathy.',
    url: '/homeopathy',
    type: 'website',
  },
};

export default async function HomeopathyHomePage() {
  const products = getActiveProducts();
  const categoryCount = getCategoriesByType('N', 1).length;
  const featured = getHomeopathyFeaturedProducts(8, products);
  const bestsellers = getHomeopathyBestsellers(4, products);
  const newArrivals = getHomeopathyNewArrivals(4, products);

  return (
    <HomeopathyShell>
      <main>
        {/* Hero */}
        <section className="hm-hero">
          <div className="container hm-hero__grid">
            <div>
              <span className="hm-hero__eyebrow">
                <HomeopathyIcon name="bottle" size={14} /> Spaks Homeopathy
              </span>
              <h1 className="hm-hero__title">
                Classical Homeopathic Medicines for <em>Everyday Wellness</em>
              </h1>
              <p className="hm-hero__text">
                Browse genuine remedies by condition — sourced thoughtfully and dispensed by the
                team behind Spaks Homeopathy&apos;s clinic.
              </p>
              <div className="hm-hero__actions">
                <Link href="/homeopathy/products" className="hm-btn hm-btn--primary">
                  Shop Medicines
                </Link>
                <Link href="#categories" className="hm-btn hm-btn--outline">
                  Explore Categories
                </Link>
              </div>
            </div>
            <div className="hm-hero__art">
              <HomeopathyIcon
                name="bottle"
                size={160}
                style={{
                  width: '100%',
                  height: '100%',
                  padding: 40,
                  color: 'var(--hm-green-600)',
                  background:
                    'linear-gradient(135deg, var(--hm-green-50) 0%, var(--hm-sand) 100%)',
                }}
              />
              <div className="hm-hero__stat">
                <strong>{products.length}+</strong>
                <span>Medicines &amp; remedies</span>
              </div>
            </div>
          </div>
        </section>

        {/* Three divisions: Patents / Mother Tincture / Cosmetics */}
        <section className="hm-section" id="divisions">
          <div className="container">
            <div className="hm-section__head">
              <div>
                <h2 className="hm-section__title">Three Divisions, One Standard of Care</h2>
                <p className="hm-section__subtitle">
                  Everything under Spaks Homeopathy falls into one of three lines
                </p>
              </div>
            </div>
            <div className="hm-division-grid">
              <Link href="#categories" className="hm-division-card hm-division-card--patents">
                <div className="hm-division-card__icon">
                  <HomeopathyIcon name="grid" size={22} />
                </div>
                <span className="hm-division-card__eyebrow">Division 01</span>
                <h3 className="hm-division-card__title">Patents</h3>
                <p className="hm-division-card__desc">
                  Medicines organised by condition — Brain, Bone, Heart and {categoryCount - 3}{' '}
                  more everyday disease and wellness categories.
                </p>
                <span className="hm-division-card__link">Browse categories →</span>
              </Link>

              <Link href="/mother-tincture" className="hm-division-card hm-division-card--tincture">
                <div className="hm-division-card__icon">
                  <HomeopathyIcon name="droplet" size={22} />
                </div>
                <span className="hm-division-card__eyebrow">Division 02</span>
                <h3 className="hm-division-card__title">Mother Tincture</h3>
                <p className="hm-division-card__desc">
                  The base extract our potencies are prepared from, with a published price list
                  and matching potency rate list.
                </p>
                <span className="hm-division-card__link">Shop Mother Tincture →</span>
              </Link>

              <Link
                href="/homeopathy/category/skin-783e0"
                className="hm-division-card hm-division-card--cosmetics"
              >
                <div className="hm-division-card__icon">
                  <HomeopathyIcon name="sparkle" size={22} />
                </div>
                <span className="hm-division-card__eyebrow">Division 03</span>
                <h3 className="hm-division-card__title">Cosmetics</h3>
                <p className="hm-division-card__desc">
                  Homeopathic medicines for skin-related concerns — Spaks&apos; cosmetics line,
                  from our Skin Diseases category.
                </p>
                <span className="hm-division-card__link">Browse Cosmetics →</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Shop by Category (Patents) */}
        <section className="hm-section" id="categories">
          <div className="container">
            <div className="hm-section__head">
              <div>
                <h2 className="hm-section__title">Patents — Shop by Category</h2>
                <p className="hm-section__subtitle">
                  Find medicines for {categoryCount} everyday disease and wellness areas
                </p>
              </div>
              <Link href="/homeopathy/products" className="hm-section__link">
                View all medicines{' '}
                <HomeopathyIcon
                  name="chevron-down"
                  size={14}
                  style={{ transform: 'rotate(-90deg)' }}
                />
              </Link>
            </div>
            <HomeopathyCategoryGrid />
          </div>
        </section>

        {/* Featured products */}
        <section className="hm-section hm-section--alt">
          <div className="container">
            <div className="hm-section__head">
              <div>
                <h2 className="hm-section__title">Featured Medicines</h2>
                <p className="hm-section__subtitle">A curated selection from our catalogue</p>
              </div>
              <Link href="/homeopathy/products?sort=featured" className="hm-section__link">
                View all
              </Link>
            </div>
            <div className="hm-product-grid">
              {featured.map((p) => (
                <HomeopathyProductCard key={p.legacyId} product={p} />
              ))}
            </div>
          </div>
        </section>

        {/* Promo banner */}
        <section className="hm-section hm-section--tight">
          <div className="container">
            <PromoBanner />
          </div>
        </section>

        {/* Best sellers */}
        <section className="hm-section">
          <div className="container">
            <div className="hm-section__head">
              <div>
                <h2 className="hm-section__title">Best Sellers</h2>
                <p className="hm-section__subtitle">Customer favourites this season</p>
              </div>
              <Link href="/homeopathy/products?sort=rating" className="hm-section__link">
                View all
              </Link>
            </div>
            <div className="hm-product-grid">
              {bestsellers.map((p) => (
                <HomeopathyProductCard key={p.legacyId} product={p} />
              ))}
            </div>
          </div>
        </section>

        {/* New arrivals */}
        <section className="hm-section hm-section--alt">
          <div className="container">
            <div className="hm-section__head">
              <div>
                <h2 className="hm-section__title">New Arrivals</h2>
                <p className="hm-section__subtitle">Recently added to the Spaks Homeopathy catalogue</p>
              </div>
              <Link href="/homeopathy/products?sort=newest" className="hm-section__link">
                View all
              </Link>
            </div>
            <div className="hm-product-grid">
              {newArrivals.map((p) => (
                <HomeopathyProductCard key={p.legacyId} product={p} />
              ))}
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="hm-section hm-section--tight">
          <div className="container">
            <TrustSection />
          </div>
        </section>

        {/* Testimonials */}
        <section className="hm-section">
          <div className="container">
            <div className="hm-section__head">
              <div>
                <h2 className="hm-section__title">What Customers Say</h2>
                <p className="hm-section__subtitle">
                  Demo testimonials — replace with real reviews via admin
                </p>
              </div>
            </div>
            <TestimonialsSection />
          </div>
        </section>

        {/* Newsletter */}
        <section className="hm-section hm-section--tight">
          <div className="container">
            <NewsletterSection />
          </div>
        </section>
      </main>
    </HomeopathyShell>
  );
}
