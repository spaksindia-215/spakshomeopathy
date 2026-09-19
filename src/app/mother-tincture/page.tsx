import type { Metadata } from 'next';
import Link from 'next/link';
import { HomeopathyShell } from '@/components/homeopathy/HomeopathyShell';

export const metadata: Metadata = {
  title: 'Mother Tincture | Spaks Homeopathy',
  description:
    'Browse Mother Tincture medicines from the Spaks Homeopathy catalogue — genuine remedies often used as a base for other homeopathic preparations.',
  alternates: { canonical: '/mother-tincture' },
};

/**
 * `/mother-tincture` — rebuilt from the legacy PDF-price-list iframe page
 * (`mother-tincture.blade.php` port) into a page in the same `hm-*`
 * theme/UX as `/homeopathy` and `/nutrition`.
 *
 * PRODUCT LISTING REMOVED: per request, this page no longer shows the
 * product catalogue/grid — it stops after the intro copy and the PDF
 * price-list download link.
 *
 * LEGACY CONTENT PRESERVED: the original page's PDF price list
 * (`Mother-Tincture-Price-list.pdf`, the exact asset the old iframe
 * pointed at — confirmed present at `public/Mother-Tincture-Price-list.pdf`)
 * is kept reachable via a plain link near the top, rather than silently
 * dropped.
 */
export default function MotherTincturePage() {
  return (
    <HomeopathyShell>
      <main>
        <section className="hm-breadcrumb">
          <div className="container">
            <ol>
              <li>
                <Link href="/homeopathy">Home</Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page">Mother Tincture</li>
            </ol>
          </div>
        </section>

        <section className="hm-section hm-section--tight">
          <div className="container">
            <p style={{ maxWidth: 720, color: 'var(--hm-ink-soft)', fontSize: 14.5, lineHeight: 1.6 }}>
              Mother Tinctures are concentrated herbal extracts, often used on their own or as
              the base for other homeopathic preparations.
            </p>
            <p style={{ marginTop: 10 }}>
              <a
                href="/Mother-Tincture-Price-list.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="hm-btn hm-btn--outline hm-btn--sm"
              >
                Download full price list (PDF)
              </a>
            </p>
          </div>
        </section>
      </main>
    </HomeopathyShell>
  );
}
