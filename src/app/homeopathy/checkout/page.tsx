import type { Metadata } from 'next';
import { HomeopathyShell } from '@/components/homeopathy/HomeopathyShell';
import { HomeopathyCheckoutPage } from '@/components/homeopathy/HomeopathyCheckoutPage';

export const metadata: Metadata = {
  title: 'Checkout | Spaks Homeopathy',
  robots: { index: false, follow: false },
};

export default function HomeopathyCheckoutRoute() {
  return (
    <HomeopathyShell>
      <main>
        <HomeopathyCheckoutPage />
      </main>
    </HomeopathyShell>
  );
}
