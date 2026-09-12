import type { Metadata } from 'next';
import { HomeopathyShell } from '@/components/homeopathy/HomeopathyShell';
import { HomeopathyWishlistPage } from '@/components/homeopathy/HomeopathyWishlistPage';

export const metadata: Metadata = {
  title: 'Your Wishlist | Spaks Homeopathy',
  robots: { index: false, follow: false },
};

/** `/homeopathy/wishlist` — Homeopathy Store wishlist page, recreated
 * from the Herbs Store's `/herbs/wishlist` route. */
export default function HomeopathyWishlistRoute() {
  return (
    <HomeopathyShell>
      <main>
        <HomeopathyWishlistPage />
      </main>
    </HomeopathyShell>
  );
}
