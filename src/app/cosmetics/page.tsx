import type { Metadata } from 'next';
import { HomeopathyShell } from '@/components/homeopathy/HomeopathyShell';
import { getCosmeticsCatalog } from '@/lib/cosmetics/catalog';
import { CosmeticsStoreView } from './CosmeticsStoreView';

export const metadata: Metadata = {
  title: 'Cosmetics Store — Homeopathic, Allopathic & Ayurvedic | Spaks Homeopathy',
  description:
    'Shop skin and hair cosmetics across three divisions: Homeopathic, Allopathic, and Ayurvedic at Spaks Homeopathy.',
  alternates: { canonical: '/cosmetics' },
};

export const revalidate = 60;

/**
 * `/cosmetics` — Cosmetics Store landing page.
 * Displays the 3 divisions (1. Homeopathic, 2. Allopathic, 3. Ayurvedic)
 * with an interactive category filter and cosmetics catalog.
 */
export default async function CosmeticsPage() {
  const products = await getCosmeticsCatalog();

  return (
    <HomeopathyShell>
      <main>
        <CosmeticsStoreView products={products} />
      </main>
    </HomeopathyShell>
  );
}
