import type { Metadata } from 'next';
import { CartPageContent } from '../CartPageContent';

/**
 * `/shopping-cart` — see `CartPageContent.tsx`'s header for the full
 * route-classification note (this route is cataloged Broken/B-16 in
 * source; this demo deliberately renders the content-bearing version
 * here anyway — a named deviation, not a silent fix).
 */
export const metadata: Metadata = {
  title: 'Spakshomeopathy - Cart',
  other: {
    'msapplication-TileColor': '#ffffff',
    'theme-color': '#ffffff',
  },
};

export default function ShoppingCartPage() {
  return <CartPageContent />;
}
