'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { HomeopathyIcon } from '@/components/homeopathy/HomeopathyIcon';
import { HomeopathyProductCard } from '@/components/homeopathy/HomeopathyProductCard';
import type { CosmeticProduct } from '@/lib/cosmetics/catalog';
import './cosmetics.css';

export interface CosmeticsStoreViewProps {
  products: CosmeticProduct[];
}

type CosmeticTypeFilter = 'all' | 'homeopathic' | 'allopathic' | 'ayurvedic';

export function CosmeticsStoreView({ products }: CosmeticsStoreViewProps) {
  const [selectedType, setSelectedType] = useState<CosmeticTypeFilter>('all');

  // Count items per division
  const counts = useMemo(() => {
    return {
      all: products.length,
      homeopathic: products.filter((p) => p.cosmeticType === 'homeopathic').length,
      allopathic: products.filter((p) => p.cosmeticType === 'allopathic').length,
      ayurvedic: products.filter((p) => p.cosmeticType === 'ayurvedic').length,
    };
  }, [products]);

  // Filter products by selected division
  const filteredProducts = useMemo(() => {
    if (selectedType === 'all') return products;
    return products.filter((p) => p.cosmeticType === selectedType);
  }, [products, selectedType]);

  const handleSelectType = (type: CosmeticTypeFilter) => {
    setSelectedType(type);
    const target = document.getElementById('cosmetics-catalog');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* Breadcrumb */}
      <section className="hm-breadcrumb">
        <div className="container">
          <ol>
            <li>
              <Link href="/">Home</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">Cosmetics</li>
          </ol>
        </div>
      </section>

      {/* Hero Banner */}
      <section className="hm-hero" style={{ padding: '36px 0 44px' }}>
        <div className="container hm-hero__grid">
          <div>
            <span className="hm-hero__eyebrow">
              <HomeopathyIcon name="sparkle" size={14} /> Spaks Cosmetics
            </span>
            <h1 className="hm-hero__title">
              Holistic, Clinical &amp; Herbal <em>Cosmetic Care</em>
            </h1>
            <p className="hm-hero__text">
              Gentle personal care solutions crafted across three verified traditions — 
              <strong> Homeopathic</strong> natural formulations, <strong>Allopathic</strong> active dermatology, 
              and <strong>Ayurvedic</strong> herbal heritage.
            </p>
            <div className="hm-hero__actions">
              <a href="#divisions" className="hm-btn hm-btn--primary">
                Explore 3 Divisions
              </a>
              <a href="#cosmetics-catalog" className="hm-btn hm-btn--outline">
                View All Products ({counts.all})
              </a>
            </div>
          </div>
          <div className="hm-hero__art" style={{ maxHeight: 280 }}>
            <HomeopathyIcon
              name="sparkle"
              size={120}
              style={{
                width: '100%',
                height: '100%',
                padding: 30,
                color: 'var(--hm-green-600)',
                background: 'linear-gradient(135deg, var(--hm-green-50) 0%, var(--hm-sand) 100%)',
              }}
            />
            <div className="hm-hero__stat">
              <strong>3</strong>
              <span>Care Divisions</span>
            </div>
          </div>
        </div>
      </section>

      {/* Three Divisions Section */}
      <section className="hm-section" id="divisions" style={{ paddingTop: 20 }}>
        <div className="container">
          <div className="hm-section__head">
            <div>
              <h2 className="hm-section__title">Three Divisions, One Standard of Care</h2>
              <p className="hm-section__subtitle">
                Everything under Spaks Cosmetics falls into one of three lines
              </p>
            </div>
          </div>

          <div
            className="cosmetics-division-grid hm-division-grid hm-division-grid--3"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px',
              marginTop: '16px',
            }}
          >
            {/* Division 01: Homeopathic */}
            <div
              role="button"
              tabIndex={0}
              className="cosmetics-card cosmetics-card-homeopathic hm-division-card hm-division-card--homeopathic"
              style={{
                background: 'linear-gradient(135deg, #0f4469 0%, #163a56 100%)',
                color: '#ffffff',
                borderRadius: '16px',
                padding: '30px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                minHeight: '240px',
                cursor: 'pointer',
                boxShadow:
                  selectedType === 'homeopathic'
                    ? '0 0 0 3.5px #00bf79, 0 16px 36px -8px rgba(15, 68, 105, 0.55)'
                    : '0 10px 24px -6px rgba(15, 68, 105, 0.45)',
                transform: selectedType === 'homeopathic' ? 'translateY(-3px)' : 'none',
                transition: 'all 0.2s ease',
              }}
              onClick={() => handleSelectType('homeopathic')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSelectType('homeopathic');
              }}
            >
              <div
                className="cosmetics-card-icon hm-division-card__icon"
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '999px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                }}
              >
                <HomeopathyIcon name="sparkle" size={24} />
              </div>
              <span
                className="cosmetics-card-eyebrow hm-division-card__eyebrow"
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'rgba(255, 255, 255, 0.8)',
                }}
              >
                Division 01
              </span>
              <h3
                className="cosmetics-card-title hm-division-card__title"
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  margin: 0,
                  color: '#ffffff',
                }}
              >
                Homeopathic
              </h3>
              <p
                className="cosmetics-card-desc hm-division-card__desc"
                style={{
                  fontSize: '13.5px',
                  lineHeight: 1.55,
                  color: 'rgba(255, 255, 255, 0.92)',
                  margin: 0,
                  flexGrow: 1,
                }}
              >
                Gentle, natural formulas for skin and hair. Non-comedogenic, safe remedies working in harmony with your body.
              </p>
              <span
                className="cosmetics-card-link hm-division-card__link"
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#ffffff',
                  marginTop: 'auto',
                }}
              >
                Browse Homeopathic ({counts.homeopathic}) →
              </span>
            </div>

            {/* Division 02: Allopathic */}
            <div
              role="button"
              tabIndex={0}
              className="cosmetics-card cosmetics-card-allopathic hm-division-card hm-division-card--allopathic"
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                borderRadius: '16px',
                padding: '30px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                minHeight: '240px',
                cursor: 'pointer',
                boxShadow:
                  selectedType === 'allopathic'
                    ? '0 0 0 3.5px #00bf79, 0 16px 36px -8px rgba(2, 132, 199, 0.55)'
                    : '0 10px 24px -6px rgba(2, 132, 199, 0.45)',
                transform: selectedType === 'allopathic' ? 'translateY(-3px)' : 'none',
                transition: 'all 0.2s ease',
              }}
              onClick={() => handleSelectType('allopathic')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSelectType('allopathic');
              }}
            >
              <div
                className="cosmetics-card-icon hm-division-card__icon"
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '999px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                }}
              >
                <HomeopathyIcon name="shield" size={24} />
              </div>
              <span
                className="cosmetics-card-eyebrow hm-division-card__eyebrow"
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'rgba(255, 255, 255, 0.8)',
                }}
              >
                Division 02
              </span>
              <h3
                className="cosmetics-card-title hm-division-card__title"
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  margin: 0,
                  color: '#ffffff',
                }}
              >
                Allopathic
              </h3>
              <p
                className="cosmetics-card-desc hm-division-card__desc"
                style={{
                  fontSize: '13.5px',
                  lineHeight: 1.55,
                  color: 'rgba(255, 255, 255, 0.92)',
                  margin: 0,
                  flexGrow: 1,
                }}
              >
                Scientifically formulated active dermatological care. Targeted clinical treatments for acne, sun protection, and barrier repair.
              </p>
              <span
                className="cosmetics-card-link hm-division-card__link"
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#ffffff',
                  marginTop: 'auto',
                }}
              >
                Browse Allopathic ({counts.allopathic}) →
              </span>
            </div>

            {/* Division 03: Ayurvedic */}
            <div
              role="button"
              tabIndex={0}
              className="cosmetics-card cosmetics-card-ayurvedic hm-division-card hm-division-card--ayurvedic"
              style={{
                background: 'linear-gradient(135deg, #0a6a4b 0%, #00bf79 100%)',
                color: '#ffffff',
                borderRadius: '16px',
                padding: '30px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                minHeight: '240px',
                cursor: 'pointer',
                boxShadow:
                  selectedType === 'ayurvedic'
                    ? '0 0 0 3.5px #00bf79, 0 16px 36px -8px rgba(10, 106, 75, 0.55)'
                    : '0 10px 24px -6px rgba(10, 106, 75, 0.45)',
                transform: selectedType === 'ayurvedic' ? 'translateY(-3px)' : 'none',
                transition: 'all 0.2s ease',
              }}
              onClick={() => handleSelectType('ayurvedic')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSelectType('ayurvedic');
              }}
            >
              <div
                className="cosmetics-card-icon hm-division-card__icon"
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '999px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                }}
              >
                <HomeopathyIcon name="droplet" size={24} />
              </div>
              <span
                className="cosmetics-card-eyebrow hm-division-card__eyebrow"
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'rgba(255, 255, 255, 0.8)',
                }}
              >
                Division 03
              </span>
              <h3
                className="cosmetics-card-title hm-division-card__title"
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  margin: 0,
                  color: '#ffffff',
                }}
              >
                Ayurvedic
              </h3>
              <p
                className="cosmetics-card-desc hm-division-card__desc"
                style={{
                  fontSize: '13.5px',
                  lineHeight: 1.55,
                  color: 'rgba(255, 255, 255, 0.92)',
                  margin: 0,
                  flexGrow: 1,
                }}
              >
                Ancient herbal recipes, pure cold-pressed botanicals, and saffron elixirs for holistic glow and time-tested nourishment.
              </p>
              <span
                className="cosmetics-card-link hm-division-card__link"
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#ffffff',
                  marginTop: 'auto',
                }}
              >
                Browse Ayurvedic ({counts.ayurvedic}) →
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Cosmetics Catalog Section with Interactive Division Filter Tabs */}
      <section className="hm-section" id="cosmetics-catalog">
        <div className="container">
          <div className="hm-section__head" style={{ marginBottom: 24 }}>
            <div>
              <h2 className="hm-section__title">
                {selectedType === 'all'
                  ? 'All Cosmetics Products'
                  : selectedType === 'homeopathic'
                    ? '1. Homeopathic Cosmetics'
                    : selectedType === 'allopathic'
                      ? '2. Allopathic Cosmetics'
                      : '3. Ayurvedic Cosmetics'}
              </h2>
              <p className="hm-section__subtitle">
                Showing {filteredProducts.length} items{' '}
                {selectedType !== 'all' && `in ${selectedType} collection`}
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div
            style={{
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap',
              marginBottom: 32,
              paddingBottom: 16,
              borderBottom: '1px solid #eef2f6',
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedType('all')}
              style={{
                padding: '9px 18px',
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 600,
                border: '1.5px solid',
                borderColor: selectedType === 'all' ? 'var(--hm-green-600)' : '#e2e8f0',
                background: selectedType === 'all' ? 'var(--hm-green-600)' : '#fff',
                color: selectedType === 'all' ? '#fff' : 'var(--hm-ink)',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
              }}
            >
              All Types ({counts.all})
            </button>

            <button
              type="button"
              onClick={() => setSelectedType('homeopathic')}
              style={{
                padding: '9px 18px',
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 600,
                border: '1.5px solid',
                borderColor: selectedType === 'homeopathic' ? '#0f4469' : '#e2e8f0',
                background: selectedType === 'homeopathic' ? '#0f4469' : '#fff',
                color: selectedType === 'homeopathic' ? '#fff' : 'var(--hm-ink)',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
              }}
            >
              1. Homeopathic ({counts.homeopathic})
            </button>

            <button
              type="button"
              onClick={() => setSelectedType('allopathic')}
              style={{
                padding: '9px 18px',
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 600,
                border: '1.5px solid',
                borderColor: selectedType === 'allopathic' ? '#0284c7' : '#e2e8f0',
                background: selectedType === 'allopathic' ? '#0284c7' : '#fff',
                color: selectedType === 'allopathic' ? '#fff' : 'var(--hm-ink)',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
              }}
            >
              2. Allopathic ({counts.allopathic})
            </button>

            <button
              type="button"
              onClick={() => setSelectedType('ayurvedic')}
              style={{
                padding: '9px 18px',
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 600,
                border: '1.5px solid',
                borderColor: selectedType === 'ayurvedic' ? '#0a6a4b' : '#e2e8f0',
                background: selectedType === 'ayurvedic' ? '#0a6a4b' : '#fff',
                color: selectedType === 'ayurvedic' ? '#fff' : 'var(--hm-ink)',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
              }}
            >
              3. Ayurvedic ({counts.ayurvedic})
            </button>
          </div>

          {/* Product Grid */}
          {filteredProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--hm-ink-soft)' }}>
              <p>No products found in this category.</p>
              <button
                type="button"
                className="hm-btn hm-btn--outline hm-btn--sm"
                onClick={() => setSelectedType('all')}
              >
                View All Products
              </button>
            </div>
          ) : (
            <div className="hm-product-grid">
              {filteredProducts.map((p) => (
                <HomeopathyProductCard key={p.legacyId} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
