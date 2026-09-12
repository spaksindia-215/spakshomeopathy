import type { Metadata } from 'next';
import { HomeopathyShell } from '@/components/homeopathy/HomeopathyShell';
import { HomeopathyCartPage } from '@/components/homeopathy/HomeopathyCartPage';

export const metadata: Metadata = {
  title: 'Your Cart | Spaks Homeopathy',
  robots: { index: false, follow: false },
};

/** `/homeopathy/cart` — Homeopathy Store cart page, recreated from the
 * Herbs Store's `/herbs/cart` route. */
export default function HomeopathyCartRoute() {
  return (
    <HomeopathyShell>
      <main>
        <HomeopathyCartPage />
      </main>
    </HomeopathyShell>
  );
}
