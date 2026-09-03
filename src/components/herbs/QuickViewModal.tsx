'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { HerbArt } from './HerbArt';
import { HerbIcon } from './HerbIcon';
import { PriceTag, QuantitySelector, RatingLine } from './HerbsUI';
import { useHerbsStore } from './HerbsStoreProvider';
import { getLeadVariant } from '@/lib/herbs/types';

/**
 * Quick View modal (§16 of the original brief). Keyboard accessible:
 * Escape closes, focus is trapped to the close button on open, and the
 * backdrop is a real click target — not just a decorative overlay.
 */
export function QuickViewModal() {
  const { quickView, closeQuickView, addToCart } = useHerbsStore();
  const product = quickView.product;
  const [variantLabel, setVariantLabel] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState(1);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (product) {
      setVariantLabel(getLeadVariant(product)?.label);
      setQuantity(1);
      closeBtnRef.current?.focus();
    }
  }, [product]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeQuickView();
    }
    if (product) {
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
  }, [product, closeQuickView]);

  if (!product) return null;

  const variant = product.variants.find((v) => v.label === variantLabel) ?? getLeadVariant(product);

  return (
    <div className="herbs-scope">
      <div className="hs-modal-backdrop" onClick={closeQuickView} role="presentation">
        <div
          className="hs-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-view-title"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            ref={closeBtnRef}
            type="button"
            className="hs-modal__close"
            onClick={closeQuickView}
            aria-label="Close quick view"
          >
            <HerbIcon name="close" size={16} />
          </button>
          <div className="hs-modal__grid">
            <div className="hs-modal__media">
              <HerbArt
                art={product.image}
                label={product.name}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
            <div className="hs-modal__body">
              <span className="hs-pdp__category">{product.categoryLabel}</span>
              <h2 id="quick-view-title" className="hs-pdp__title" style={{ fontSize: 22 }}>
                {product.name}
              </h2>
              <RatingLine rating={product.rating} reviewCount={product.reviewCount} />
              {variant && (
                <div style={{ margin: '14px 0' }}>
                  <PriceTag price={variant.price} compareAtPrice={variant.compareAtPrice} />
                </div>
              )}
              <p className="hs-pdp__short">{product.shortDescription}</p>

              {product.variants.length > 1 && (
                <div style={{ marginBottom: 18 }}>
                  <span className="hs-field-label">Size</span>
                  <div className="hs-variant-group">
                    {product.variants.map((v) => (
                      <button
                        key={v.label}
                        type="button"
                        className="hs-variant-pill"
                        data-active={v.label === variant?.label}
                        onClick={() => setVariantLabel(v.label)}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="hs-pdp__row">
                <QuantitySelector quantity={quantity} onChange={setQuantity} />
              </div>

              <div className="hs-pdp__actions">
                <button
                  type="button"
                  className="hs-btn hs-btn--primary"
                  disabled={!variant}
                  onClick={() => variant && addToCart(product, variant, quantity)}
                >
                  <HerbIcon name="cart" size={16} /> Add to Cart
                </button>
                <Link
                  href={`/herbs/product/${product.slug}`}
                  className="hs-btn hs-btn--outline"
                  onClick={closeQuickView}
                >
                  View Full Product
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
