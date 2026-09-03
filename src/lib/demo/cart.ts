/**
 * Demo cart items — a small, static stand-in for `darryldecode/cart`'s
 * real session-based `Cart::getContent()` (used by `CartController`).
 *
 * There is no session/cart package wired into this Next.js app (no
 * MongoDB, no auth, per this milestone's scope) — a genuinely EMPTY cart
 * would make `/shopping-cart`/`/cart-list` render the real "Your cart is
 * empty!" state (`shopping-cart.blade.php:346-355`), which is a real,
 * faithful thing this demo COULD show. But a populated cart is more
 * useful for a stakeholder demo (it's the literal front door to
 * checkout), so this file provides a small, fixed set of demo cart line
 * items, shaped to match `darryldecode\Cart\ItemCollection`'s real
 * attribute contract (`item.name`, `item.price`, `item.quantity`,
 * `item.id`, `item.attributes.image`/`imageN`/`nameN` for N=2..10) —
 * verified against `shopping-cart.blade.php:127-260`'s actual field
 * usage. This is a DELIBERATE, DOCUMENTED CHOICE (see
 * `docs/DEMO-UI-MIGRATION-REPORT.md`), not a literal reproduction of
 * "what a fresh guest session's cart looks like" (which would be empty).
 *
 * Sourced from 2 real curated demo products (src/lib/demo/products.ts) —
 * not invented content.
 */

import { DEMO_PRODUCTS } from './products.generated';

export interface DemoCartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  attributes: {
    image: string;
    uid: number | null;
  };
}

const [first, second] = DEMO_PRODUCTS;

function toCartItem(
  product: (typeof DEMO_PRODUCTS)[number] | undefined,
  quantity: number
): DemoCartItem | undefined {
  if (!product) return undefined;
  return {
    id: product.legacyId,
    name: product.pName ?? '',
    price: product.pPrice ?? 0,
    quantity,
    attributes: { image: product.pBestimg ?? '', uid: null },
  };
}

export const DEMO_CART_ITEMS: DemoCartItem[] = [toCartItem(first, 1), toCartItem(second, 2)].filter(
  (x): x is DemoCartItem => x !== undefined
);

export function getDemoCartSubtotal(): number {
  return DEMO_CART_ITEMS.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
