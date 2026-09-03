import type { Metadata } from 'next';
import { CartPageContent } from '../CartPageContent';

/**
 * `/cart-list` (named route `cartList`) — the REAL, content-bearing cart
 * route in production (`CartController@cartList`). See
 * `CartPageContent.tsx`'s header for the full detail.
 */
export const metadata: Metadata = {
  title: 'Spakshomeopathy - Cart',
  other: {
    'msapplication-TileColor': '#ffffff',
    'theme-color': '#ffffff',
  },
};

export default function CartListPage() {
  return <CartPageContent />;
}
