'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ProductImage } from './HomeopathyMedia';
import { HomeopathyIcon } from './HomeopathyIcon';
import { PriceTag, QuantitySelector, RatingLine } from './HomeopathyUI';
import { useHomeopathyStore } from './HomeopathyStoreProvider';
import { getShortDescription } from '@/lib/homeopathy/queries';

/**
 * Quick View modal for the Homeopathy Store — recreated from the Herbs
 * Store's `QuickViewModal.tsx` (same behavior: Escape closes, focus moves
 * to the close button on open, backdrop is a real click target). No
 * variant/size picker here (unlike Herbs) — the real `Product` schema has
 * one price per product, not per-variant pricing.
 */
export function QuickViewModal() {
  const { quickView, closeQuickView, addToCart } = useHomeopathyStore();
  const product = quickView.product;
  const [quantity, setQuantity] = useState(1);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (product) {
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

  const outOfStock = (product.pQuantity ?? 0) <= 0;
  const name = product.pName || product.pHeading;
  const shortDescription = getShortDescription(product, 160);

  return (
    <div className="homeopathy-scope">
      <div className="hm-modal-backdrop" onClick={closeQuickView} role="presentation">
        <div
          className="hm-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-view-title"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            ref={closeBtnRef}
            type="button"
            className="hm-modal__close"
            onClick={closeQuickView}
            aria-label="Close quick view"
          >
            <HomeopathyIcon name="close" size={16} />
          </button>
          <div className="hm-modal__grid">
            <div className="hm-modal__media">
              <ProductImage
                filename={product.pBestimg}
                alt={name ?? 'Product'}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
            <div className="hm-modal__body">
              <span className="hm-pdp__category">{product.pHeading}</span>
              <h2 id="quick-view-title" className="hm-pdp__title" style={{ fontSize: 22 }}>
                {name}
              </h2>
              <RatingLine rating={product.pRating} />
              <div style={{ margin: '14px 0' }}>
                <PriceTag price={product.pPrice} mrp={product.pMrp} />
              </div>
              <p className="hm-pdp__short">{shortDescription}</p>

              <div className="hm-pdp__row">
                <QuantitySelector quantity={quantity} onChange={setQuantity} disabled={outOfStock} />
              </div>

              <div className="hm-pdp__actions">
                <button
                  type="button"
                  className="hm-btn hm-btn--primary"
                  disabled={outOfStock}
                  onClick={() => addToCart(product, quantity)}
                >
                  <HomeopathyIcon name="cart" size={16} />
                  {outOfStock ? 'Out of Stock' : 'Add to Cart'}
                </button>
                <Link
                  href={`/homeopathy/product/${product.pSlug}`}
                  className="hm-btn hm-btn--outline"
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
