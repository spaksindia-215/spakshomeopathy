import type { Metadata } from 'next';
import { HerbsShell } from '@/components/herbs/HerbsShell';
import { HerbsCartPage } from '@/components/herbs/HerbsCartPage';
import { getMergedHerbCatalog } from '@/lib/herbs/catalog';

export const metadata: Metadata = {
  title: 'Your Cart | Spaks Herbs',
  robots: { index: false, follow: false },
};

/** ISR — see `@/lib/herbs/catalog`'s "STATIC GENERATION CAVEAT" for why
 * this exists once a real database is configured. */
export const revalidate = 60;

/** `/herbs/cart` — Herbs Store cart page (§17 of the original brief). */
export default async function HerbsCartRoute() {
  const catalog = await getMergedHerbCatalog();
  return (
    <HerbsShell catalog={catalog}>
      <main>
        <HerbsCartPage />
      </main>
    </HerbsShell>
  );
}
