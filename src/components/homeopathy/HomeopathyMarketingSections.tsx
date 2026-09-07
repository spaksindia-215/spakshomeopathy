import Link from 'next/link';
import { HomeopathyIcon } from './HomeopathyIcon';
import { StarRating } from './HomeopathyUI';

/**
 * Marketing/content sections for the Homeopathy Store homepage —
 * recreated from the Herbs Store's `HerbsMarketingSections.tsx`
 * (`TrustSection`, `TestimonialsSection`, `PromoBanner`), with copy
 * adapted to a homeopathy-medicine context rather than reused herb copy.
 * Testimonials are clearly-labeled demo content, matching how the Herbs
 * Store handles its own testimonials section.
 */
export function TrustSection() {
  const items = [
    {
      icon: 'shield' as const,
      title: 'Genuine Medicines',
      desc: 'Sourced from trusted homeopathic manufacturers',
    },
    { icon: 'lock' as const, title: 'Secure Payments', desc: 'Your details stay protected' },
    { icon: 'truck' as const, title: 'Fast Delivery', desc: 'Dispatched across India' },
    { icon: 'support' as const, title: 'Customer Support', desc: 'Help when you need it' },
    { icon: 'stethoscope' as const, title: 'Clinically Guided', desc: 'Prepared under supervision' },
  ];
  return (
    <div className="hm-trust-grid">
      {items.map((item) => (
        <div key={item.title} className="hm-trust-card">
          <div className="hm-trust-card__icon">
            <HomeopathyIcon name={item.icon} size={24} />
          </div>
          <p className="hm-trust-card__title">{item.title}</p>
          <p className="hm-trust-card__desc">{item.desc}</p>
        </div>
      ))}
    </div>
  );
}

const TESTIMONIALS = [
  {
    id: 't1',
    rating: 5,
    quote:
      'Ordering was simple and the medicines arrived well packed. Customer support answered my questions quickly.',
    name: 'Ritu S.',
    location: 'Delhi',
  },
  {
    id: 't2',
    rating: 5,
    quote:
      "I've been buying from Spaks Homeopathy for over a year now — consistent quality and quick dispatch every time.",
    name: 'Arvind K.',
    location: 'Lucknow',
  },
  {
    id: 't3',
    rating: 4,
    quote: 'Good range of remedies by category, which made it easy to find what my doctor recommended.',
    name: 'Meera P.',
    location: 'Pune',
  },
];

/** Demo/placeholder testimonials, clearly labeled as such by the page
 * section subtitle that wraps this component (matches the Herbs Store's
 * own "Demo testimonials — replace with real reviews via admin" pattern). */
export function TestimonialsSection() {
  return (
    <div className="hm-testimonial-grid">
      {TESTIMONIALS.map((t) => (
        <div key={t.id} className="hm-testimonial">
          <StarRating rating={t.rating} size={15} />
          <p className="hm-testimonial__quote">&ldquo;{t.quote}&rdquo;</p>
          <p className="hm-testimonial__author">{t.name}</p>
          <p className="hm-testimonial__loc">{t.location}</p>
        </div>
      ))}
    </div>
  );
}

export function PromoBanner() {
  return (
    <div className="hm-promo">
      <div>
        <p className="hm-promo__title">New to homeopathy?</p>
        <p className="hm-promo__text">
          Browse remedies by the condition you&apos;re looking to address — our category pages group
          medicines by everyday disease areas.
        </p>
      </div>
      <Link href="/homeopathy/products" className="hm-btn hm-btn--outline">
        Shop All Medicines
      </Link>
    </div>
  );
}

export { NewsletterSection } from './NewsletterSection';
