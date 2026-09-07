import type { Metadata } from 'next';
import { HomeopathyShell } from '@/components/homeopathy/HomeopathyShell';
import { HomeopathyCatalog } from '@/components/homeopathy/HomeopathyCatalog';
import { HomeopathyProductCard } from '@/components/homeopathy/HomeopathyProductCard';
import { getCategoriesByType } from '@/lib/demo/categories';
import { getMergedMotherTinctureCatalog } from '@/lib/motherTincture/catalog';

export const metadata: Metadata = {
  title: 'Shop All Medicines | Spaks Homeopathy',
  description:
    'Browse the full Spaks Homeopathy catalogue — classical remedies across every everyday disease and wellness category.',
  alternates: { canonical: '/homeopathy/products' },
};

// See `@/lib/motherTincture/catalog.ts`'s header — this page now merges
// in admin-added Mother Tincture products, so it carries the same
// revalidate window as `/mother-tincture` for the same reason.
export const revalidate = 60;

interface Props {
  searchParams: Promise<{ q?: string }>;
}

/**
 * `/homeopathy/products` — full catalogue/listing page. Does not collide
 * with the legacy `/products` route — separate path, separate purpose,
 * recreating the Herbs Store's `/herbs/products` page-composition
 * pattern over the real product/category data.
 *
 * Uses `getMergedMotherTinctureCatalog()` (not `getActiveProducts()`
 * directly) so admin-added Mother Tincture products
 * (`/admin/add-mother-tincture`) appear in the general catalogue too —
 * see that function's header for why: Mother Tincture is a cross-cutting
 * category, not a siloed product line, per the owner's framing.
 */
export default async function HomeopathyProductsPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const products = await getMergedMotherTinctureCatalog();
  const categories = getCategoriesByType('N', 1);
  // Cards are built HERE, server-side — see HomeopathyCatalog's `cardsById`
  // doc comment for why this can't happen inside the client catalog itself
  // (AddToCartForm needs a real server render for its CSRF token).
  const cardsById = new Map(products.map((p) => [p.legacyId, <HomeopathyProductCard key={p.legacyId} product={p} />]));

  return (
    <HomeopathyShell>
      <main>
        <HomeopathyCatalog
          title="Shop All Medicines"
          subtitle="Browse our full homeopathy catalogue"
          products={products}
          cardsById={cardsById}
          categories={categories}
          initialQuery={q}
        />
      </main>
    </HomeopathyShell>
  );
}
