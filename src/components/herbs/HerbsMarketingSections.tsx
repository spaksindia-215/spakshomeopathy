import Link from 'next/link';
import { HerbIcon } from './HerbIcon';
import { StarRating } from './HerbsUI';
import { HERB_ARTICLES, HERB_TESTIMONIALS } from '@/lib/herbs/data/content';

/** Trust / delivery strip (§22 of the original brief). */
export function TrustSection() {
  const items = [
    {
      icon: 'check' as const,
      title: 'Quality Checked',
      desc: 'Every batch reviewed before dispatch',
    },
    { icon: 'lock' as const, title: 'Secure Payments', desc: 'Your details stay protected' },
    { icon: 'truck' as const, title: 'Fast Delivery', desc: 'Dispatched across India' },
    { icon: 'support' as const, title: 'Customer Support', desc: 'Help when you need it' },
    { icon: 'leaf' as const, title: 'Easy Ordering', desc: 'A simple, guided checkout' },
  ];
  return (
    <div className="hs-trust-grid">
      {items.map((item) => (
        <div key={item.title} className="hs-trust-card">
          <div className="hs-trust-card__icon">
            <HerbIcon name={item.icon} size={24} />
          </div>
          <p className="hs-trust-card__title">{item.title}</p>
          <p className="hs-trust-card__desc">{item.desc}</p>
        </div>
      ))}
    </div>
  );
}

/** Testimonials (§21) — demo/placeholder content, clearly labeled. */
export function TestimonialsSection() {
  return (
    <div className="hs-testimonial-grid">
      {HERB_TESTIMONIALS.map((t) => (
        <div key={t.id} className="hs-testimonial">
          <StarRating rating={t.rating} size={15} />
          <p className="hs-testimonial__quote">&ldquo;{t.quote}&rdquo;</p>
          <p className="hs-testimonial__author">{t.name}</p>
          <p className="hs-testimonial__loc">{t.location}</p>
        </div>
      ))}
    </div>
  );
}

/** Herbal education / blog teaser (§23). */
export function HerbalEducationSection() {
  return (
    <div className="hs-article-grid">
      {HERB_ARTICLES.map((a) => (
        <Link key={a.id} href={`/herbs/learn/${a.slug}`} className="hs-article-card">
          <span className="hs-article-card__cat">{a.category}</span>
          <h3 className="hs-article-card__title">{a.title}</h3>
          <p className="hs-article-card__excerpt">{a.excerpt}</p>
          <span className="hs-article-card__meta">{a.readTime}</span>
        </Link>
      ))}
    </div>
  );
}

/**
 * "Learn About Herbs" video section (§24). Reuses the existing Spaks
 * homepage video asset (`/assets/images/home-video.mp4`, already present
 * in `public/assets/images/`) rather than sourcing or copying a video
 * from the reference site.
 */
export function HerbalVideoSection() {
  return (
    <div className="hs-video-card">
      <video
        src="/assets/images/home-video.mp4"
        muted
        loop
        autoPlay
        playsInline
        aria-label="Learn about herbs"
      />
      <div className="hs-video-card__overlay">
        <p className="hs-video-card__title">Learn About Herbs</p>
        <p style={{ margin: 0, opacity: 0.9, fontSize: 13.5 }}>
          A short look at how traditional herbs are prepared and used every day.
        </p>
      </div>
    </div>
  );
}

export function PromoBanner() {
  return (
    <div className="hs-promo">
      <div>
        <p className="hs-promo__title">New to herbal wellness?</p>
        <p className="hs-promo__text">
          Start with our curated combo packs — a simple way to try a few classical herbs together.
        </p>
      </div>
      <Link href="/herbs/category/herbal-combinations" className="hs-btn hs-btn--outline">
        Explore Combos
      </Link>
    </div>
  );
}

export { NewsletterSection } from './NewsletterSection';
