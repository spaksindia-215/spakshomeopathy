'use client';

/**
 * Split out from `HerbsMarketingSections.tsx` (which is otherwise a
 * server component) because this is the only piece with a real event
 * handler (`onSubmit`) — Next.js's Server Components cannot pass function
 * props to client-rendered elements. Keeping this the sole client
 * component in the file matches §30's "avoid unnecessary client
 * components" guidance: everything else in that file stays server-only.
 */
export function NewsletterSection() {
  return (
    <div className="hs-newsletter">
      <p className="hs-newsletter__title">Stay in the loop</p>
      <p className="hs-newsletter__text">
        Get occasional updates on new herbs, combo packs, and wellness guides from Spaks.
      </p>
      <form
        className="hs-newsletter__form"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <input type="email" placeholder="Your email address" aria-label="Email address" required />
        <button type="submit" className="hs-btn hs-btn--primary">
          Subscribe
        </button>
      </form>
      <p className="hs-newsletter__note">This is a demo form — no email is sent or stored yet.</p>
    </div>
  );
}
