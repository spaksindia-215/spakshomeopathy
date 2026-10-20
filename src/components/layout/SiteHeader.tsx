'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LanguageSwitcher } from './LanguageSwitcher';
import './site-header.css';

interface NavLinkItem {
  label: string;
  href: string;
}

const NAV_LINKS: NavLinkItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Homeopathy', href: '/homeopathy' },
  { label: 'Cosmetics', href: '/cosmetics' },
  { label: 'Herbs', href: '/herbs' },
];

export interface SiteHeaderProps {
  contactEmail?: string;
  contactPhone?: string;
  cartCountOverride?: number;
}

export function SiteHeader({
  contactEmail = 'spakshomeopathy@gmail.com',
  contactPhone = '+91 8700458818',
  cartCountOverride,
}: SiteHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cartCount, setCartCount] = useState<number>(cartCountOverride ?? 0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Sync cart count from localStorage if override is not provided
  useEffect(() => {
    if (cartCountOverride !== undefined) {
      setCartCount(cartCountOverride);
      return;
    }

    const updateCount = () => {
      try {
        let total = 0;
        // Check homeopathy cart
        const hmCartStr = localStorage.getItem('spaks_homeopathy_cart');
        if (hmCartStr) {
          const hmCart = JSON.parse(hmCartStr);
          if (Array.isArray(hmCart)) {
            total += hmCart.reduce((sum: number, item: { quantity?: number }) => sum + (item.quantity || 1), 0);
          }
        }
        // Check herbs cart
        const herbCartStr = localStorage.getItem('spaks-herbs-cart');
        if (herbCartStr) {
          const herbCart = JSON.parse(herbCartStr);
          if (Array.isArray(herbCart)) {
            total += herbCart.reduce((sum: number, item: { quantity?: number }) => sum + (item.quantity || 1), 0);
          }
        }
        setCartCount(total);
      } catch {
        // Fallback silently
      }
    };

    updateCount();
    window.addEventListener('storage', updateCount);
    return () => window.removeEventListener('storage', updateCount);
  }, [cartCountOverride, pathname]);

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // Close search popover on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    if (searchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [searchOpen]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileNavOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setSearchOpen(false);
    if (pathname.startsWith('/herbs')) {
      router.push(`/herbs/search?q=${encodeURIComponent(q)}`);
    } else {
      router.push(`/homeopathy/products?q=${encodeURIComponent(q)}`);
    }
  };

  const isLinkActive = (href: string) => {
    if (href === '/') {
      return pathname === '/' || pathname === '/home';
    }
    return pathname.startsWith(href);
  };

  const getCartLink = () => {
    if (pathname.startsWith('/herbs')) return '/herbs/cart';
    if (pathname.startsWith('/homeopathy')) return '/homeopathy/cart';
    return '/cart-list';
  };

  return (
    <div className="sp-site-header-wrapper">
      {/* Utility Bar */}
      <div className="sp-utility">
        <div className="sp-utility-container">
          <div className="sp-utility-group">
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
            <span className="sp-utility-sep">|</span>
            <a href={`tel:${contactPhone.replace(/\s+/g, '')}`}>{contactPhone}</a>
          </div>
          <div className="sp-utility-group">
            <a
              href="/catalogue-list.pdf"
              target="_blank"
              rel="noopener noreferrer"
            >
              Diseases Catalogue (PDF)
            </a>
            <span className="sp-utility-sep">|</span>
            <Link href="/consultancy" style={{ color: '#f6fbff', fontWeight: 600 }}>
              Dr. Consultancy
            </Link>
          </div>
        </div>
      </div>

      {/* Main Sticky Header */}
      <header className="sp-header">
        <div className="sp-header-container">
          {/* Logo */}
          <Link href="/" className="sp-logo" aria-label="Spaks Homeopathy Home">
            <img src="/assets/images/resources/logo.png" alt="Spaks Homeopathy" />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="sp-nav" aria-label="Main navigation">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={isLinkActive(link.href) ? 'active' : ''}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Header Actions */}
          <div className="sp-header-actions">
            {/* Search Button & Popover */}
            <div ref={searchContainerRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="sp-icon-btn"
                aria-label="Search products"
                onClick={() => setSearchOpen(!searchOpen)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>

              {searchOpen && (
                <div className="sp-search-popover">
                  <form onSubmit={handleSearchSubmit}>
                    <input
                      ref={searchInputRef}
                      type="search"
                      placeholder="Search remedies, herbs, cosmetics..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button type="submit">Search</button>
                  </form>
                </div>
              )}
            </div>

            {/* Cart Button */}
            <Link
              href={getCartLink()}
              className="sp-icon-btn"
              aria-label={`Cart with ${cartCount} items`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              <span className="sp-cart-badge">{cartCount}</span>
            </Link>

            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Explore Products Button */}
            <Link href="/homeopathy/products" className="sp-btn-explore">
              Explore Products
            </Link>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              className="sp-mobile-toggle"
              aria-label="Open mobile menu"
              onClick={() => setMobileNavOpen(true)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <>
          <div
            className="sp-mobile-drawer-backdrop"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="sp-mobile-drawer" role="dialog" aria-modal="true" aria-label="Mobile navigation">
            <div className="sp-mobile-drawer-head">
              <Link href="/" onClick={() => setMobileNavOpen(false)}>
                <img
                  src="/assets/images/resources/logo.png"
                  alt="Spaks Homeopathy"
                  style={{ height: 36, width: 'auto' }}
                />
              </Link>
              <button
                type="button"
                className="sp-mobile-drawer-close"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close menu"
              >
                &times;
              </button>
            </div>

            <ul className="sp-mobile-nav-links">
              {NAV_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className={isLinkActive(link.href) ? 'active' : ''}
                    onClick={() => setMobileNavOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li style={{ paddingTop: 12, borderTop: '1px solid #eee' }}>
                <Link
                  href="/consultancy"
                  onClick={() => setMobileNavOpen(false)}
                  style={{ color: 'var(--sp-forest)' }}
                >
                  Dr. Consultancy
                </Link>
              </li>
              <li>
                <a
                  href="/catalogue-list.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileNavOpen(false)}
                >
                  Diseases Catalogue (PDF)
                </a>
              </li>
              <li style={{ marginTop: 12 }}>
                <Link
                  href="/homeopathy/products"
                  className="sp-btn-explore"
                  style={{ display: 'inline-flex', width: '100%', justifyContent: 'center' }}
                  onClick={() => setMobileNavOpen(false)}
                >
                  Explore Products
                </Link>
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
