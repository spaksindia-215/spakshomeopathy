import type { Metadata } from 'next';
import Link from 'next/link';
import { HomeopathyShell } from '@/components/homeopathy/HomeopathyShell';
import { HomeopathyCatalog } from '@/components/homeopathy/HomeopathyCatalog';
import { EmptyState } from '@/components/homeopathy/HomeopathyUI';
import { getCosmeticsCatalog } from '@/lib/cosmetics/catalog';

export const metadata: Metadata = {
  title: 'Homeopathic Cosmetics | Spaks Homeopathy',
  description:
    'Natural homeopathic cosmetics from Spaks Homeopathy — gentle skin and hair care.',
  alternates: { canonical: '/homeopathy/cosmetics' },
};

// See `@/lib/cosmetics/catalog.ts`'s header — this page now reads
// admin-added Cosmetics products, so it carries the same revalidate
// window as `/mother-tincture`/`/nutrition` for the same reason.
export const revalidate = 60;

/**
 * `/homeopathy/cosmetics` — landing page for the homepage's "Homeopathy
 * for Cosmetics" division card (`src/app/redesign/RedesignedHome.tsx`).
 *
 * COSMETICS CRUD FEATURE WIRING (owner-approved 2026-09-20): this page
 * previously had no product source at all — its own prior header comment
 * explained that the `categories` table has no real cosmetics product
 * line, and pointed at "an admin panel (not built yet)" as the intended
 * fix, modeled on `/mother-tincture`. That admin panel now exists
 * (`/admin/add-cosmetics`, `/admin/cosmetics-list`,
 * `/admin/edit-cosmetics/[id]` — see `src/lib/cosmetics/db/schema.ts`'s
 * header). When at least one admin-added product exists, this page shows
 * the real `HomeopathyCatalog` grid (filters/sort/pagination, same as
 * every other catalog page); with zero products (today's real starting
 * state), it falls back to the original "coming soon" `EmptyState` —
 * unchanged visual behavior until an admin actually adds something.
 */
export default async function HomeopathyCosmeticsPage() {
  const products = await getCosmeticsCatalog();

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

        {products.length === 0 ? (
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
        ) : (
          <>
            <section className="hm-section hm-section--tight" style={{ paddingBottom: 0 }}>
              <div className="container">
                <h1 className="hm-section__title">Homeopathic Cosmetics</h1>
                <p style={{ maxWidth: 720, color: 'var(--hm-ink-soft)', fontSize: 14.5, lineHeight: 1.6 }}>
                  Natural homeopathic cosmetics, gentle care for a healthy, radiant you.
                </p>
              </div>
            </section>
            <HomeopathyCatalog title="Homeopathic Cosmetics" products={products} />
          </>
        )}
      </main>
    </HomeopathyShell>
  );
}
