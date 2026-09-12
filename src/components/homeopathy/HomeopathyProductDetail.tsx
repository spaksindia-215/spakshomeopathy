'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ProductImage } from './HomeopathyMedia';
import { HomeopathyIcon } from './HomeopathyIcon';
import { RatingLine, QuantitySelector } from './HomeopathyUI';
import { HomeopathyProductCard } from './HomeopathyProductCard';
import { useHomeopathyStore } from './HomeopathyStoreProvider';
import type { Product } from '@/lib/mongodb/schemas';
import { getShortDescription } from '@/lib/homeopathy/queries';

export interface HomeopathyProductDetailProps {
  product: Product;
  /** Real related products (same `pCat`), resolved server-side via
   * `getRelatedHomeopathyProducts()`. */
  related: Product[];
}

/**
 * Product detail page body — recreated from the Herbs Store's
 * `HerbProductDetail.tsx` layout (gallery, price row, tabs, related
 * grid), over the real `Product` schema. Gallery images come from
 * `pBestimg` plus any populated `slot{N}.pImage` variant images — the
 * real `images[]` array on this dataset always has exactly one entry
 * (mirroring `pBestimg`), so the additional gallery thumbnails are drawn
 * from the variant slots' own image fields, which the schema comment
 * documents as real per-slot photography, not invented.
 *
 * Add to Cart is the same client-side `useHomeopathyStore()` interaction
 * as everywhere else in the Homeopathy Store (instant, no page reload),
 * with a quantity selector — matching the Herbs Store's PDP — instead of
 * the old server-rendered `AddToCartForm` (hardcoded quantity of 1).
 */
export function HomeopathyProductDetail({ product, related }: HomeopathyProductDetailProps) {
  const galleryImages = Array.from(
    new Set(
      [
        product.pBestimg,
        product.slot2.pImage,
        product.slot3.pImage,
        product.slot4.pImage,
        product.slot5.pImage,
      ].filter((img): img is string => Boolean(img))
    )
  );
  const [activeImage, setActiveImage] = useState(galleryImages[0] ?? product.pBestimg ?? null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [tab, setTab] = useState<'description' | 'dosage' | 'specifications'>('description');
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useHomeopathyStore();

  const outOfStock = (product.pQuantity ?? 0) <= 0;
  const name = product.pName || product.pHeading;
  const shortDescription = getShortDescription(product, 220);

  return (
    <>
      <section className="hm-breadcrumb">
        <div className="container">
          <ol>
            <li>
              <Link href="/homeopathy">Home</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/homeopathy/products">Medicines</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">{name}</li>
          </ol>
        </div>
      </section>

      <section className="hm-section hm-section--tight">
        <div className="container">
          <div className="hm-pdp">
            <div>
              <button
                type="button"
                className="hm-gallery__main"
                onClick={() => setLightboxOpen(true)}
                aria-label="Open image zoom"
              >
                <ProductImage
                  filename={activeImage}
                  alt={name ?? 'Product'}
                  style={{ width: '100%', height: '100%' }}
                />
              </button>
              {galleryImages.length > 1 && (
                <div className="hm-gallery__thumbs">
                  {galleryImages.map((img) => (
                    <button
                      key={img}
                      type="button"
                      className="hm-gallery__thumb"
                      data-active={img === activeImage}
                      onClick={() => setActiveImage(img)}
                      aria-label="View product image"
                    >
                      <ProductImage
                        filename={img}
                        alt={name ?? 'Product'}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <span className="hm-pdp__category">{product.pHeading}</span>
              <h1 className="hm-pdp__title">{name}</h1>
              <RatingLine rating={product.pRating} />

              <div className="hm-pdp__price-row">
                <span className="hm-pdp__price">₹{product.pPrice ?? 0}</span>
                {product.pMrp && product.pMrp > (product.pPrice ?? 0) && (
                  <span className="hm-price--compare" style={{ fontSize: 15 }}>
                    ₹{product.pMrp}
                  </span>
                )}
                <span className={`hm-stock ${outOfStock ? 'hm-stock--out' : 'hm-stock--in'}`}>
                  <HomeopathyIcon name={outOfStock ? 'close' : 'check'} size={13} />
                  {outOfStock ? 'Out of Stock' : 'In Stock'}
                </span>
              </div>

              <p className="hm-pdp__short">{shortDescription}</p>

              {!outOfStock && (
                <div className="hm-pdp__row">
                  <QuantitySelector quantity={quantity} onChange={setQuantity} />
                </div>
              )}

              <div className="hm-pdp__actions">
                {outOfStock ? (
                  <button type="button" className="hm-btn hm-btn--primary" disabled>
                    <HomeopathyIcon name="cart" size={16} /> Out of Stock
                  </button>
                ) : (
                  <button
                    type="button"
                    className="hm-btn hm-btn--primary"
                    onClick={() => addToCart(product, quantity)}
                  >
                    <HomeopathyIcon name="cart" size={16} /> Add To Cart
                  </button>
                )}
                <Link href="/homeopathy/cart" className="hm-btn hm-btn--outline">
                  View Cart
                </Link>
              </div>

              <p className="hm-disclaimer">
                Information here is provided for general informational purposes only — not medical
                advice. Not intended to diagnose, treat, cure or prevent any disease. Consult a
                qualified practitioner before use.
              </p>
            </div>
          </div>

          <div className="hm-tabs">
            <div className="hm-tabs__nav" role="tablist">
              {(
                [
                  ['description', 'Description'],
                  ['dosage', 'Dosage & How to Use'],
                  ['specifications', 'Specifications'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className="hm-tabs__btn"
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="hm-tabs__panel" role="tabpanel">
              {tab === 'description' &&
                (product.pDesc ? (
                  <div dangerouslySetInnerHTML={{ __html: product.pDesc }} />
                ) : (
                  <p>{shortDescription}</p>
                ))}
              {tab === 'dosage' && (
                <p style={{ whiteSpace: 'pre-line' }}>
                  {product.pDesc1 || 'Dosage information is not available for this product.'}
                </p>
              )}
              {tab === 'specifications' && (
                <>
                  {product.specifications.length > 0 ? (
                    <ul>
                      {product.specifications.map((s, i) => (
                        <li key={i}>
                          {s.pHeading && <strong>{s.pHeading}: </strong>}
                          {s.pSpecification}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No additional specifications listed for this product.</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="hm-section hm-section--alt">
          <div className="container">
            <div className="hm-section__head">
              <div>
                <h2 className="hm-section__title">Related Medicines</h2>
                <p className="hm-section__subtitle">More from the same category</p>
              </div>
            </div>
            <div className="hm-product-grid">
              {related.map((p) => (
                <HomeopathyProductCard key={p.legacyId} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {lightboxOpen && (
        <div
          className="hm-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Zoomed product image"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            className="hm-lightbox__close"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close zoom"
          >
            <HomeopathyIcon name="close" size={18} />
          </button>
          <div className="hm-lightbox__image" onClick={(e) => e.stopPropagation()}>
            <ProductImage
              filename={activeImage}
              alt={name ?? 'Product'}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </div>
      )}
    </>
  );
}
