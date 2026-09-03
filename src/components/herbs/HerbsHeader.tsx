'use client';

/**
 * Herbs Store header. A NEW, self-contained header used only on `/herbs/**`
 * pages — not a replacement of `@/components/layout/PublicHeader` (CR-003
 * §10.3: existing shared components are extended additively, never
 * rewritten). The two headers share only the Spaks logo asset
 * (`/assets/images/resources/logo.png`, already used by the legacy
 * header) and a link back to the main site's Home — everything else here
 * is new UI, scoped under `.herbs-scope` styling.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { HerbIcon } from './HerbIcon';
import { HerbArt } from './HerbArt';
import { useHerbsStore } from './HerbsStoreProvider';
import { searchHerbProducts } from '@/lib/herbs/queries';
import type { HerbProduct } from '@/lib/herbs/types';

const NAV_ITEMS = [
  { href: '/herbs', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/herbs/products', label: 'Herbs' },
  { href: '/herbs/wellness', label: 'Diseases' },
  { href: '/video', label: 'Video' },
  {
    href: 'http://www.spakshomeopathy.com/public/Mother-Tincture-Price-list.pdf',
    label: 'Mother Tincture',
  },
  { href: 'http://www.spakshomeopathy.com/public/Potencies-rate-list.pdf', label: 'Potencies' },
  { href: '/contact', label: 'Contact' },
];

export interface HerbsHeaderProps {
  /** Optional DB-merged catalogue (see `HerbCatalog`'s `catalog` prop doc
   * for the full rationale) — used by the header's own quick-search.
   * Falls back to the static seed catalogue when omitted. */
  catalog?: HerbProduct[];
}

export function HerbsHeader({ catalog }: HerbsHeaderProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { cartCount, wishlist } = useHerbsStore();
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const results = useMemo(
    () => (query.trim() ? searchHerbProducts(query, catalog).slice(0, 6) : []),
    [query, catalog]
  );

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
      router.push(`/herbs/search?q=${encodeURIComponent(query.trim())}`);
      setShowResults(false);
    }
  }

  return (
    <div className="herbs-scope">
      <div className="hs-topbar">
        <div className="container hs-topbar__row">
          <ul className="hs-topbar__items">
            <li>
              <HerbIcon name="leaf" size={14} /> Pure &amp; Quality Herbs
            </li>
            <li>
              <HerbIcon name="truck" size={14} /> Fast Delivery Across India
            </li>
            <li>
              <HerbIcon name="lock" size={14} /> Secure Ordering
            </li>
          </ul>
          <Link href="/" className="hs-topbar__link">
            ← Back to Spaks Homeopathy
          </Link>
        </div>
      </div>

      <header className="hs-header">
        <div className="container hs-header__row">
          <button
            type="button"
            className="hs-menu-toggle"
            aria-label="Open menu"
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen(true)}
          >
            <HerbIcon name="filter" size={22} />
          </button>

          <Link href="/herbs" className="hs-brand">
            <img src="/assets/images/resources/logo.png" alt="Spaks Homeopathy" />
            <span className="hs-brand__text">
              <span className="hs-brand__name">Spaks Herbs</span>
              <span className="hs-brand__sub">Herbal Wellness Store</span>
            </span>
          </Link>

          <nav aria-label="Herbs store navigation">
            <ul className="hs-nav">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  {item.href.startsWith('http') ? (
                    <a href={item.href}>{item.label}</a>
                  ) : (
                    <Link
                      href={item.href}
                      aria-current={pathname === item.href ? 'page' : undefined}
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <div className="hs-search" ref={searchRef}>
            <form onSubmit={submitSearch}>
              <span className="hs-search__icon">
                <HerbIcon name="search" size={17} />
              </span>
              <input
                type="search"
                placeholder="Search herbs, e.g. Ashwagandha…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowResults(true);
                }}
                onFocus={() => setShowResults(true)}
                aria-label="Search herbal products"
              />
            </form>
            {showResults && query.trim() && (
              <div className="hs-search__results" role="listbox">
                {results.length === 0 ? (
                  <div className="hs-search__empty">No herbs found for “{query}”.</div>
                ) : (
                  results.map((p) => (
                    <Link
                      key={p.id}
                      href={`/herbs/product/${p.slug}`}
                      className="hs-search__result"
                      onClick={() => setShowResults(false)}
                    >
                      <span className="hs-search__result-art">
                        <HerbArt art={p.image} label={p.name} />
                      </span>
                      <span>
                        <strong style={{ fontSize: 13.5 }}>{p.name}</strong>
                        <br />
                        <span style={{ fontSize: 12, color: 'var(--herb-ink-soft)' }}>
                          {p.categoryLabel}
                        </span>
                      </span>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="hs-header__actions">
            <Link
              href="/herbs/wishlist"
              className="hs-icon-btn"
              aria-label={`Wishlist (${wishlist.length} items)`}
            >
              <HerbIcon name="wishlist" size={20} />
              {wishlist.length > 0 && <span className="hs-icon-btn__badge">{wishlist.length}</span>}
            </Link>
            <Link
              href="/herbs/cart"
              className="hs-icon-btn"
              aria-label={`Cart (${cartCount} items)`}
            >
              <HerbIcon name="cart" size={20} />
              {cartCount > 0 && <span className="hs-icon-btn__badge">{cartCount}</span>}
            </Link>
            <Link href="/herbs/products" className="hs-header__cta">
              Shop Now
            </Link>
          </div>
        </div>
      </header>

      {mobileNavOpen && (
        <>
          <div className="hs-drawer-backdrop" onClick={() => setMobileNavOpen(false)} />
          <div className="hs-drawer" role="dialog" aria-modal="true" aria-label="Site navigation">
            <div className="hs-drawer__head">
              <h3>Menu</h3>
              <button
                type="button"
                className="hs-icon-btn"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close menu"
              >
                <HerbIcon name="close" size={18} />
              </button>
            </div>
            <ul className="hs-footer__links">
              {NAV_ITEMS.map((item) =>
                item.href.startsWith('http') ? (
                  <li key={item.href}>
                    <a href={item.href} style={{ color: 'var(--herb-ink)' }}>
                      {item.label}
                    </a>
                  </li>
                ) : (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      style={{ color: 'var(--herb-ink)' }}
                      onClick={() => setMobileNavOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
