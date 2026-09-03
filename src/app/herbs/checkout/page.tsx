import type { Metadata } from 'next';
import { HerbsShell } from '@/components/herbs/HerbsShell';
import { HerbsCheckoutPage } from '@/components/herbs/HerbsCheckoutPage';
import { getMergedHerbCatalog } from '@/lib/herbs/catalog';

export const metadata: Metadata = {
  title: 'Checkout | Spaks Herbs',
  robots: { index: false, follow: false },
};

/** ISR — see `@/lib/herbs/catalog`'s "STATIC GENERATION CAVEAT" for why
 * this exists once a real database is configured. */
export const revalidate = 60;

/** `/herbs/checkout` — demo checkout flow (§16, §18 of the original brief). */
export default async function HerbsCheckoutRoute() {
  const catalog = await getMergedHerbCatalog();
  return (
    <HerbsShell catalog={catalog}>
      <main>
        <HerbsCheckoutPage />
      </main>
    </HerbsShell>
  );
}
