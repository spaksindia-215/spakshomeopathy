import type { Metadata } from 'next';
import Link from 'next/link';
import { HomeopathyShell } from '@/components/homeopathy/HomeopathyShell';
import { HomeopathyCatalog } from '@/components/homeopathy/HomeopathyCatalog';
import { HomeopathyProductCard } from '@/components/homeopathy/HomeopathyProductCard';
import { getCategoriesByType } from '@/lib/demo/categories';
import { getMergedMotherTinctureCatalog } from '@/lib/motherTincture/catalog';

export const metadata: Metadata = {
  title: 'Mother Tincture | Spaks Homeopathy',
  description:
    'Browse Mother Tincture medicines from the Spaks Homeopathy catalogue — genuine remedies often used as a base for other homeopathic preparations.',
  alternates: { canonical: '/mother-tincture' },
};

// See `@/lib/motherTincture/catalog.ts`'s header (mirrors
// `@/lib/herbs/catalog.ts`'s own caveat) — once a real database is
// configured, this page becomes effectively dynamic; `revalidate` keeps
// admin-added products visible within this window rather than only at
// the next full rebuild/deploy.
export const revalidate = 60;

interface Props {
  searchParams: Promise<{ q?: string }>;
}

/**
 * `/mother-tincture` — rebuilt from the legacy PDF-price-list iframe page
 * (`mother-tincture.blade.php` port) into a public storefront page in the
 * same `hm-*` theme/UX as `/homeopathy` and `/nutrition`.
 *
 * PRODUCT POOL: per the owner's framing, Mother Tincture is a
 * cross-cutting category of medicine ("useful for adding other
 * medicines"), not a separate isolated product line — so this page shows
 * the REAL curated catalogue (same `getActiveProducts()`-derived pool
 * `/homeopathy/products` uses, via `getMergedMotherTinctureCatalog()`),
 * not an invented "Mother Tincture only" product set. Admin-added Mother
 * Tincture products (`/admin/add-mother-tincture`) are merged in
 * alongside it, real `Product`-shaped entries indistinguishable in shape
 * from any curated product — same honesty posture as `/nutrition`'s own
 * doc comment.
 *
 * LEGACY CONTENT PRESERVED: the original page's PDF price list
 * (`Mother-Tincture-Price-list.pdf`, the exact asset the old iframe
 * pointed at — confirmed present at `public/Mother-Tincture-Price-list.pdf`)
 * is kept reachable via a plain link near the top, rather than silently
 * dropped.
 */
export default async function MotherTincturePage({ searchParams }: Props) {
  const { q } = await searchParams;
  const products = await getMergedMotherTinctureCatalog();
  const categories = getCategoriesByType('N', 1);
  // Server-rendered here — see HomeopathyCatalog's `cardsById` doc comment.
  const cardsById = new Map(
    products.map((p) => [p.legacyId, <HomeopathyProductCard key={p.legacyId} product={p} />])
  );

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

        <section className="hm-section hm-section--tight" style={{ paddingBottom: 0 }}>
          <div className="container">
            <p style={{ maxWidth: 720, color: 'var(--hm-ink-soft)', fontSize: 14.5, lineHeight: 1.6 }}>
              Mother Tinctures are concentrated herbal extracts, often used on their own or as
              the base for other homeopathic preparations. Browse the full range below and
              filter by category, price, rating or availability.
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

        <HomeopathyCatalog
          title="Mother Tincture"
          subtitle="Browse Mother Tincture medicines and remedies that use them"
          products={products}
          cardsById={cardsById}
          categories={categories}
          initialQuery={q}
        />
      </main>
    </HomeopathyShell>
  );
}
