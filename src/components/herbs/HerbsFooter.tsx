import Link from 'next/link';
import { HERB_FORM_CATEGORIES, WELLNESS_CATEGORIES } from '@/lib/herbs/data/taxonomy';
import { HerbIcon } from './HerbIcon';

/**
 * Herbs Store footer. New, self-contained — not a modification of
 * `@/components/layout/PublicFooter` (CR-003 §10.3). Reuses Spaks
 * business identity/contact details already public on the legacy footer
 * (same email/phone/address), not invented contact information.
 */
export function HerbsFooter() {
  return (
    <div className="herbs-scope">
      <footer className="hs-footer">
        <div className="container">
          <div className="hs-footer__grid">
            <div>
              <p className="hs-footer__brand">Spaks Herbs</p>
              <p className="hs-footer__text">
                The herbal wellness store from Spaks India Business Solution Pvt Ltd — traditional
                herbs, thoughtfully sourced, for everyday wellness routines.
              </p>
              <p className="hs-footer__text" style={{ marginTop: 14 }}>
                <HerbIcon name="support" size={14} /> spakshomeopathy@gmail.com
                <br />
                +91 8700458818
              </p>
            </div>
            <div>
              <p className="hs-footer__heading">Shop</p>
              <ul className="hs-footer__links">
                {HERB_FORM_CATEGORIES.slice(0, 5).map((c) => (
                  <li key={c.form}>
                    <Link href={`/herbs/category/${c.form}`}>{c.label}</Link>
                  </li>
                ))}
                <li>
                  <Link href="/herbs/products">All Herbs</Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="hs-footer__heading">Wellness</p>
              <ul className="hs-footer__links">
                {WELLNESS_CATEGORIES.slice(0, 5).map((c) => (
                  <li key={c.key}>
                    <Link href={`/herbs/wellness/${c.key}`}>{c.label}</Link>
                  </li>
                ))}
                <li>
                  <Link href="/herbs/wellness">All Wellness</Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="hs-footer__heading">Support</p>
              <ul className="hs-footer__links">
                <li>
                  <Link href="/herbs/cart">Your Cart</Link>
                </li>
                <li>
                  <Link href="/herbs/wishlist">Your Wishlist</Link>
                </li>
                <li>
                  <Link href="/contact">Contact Us</Link>
                </li>
                <li>
                  <Link href="/return-policy">Return &amp; Refund Policy</Link>
                </li>
                <li>
                  <Link href="/privacy-policy">Privacy Policy</Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="hs-footer__bottom">
            <span>&copy; 2026 Spaks India Business Solution Pvt Ltd | All Rights Reserved</span>
            <span>Spaks Herbs — a division of Spaks Homeopathy</span>
          </div>
          <p className="hs-footer__disclaimer">
            Information on this site is for general wellness purposes only and reflects traditional
            and Ayurvedic use of herbs. It is not medical advice and these statements have not been
            evaluated for the diagnosis, treatment, cure, or prevention of any disease. Please
            consult a qualified healthcare practitioner before starting any new herbal routine,
            especially if pregnant, nursing, or taking medication.
          </p>
        </div>
      </footer>
    </div>
  );
}
