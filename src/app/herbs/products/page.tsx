import type { Metadata } from 'next';
import { HerbsShell } from '@/components/herbs/HerbsShell';
import { HerbCatalog } from '@/components/herbs/HerbCatalog';
import { getMergedHerbCatalog } from '@/lib/herbs/catalog';

/**
 * `/herbs/products` — full Herbs catalog/listing page (§10, §13 of the
 * original brief). Does not collide with the legacy `/products`
 * (herbs-list) route — separate path, separate purpose (see that page's
 * own header for its legacy scope).
 */
export const metadata: Metadata = {
  title: 'Shop All Herbs | Spaks Herbs',
  description:
    'Browse the full Spaks Herbs catalogue — whole herbs, powders, roots, teas and herbal combinations.',
  alternates: { canonical: '/herbs/products' },
};

/** ISR — see `@/lib/herbs/catalog`'s "STATIC GENERATION CAVEAT" for why
 * this exists once a real database is configured. */
export const revalidate = 60;

export default async function HerbsProductsPage() {
  const catalog = await getMergedHerbCatalog();
  return (
    <HerbsShell catalog={catalog}>
      <main>
        <HerbCatalog
          title="Shop All Herbs"
          subtitle="Browse our full herbal catalogue"
          catalog={catalog}
        />
      </main>
    </HerbsShell>
  );
}
