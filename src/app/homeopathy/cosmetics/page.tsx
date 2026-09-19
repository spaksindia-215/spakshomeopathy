import type { Metadata } from 'next';
import Link from 'next/link';
import { HomeopathyShell } from '@/components/homeopathy/HomeopathyShell';
import { EmptyState } from '@/components/homeopathy/HomeopathyUI';

export const metadata: Metadata = {
  title: 'Homeopathic Cosmetics | Spaks Homeopathy',
  description:
    'Natural homeopathic cosmetics from Spaks Homeopathy — gentle skin and hair care, coming soon.',
  alternates: { canonical: '/homeopathy/cosmetics' },
};

/**
 * `/homeopathy/cosmetics` — landing page for the homepage's "Homeopathy
 * for Cosmetics" division card (`src/app/redesign/RedesignedHome.tsx`).
 *
 * There is no real Cosmetics product line in the migrated data yet: the
 * `categories` table's only rows are the 22 disease categories (type
 * `'N'`) plus herbs (`'H'`) — see `src/lib/mongodb/schemas/category.ts`.
 * "Skin Diseases" (`skin-783e0`) is one of those disease categories, not
 * a cosmetics/skin-care product line, so this page intentionally does
 * NOT reuse it or any other borrowed category — that would show
 * unrelated medicine products under a "Cosmetics" heading.
 *
 * Per the owner: cosmetics products will be added later via an admin
 * panel (not built yet). Until that exists, this page is honest about
 * having no products yet rather than silently repurposing a disease
 * category — same posture as `/nutrition`'s doc comment. Swap the
 * `EmptyState` below for a real `HomeopathyCatalog` (see `/mother-tincture`
 * for that pattern) once a real cosmetics product source exists.
 */
export default function HomeopathyCosmeticsPage() {
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
              <li aria-current="page">Cosmetics</li>
            </ol>
          </div>
        </section>

        <section className="hm-section">
          <div className="container">
            <div className="hm-section__head">
              <div>
                <h1 className="hm-section__title">Homeopathic Cosmetics</h1>
                <p className="hm-section__subtitle">
                  Natural homeopathic cosmetics, gentle care for a healthy, radiant you.
                </p>
              </div>
            </div>

            <EmptyState
              icon="sparkle"
              title="Our cosmetics range is coming soon."
              text="We're preparing our line of natural homeopathic cosmetics. Check back soon, or explore our homeopathic medicines in the meantime."
              action={
                <Link href="/homeopathy/products" className="hm-btn hm-btn--outline hm-btn--sm">
                  Explore Medicines
                </Link>
              }
            />
          </div>
        </section>
      </main>
    </HomeopathyShell>
  );
}
