'use client';

/**
 * Split out from `HomeopathyMarketingSections.tsx` for the same reason as
 * the Herbs Store's own `NewsletterSection.tsx`: this is the only piece
 * with a real event handler, so it's the sole client component in an
 * otherwise server-only marketing-sections file.
 */
export function NewsletterSection() {
  return (
    <div className="hm-newsletter">
      <p className="hm-newsletter__title">Stay in the loop</p>
      <p className="hm-newsletter__text">
        Get occasional updates on new arrivals and wellness guides from Spaks Homeopathy.
      </p>
      <form
        className="hm-newsletter__form"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <input type="email" placeholder="Your email address" aria-label="Email address" required />
        <button type="submit" className="hm-btn hm-btn--primary">
          Subscribe
        </button>
      </form>
      <p className="hm-newsletter__note">This is a demo form — no email is sent or stored yet.</p>
    </div>
  );
}
