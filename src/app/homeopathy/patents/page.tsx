import type { Metadata } from 'next';
import { HomeopathyShell } from '@/components/homeopathy/HomeopathyShell';
import { HomeopathyCatalog } from '@/components/homeopathy/HomeopathyCatalog';
import { getActiveProducts } from '@/lib/homeopathy/liveQueries';
import { getCategoriesByType } from '@/lib/demo/categories';

export const metadata: Metadata = {
  title: 'Patents — Shop by Category | Spaks Homeopathy',
  description:
    'Browse Spaks Homeopathy medicines organised by condition — 22 everyday disease and wellness categories, with filters for price, rating and availability.',
  alternates: { canonical: '/homeopathy/patents' },
};

export const revalidate = 60;

interface Props {
  searchParams: Promise<{ q?: string }>;
}

/**
 * `/homeopathy/patents` — the "Patents" division's own catalogue page
 * (see the homepage's "Three Divisions" section: Patents / Mother
 * Tincture / Cosmetics). Previously "Patents" was only a same-page
 * anchor (`/homeopathy#categories`) linking to a plain grid of category
 * tiles (`HomeopathyCategoryGrid`); this gives it the same filter
 * sidebar + grid experience as `/homeopathy/products` ("Shop All
 * Medicines") — Category, Condition, Price, Rating, In-stock — starting
 * empty until a filter/search is applied, per the owner's request that
 * this match the products page.
 *
 * PRODUCT POOL: plain `getActiveProducts()` (the full real catalogue),
 * NOT `getMergedMotherTinctureCatalog()` — Patents is specifically the
 * disease/condition-organised division, distinct from the Mother
 * Tincture division (which has its own `/mother-tincture` page merging
 * in admin-added Mother Tincture products). Using the merged pool here
 * would blur that division boundary the homepage's copy already draws.
 */
export default async function HomeopathyPatentsPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const products = await getActiveProducts();
  const categories = getCategoriesByType('N', 1);

  return (
    <HomeopathyShell>
      <main>
        <HomeopathyCatalog
          title="Patents — Shop by Category"
          subtitle="Medicines organised by condition, across every disease and wellness category"
          products={products}
          categories={categories}
          initialQuery={q}
          emptyUntilFiltered
        />
      </main>
    </HomeopathyShell>
  );
}
