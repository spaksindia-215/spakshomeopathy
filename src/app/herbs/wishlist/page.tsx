import type { Metadata } from 'next';
import { HerbsShell } from '@/components/herbs/HerbsShell';
import { HerbsWishlistPage } from '@/components/herbs/HerbsWishlistPage';
import { getMergedHerbCatalog } from '@/lib/herbs/catalog';

export const metadata: Metadata = {
  title: 'Your Wishlist | Spaks Herbs',
  robots: { index: false, follow: false },
};

/** ISR — see `@/lib/herbs/catalog`'s "STATIC GENERATION CAVEAT" for why
 * this exists once a real database is configured. */
export const revalidate = 60;

/** `/herbs/wishlist` — Herbs Store wishlist page (§19 of the original brief). */
export default async function HerbsWishlistRoute() {
  const catalog = await getMergedHerbCatalog();
  return (
    <HerbsShell catalog={catalog}>
      <main>
        <HerbsWishlistPage catalog={catalog} />
      </main>
    </HerbsShell>
  );
}
