/**
 * Homeopathy Store header. A new, self-contained header used only on
 * `/homeopathy/**` pages — recreated from the Herbs Store's
 * `HerbsHeader.tsx` layout/markup (`hm-topbar`/`hm-header`/`hm-nav`/
 * `hm-search`/`hm-header__actions`), but as an ASYNC SERVER COMPONENT
 * rather than a client component with its own client-side cart/wishlist
 * store: this storefront reuses the site's REAL session cart, so the
 * cart badge reads it exactly the way `PublicHeader.tsx`'s
 * `StickyNavBody` does — `getCartContent()`/`getTotalCartItem()` from
 * `@/lib/cart`, no parallel cart state. Search is a plain GET form to
 * `/homeopathy/products?q=` (server-rendered filtering), not a live
 * client-side dropdown — keeping this a server component avoids adding a
 * second client cart/wishlist provider that would compete with the real
 * one this route deliberately reuses.
 */

import Link from 'next/link';
import { getCartContent, getTotalCartItem } from '@/lib/cart';
import { HomeopathyIcon } from './HomeopathyIcon';

const NAV_ITEMS = [
  { href: '/homeopathy', label: 'Home' },
  { href: '/homeopathy#categories', label: 'Patents' },
  { href: '/mother-tincture', label: 'Mother Tincture' },
  { href: '/homeopathy/category/skin-783e0', label: 'Cosmetics' },
  { href: '/homeopathy/products', label: 'Shop All' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export async function HomeopathyHeader() {
  const cartContent = await getCartContent();
  const totalCartItem = getTotalCartItem(cartContent);

  return (
    <div className="homeopathy-scope">
      <div className="hm-topbar">
        <div className="container hm-topbar__row">
          <ul className="hm-topbar__items">
            <li>
              <HomeopathyIcon name="shield" size={14} /> Genuine Homeopathic Medicines
            </li>
            <li>
              <HomeopathyIcon name="truck" size={14} /> Fast Delivery Across India
            </li>
            <li>
              <HomeopathyIcon name="lock" size={14} /> Secure Ordering
            </li>
          </ul>
          <Link href="/" className="hm-topbar__link">
            ← Back to Spaks Homeopathy
          </Link>
        </div>
      </div>

      <header className="hm-header">
        <div className="container hm-header__row">
          <Link href="/homeopathy" className="hm-brand">
            <img src="/assets/images/resources/logo.png" alt="Spaks Homeopathy" />
            <span className="hm-brand__text">
              <span className="hm-brand__name">Spaks Homeopathy</span>
              <span className="hm-brand__sub">Medicine Store</span>
            </span>
          </Link>

          <nav aria-label="Homeopathy store navigation">
            <ul className="hm-nav">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="hm-search">
            <form action="/homeopathy/products" method="GET">
              <span className="hm-search__icon">
                <HomeopathyIcon name="search" size={17} />
              </span>
              <input
                type="search"
                name="q"
                placeholder="Search medicines, e.g. Arnica…"
                aria-label="Search homeopathy medicines"
              />
            </form>
          </div>

          <div className="hm-header__actions">
            <a
              href="/cart-list"
              className="hm-icon-btn"
              aria-label={`Cart (${totalCartItem} items)`}
            >
              <HomeopathyIcon name="cart" size={20} />
              {totalCartItem > 0 && <span className="hm-icon-btn__badge">{totalCartItem}</span>}
            </a>
            <Link href="/homeopathy/products" className="hm-header__cta">
              Shop Now
            </Link>
          </div>
        </div>
      </header>
    </div>
  );
}
