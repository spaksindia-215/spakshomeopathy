'use client';

/**
 * Homeopathy Store header. Recreated from the Herbs Store's
 * `HerbsHeader.tsx` layout/markup (`hm-topbar`/`hm-header`/`hm-nav`/
 * `hm-search`/`hm-header__actions`) as a CLIENT component with its own
 * client-side cart/wishlist store (`useHomeopathyStore`) and live
 * quick-search dropdown — matching the Herbs Store exactly, per the
 * owner's request that Add to Cart (and the header badges reflecting it)
 * behave identically on both storefronts.
 *
 * Previously this was an async Server Component reading the real session
 * cart (`getCartContent()`/`getTotalCartItem()` from `@/lib/cart`) so the
 * badge matched the legacy `/product-store-cart` flow. That legacy route
 * is untouched and still reachable at `/cart-list` for the pre-existing
 * `/products`/`/details` pages, but the Homeopathy Store's own header no
 * longer reads it — it reads the new client-side store instead, the same
 * relationship `HerbsHeader` has to `useHerbsStore`.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { HomeopathyIcon } from './HomeopathyIcon';
import { ProductImage } from './HomeopathyMedia';
import { useHomeopathyStore } from './HomeopathyStoreProvider';
import { getAllProducts } from '@/lib/demo/products';
import type { Product } from '@/lib/mongodb/schemas';

const NAV_ITEMS = [
  { href: '/homeopathy', label: 'Home' },
  { href: '/homeopathy/patents', label: 'Patents' },
  { href: '/mother-tincture', label: 'Mother Tincture' },
  { href: '/homeopathy/category/skin-783e0', label: 'Cosmetics' },
  { href: '/homeopathy/products', label: 'Shop All' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

function searchProducts(query: string, limit: number): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return getAllProducts()
    .filter((p) => p.pStatus === 1)
    .filter((p) =>
      [p.pName, p.pHeading, p.searchTerms].some((f) => (f ?? '').toLowerCase().includes(q))
    )
    .slice(0, limit);
}

export function HomeopathyHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { cartCount, wishlist } = useHomeopathyStore();
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => searchProducts(query, 6), [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/homeopathy/products?q=${encodeURIComponent(query.trim())}`);
      setShowResults(false);
    }
  }

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
          <button
            type="button"
            className="hm-menu-toggle"
            aria-label="Open menu"
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen(true)}
          >
            <HomeopathyIcon name="filter" size={22} />
          </button>

          <a
            href="https://spakshomeopathy.elitesfly.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hm-brand"
          >
            <img src="/assets/images/resources/logo.png" alt="Spaks Homeopathy" />
            <span className="hm-brand__text">
              <span className="hm-brand__name">Spaks Homeopathy</span>
              <span className="hm-brand__sub">Medicine Store</span>
            </span>
          </a>

          <nav aria-label="Homeopathy store navigation">
            <ul className="hm-nav">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} aria-current={pathname === item.href ? 'page' : undefined}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="hm-search" ref={searchRef}>
            <form onSubmit={submitSearch}>
              <span className="hm-search__icon">
                <HomeopathyIcon name="search" size={17} />
              </span>
              <input
                type="search"
                placeholder="Search medicines, e.g. Arnica…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowResults(true);
                }}
                onFocus={() => setShowResults(true)}
                aria-label="Search homeopathy medicines"
              />
            </form>
            {showResults && query.trim() && (
              <div className="hm-search__results" role="listbox">
                {results.length === 0 ? (
                  <div className="hm-search__empty">No medicines found for “{query}”.</div>
                ) : (
                  results.map((p) => (
                    <Link
                      key={p.legacyId}
                      href={`/homeopathy/product/${p.pSlug}`}
                      className="hm-search__result"
                      onClick={() => setShowResults(false)}
                    >
                      <span className="hm-search__result-art">
                        <ProductImage filename={p.pBestimg} alt={p.pName || p.pHeading} />
                      </span>
                      <span>
                        <strong style={{ fontSize: 13.5 }}>{p.pName || p.pHeading}</strong>
                        <br />
                        <span style={{ fontSize: 12, color: 'var(--hm-ink-soft)' }}>
                          {p.pHeading}
                        </span>
                      </span>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="hm-header__actions">
            <Link
              href="/homeopathy/wishlist"
              className="hm-icon-btn"
              aria-label={`Wishlist (${wishlist.length} items)`}
            >
              <HomeopathyIcon name="wishlist" size={20} />
              {wishlist.length > 0 && <span className="hm-icon-btn__badge">{wishlist.length}</span>}
            </Link>
            <Link
              href="/homeopathy/cart"
              className="hm-icon-btn"
              aria-label={`Cart (${cartCount} items)`}
            >
              <HomeopathyIcon name="cart" size={20} />
              {cartCount > 0 && <span className="hm-icon-btn__badge">{cartCount}</span>}
            </Link>
            <Link href="/homeopathy/products" className="hm-header__cta">
              Shop Now
            </Link>
          </div>
        </div>
      </header>

      {mobileNavOpen && (
        <>
          <div className="hm-drawer-backdrop" onClick={() => setMobileNavOpen(false)} />
          <div className="hm-drawer" role="dialog" aria-modal="true" aria-label="Site navigation">
            <div className="hm-drawer__head">
              <h3>Menu</h3>
              <button
                type="button"
                className="hm-icon-btn"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close menu"
              >
                <HomeopathyIcon name="close" size={18} />
              </button>
            </div>
            <ul className="hm-footer__links">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    style={{ color: 'var(--hm-ink)' }}
                    onClick={() => setMobileNavOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
