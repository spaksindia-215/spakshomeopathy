import type { Metadata } from 'next';
import Link from 'next/link';
import { HomeopathyShell } from '@/components/homeopathy/HomeopathyShell';
import { HomeopathyCatalog } from '@/components/homeopathy/HomeopathyCatalog';
import { HomeopathyProductCard } from '@/components/homeopathy/HomeopathyProductCard';
import { getCategoriesByType } from '@/lib/demo/categories';
import { getMergedMotherTinctureCatalog } from '@/lib/motherTincture/catalog';

export const metadata: Metadata = {
  title: 'Nutritional & Supplements | Spaks Homeopathy',
  description:
    'Browse the Spaks Nutritional & Supplements division — the full Spaks catalogue of genuine homeopathic remedies that support everyday nutrition and wellness alongside treatment.',
  alternates: { canonical: '/nutrition' },
};

// See `@/lib/motherTincture/catalog.ts`'s header — this page now merges
// in admin-added Mother Tincture products, so it carries the same
// revalidate window as `/mother-tincture` for the same reason.
export const revalidate = 60;

interface Props {
  searchParams: Promise<{ q?: string }>;
}

/**
 * `/nutrition` — the "Nutritional & Supplements" division landing page
 * referenced from the homepage's division cards
 * (`src/app/redesign/RedesignedHome.tsx`). This division has no separate
 * supplement-only product line in the real data — the curated catalogue
 * (`getActiveProducts()`, 125 real products) is all classical homeopathic
 * medicine grouped under 22 disease categories
 * (`getCategoriesByType('N', 1)`). Rather than invent fake supplement
 * products/categories, this page is honest about that: it frames itself
 * as browsing the full Spaks catalogue, including the remedies that
 * support nutrition/wellness alongside treatment, and reuses the exact
 * same catalog engine (`HomeopathyCatalog`) as `/homeopathy/products` —
 * same filter sidebar, sort, grid and pagination, same hm-* visual theme.
 */
export default async function NutritionPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const products = await getMergedMotherTinctureCatalog();
  const categories = getCategoriesByType('N', 1);
  // Server-rendered here — see HomeopathyCatalog's `cardsById` doc comment.
  const cardsById = new Map(products.map((p) => [p.legacyId, <HomeopathyProductCard key={p.legacyId} product={p} />]));

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
              <li aria-current="page">Nutritional &amp; Supplements</li>
            </ol>
          </div>
        </section>

        <section className="hm-section hm-section--tight" style={{ paddingBottom: 0 }}>
          <div className="container">
            <p style={{ maxWidth: 720, color: 'var(--hm-ink-soft)', fontSize: 14.5, lineHeight: 1.6 }}>
              The Nutritional &amp; Supplements division is our everyday-wellness lens on the same
              Spaks catalogue — genuine homeopathic remedies that support nutrition and general
              wellbeing alongside treatment. Browse the full range below and filter by category,
              price, rating or availability.
            </p>
          </div>
        </section>

        <HomeopathyCatalog
          title="Nutritional & Supplements"
          subtitle="Browse the full Spaks catalogue for everyday nutrition and wellness support"
          products={products}
          cardsById={cardsById}
          categories={categories}
          initialQuery={q}
        />
      </main>
    </HomeopathyShell>
  );
}
