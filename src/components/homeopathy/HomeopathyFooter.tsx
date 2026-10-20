import Link from 'next/link';
import { HomeopathyIcon } from './HomeopathyIcon';
import { getCategoriesByType } from '@/lib/demo/categories';
import { getDb } from '@/lib/mongodb/client';
import { getSiteSettings } from '@/lib/settings/repository';

/**
 * Homeopathy Store footer. New, self-contained — recreated from the
 * Herbs Store's `HerbsFooter.tsx` layout, over the real category list
 * instead of a static taxonomy file. Reuses the same real Spaks contact
 * details already public on the legacy footer/Herbs footer, not invented
 * contact information.
 *
 * SITE SETTINGS WIRING (Site Settings feature follow-up, 2026-09-20): see
 * `HerbsFooter.tsx`'s matching header comment — same reasoning, same
 * source of truth.
 */
export async function HomeopathyFooter() {
  const categories = getCategoriesByType('N', 1);
  const db = await getDb();
  const settings = await getSiteSettings(db);

  return (
    <div className="homeopathy-scope">
      <footer className="hm-footer">
        <div className="container">
          <div className="hm-footer__grid">
            <div>
              <p className="hm-footer__brand">Spaks Homeopathy</p>
              <p className="hm-footer__text">
                Classical homeopathic medicines from Spaks India Business Solution Pvt Ltd —
                genuine remedies, dispensed under clinical supervision.
              </p>
              <p className="hm-footer__text" style={{ marginTop: 14 }}>
                <HomeopathyIcon name="support" size={14} /> {settings.contactEmail}
                <br />
                {settings.contactPhone}
              </p>
            </div>
            <div>
              <p className="hm-footer__heading">Shop by Category</p>
              <ul className="hm-footer__links">
                {categories.slice(0, 5).map((c) => (
                  <li key={c.legacyId}>
                    <Link href={`/homeopathy/category/${c.slug}`}>{c.name}</Link>
                  </li>
                ))}
                <li>
                  <Link href="/homeopathy/products">All Medicines</Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="hm-footer__heading">Shop</p>
              <ul className="hm-footer__links">
                <li>
                  <Link href="/homeopathy">Home</Link>
                </li>
                <li>
                  <Link href="/homeopathy/products">Shop All</Link>
                </li>
                <li>
                  <Link href="/">Main Site</Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="hm-footer__heading">Support</p>
              <ul className="hm-footer__links">
                <li>
                  <Link href="/homeopathy/cart">Your Cart</Link>
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

          <div className="hm-footer__bottom">
            <span>&copy; 2026 Spaks India Business Solution Pvt Ltd | All Rights Reserved</span>
            <span>Spaks Homeopathy</span>
          </div>
          <p className="hm-footer__disclaimer">
            Information on this site is provided for general informational purposes only and is not
            medical advice. These statements have not been evaluated for the diagnosis, treatment,
            cure, or prevention of any disease. Please consult a qualified healthcare practitioner
            before starting any new remedy, especially if pregnant, nursing, or taking medication.
          </p>
        </div>
      </footer>
    </div>
  );
}
