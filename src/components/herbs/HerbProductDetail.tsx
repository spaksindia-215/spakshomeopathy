'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { HerbArt } from './HerbArt';
import { HerbIcon } from './HerbIcon';
import { QuantitySelector, RatingLine } from './HerbsUI';
import { useHerbsStore } from './HerbsStoreProvider';
import { HerbProductCard } from './HerbProductCard';
import type { HerbProduct } from '@/lib/herbs/types';
import { getLeadVariant } from '@/lib/herbs/types';
import { getAllHerbProducts, getRelatedHerbProducts } from '@/lib/herbs/queries';

type Tab = 'description' | 'ingredients' | 'how-to-use' | 'reviews';

export interface HerbProductDetailProps {
  product: HerbProduct;
  /** Optional DB-merged catalogue (see `HerbCatalog`'s own `catalog` prop
   * doc for the full rationale) — used for related products and the
   * recently-viewed grid below. Falls back to the static seed catalogue
   * when omitted. */
  catalog?: HerbProduct[];
}

export function HerbProductDetail({ product, catalog }: HerbProductDetailProps) {
  const { addToCart, isWishlisted, toggleWishlist, recordView, recentlyViewed } = useHerbsStore();
  const [variantLabel, setVariantLabel] = useState(getLeadVariant(product)?.label);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(product.image);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('description');
  const [addedMessage, setAddedMessage] = useState(false);

  const variant = product.variants.find((v) => v.label === variantLabel) ?? getLeadVariant(product);
  const wishlisted = isWishlisted(product.id);
  const outOfStock = product.status === 'out-of-stock' || product.stock <= 0;
  const related = getRelatedHerbProducts(product, 4, catalog);

  useEffect(() => {
    recordView(product.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  useEffect(() => {
    if (!addedMessage) return;
    const t = setTimeout(() => setAddedMessage(false), 2500);
    return () => clearTimeout(t);
  }, [addedMessage]);

  function handleAddToCart() {
    if (!variant) return;
    addToCart(product, variant, quantity);
    setAddedMessage(true);
  }

  return (
    <>
      <section className="hs-breadcrumb">
        <div className="container">
          <ol>
            <li>
              <Link href="/herbs">Home</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/herbs/products">Herbs</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={`/herbs/category/${product.form}`}>{product.categoryLabel}</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">{product.name}</li>
          </ol>
        </div>
      </section>

      <section className="hs-section hs-section--tight">
        <div className="container">
          <div className="hs-pdp">
            <div>
              <button
                type="button"
                className="hs-gallery__main"
                onClick={() => setLightboxOpen(true)}
                aria-label="Open image zoom"
              >
                <HerbArt
                  art={activeImage}
                  label={product.name}
                  style={{ width: '100%', height: '100%' }}
                />
              </button>
              {product.gallery.length > 1 && (
                <div className="hs-gallery__thumbs">
                  {product.gallery.map((img) => (
                    <button
                      key={img}
                      type="button"
                      className="hs-gallery__thumb"
                      data-active={img === activeImage}
                      onClick={() => setActiveImage(img)}
                      aria-label={`View ${img} image`}
                    >
                      <HerbArt
                        art={img}
                        label={product.name}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <span className="hs-pdp__category">{product.categoryLabel}</span>
              <h1 className="hs-pdp__title">{product.name}</h1>
              {product.botanicalName && (
                <p className="hs-pdp__botanical">{product.botanicalName}</p>
              )}
              <RatingLine rating={product.rating} reviewCount={product.reviewCount} />

              <div className="hs-pdp__price-row">
                {variant && (
                  <>
                    <span className="hs-pdp__price">₹{variant.price}</span>
                    {variant.compareAtPrice && (
                      <span className="hs-price--compare" style={{ fontSize: 15 }}>
                        ₹{variant.compareAtPrice}
                      </span>
                    )}
                  </>
                )}
                <span className={`hs-stock ${outOfStock ? 'hs-stock--out' : 'hs-stock--in'}`}>
                  <HerbIcon name={outOfStock ? 'close' : 'check'} size={13} />
                  {outOfStock ? 'Out of Stock' : 'In Stock'}
                </span>
              </div>

              <p className="hs-pdp__short">{product.shortDescription}</p>

              {product.variants.length > 1 && (
                <div>
                  <span className="hs-field-label">Size</span>
                  <div className="hs-variant-group">
                    {product.variants.map((v) => (
                      <button
                        key={v.label}
                        type="button"
                        className="hs-variant-pill"
                        data-active={v.label === variant?.label}
                        disabled={v.stock <= 0}
                        onClick={() => setVariantLabel(v.label)}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="hs-pdp__row">
                <div>
                  <span className="hs-field-label">Quantity</span>
                  <QuantitySelector
                    quantity={quantity}
                    onChange={setQuantity}
                    disabled={outOfStock}
                  />
                </div>
              </div>

              <div className="hs-pdp__actions">
                <button
                  type="button"
                  className="hs-btn hs-btn--primary"
                  disabled={outOfStock || !variant}
                  onClick={handleAddToCart}
                >
                  <HerbIcon name="cart" size={16} /> Add to Cart
                </button>
                <Link
                  href="/herbs/checkout"
                  className="hs-btn hs-btn--outline"
                  aria-disabled={outOfStock}
                  onClick={(e) => {
                    if (outOfStock || !variant) {
                      e.preventDefault();
                      return;
                    }
                    addToCart(product, variant, quantity);
                  }}
                >
                  Buy Now
                </Link>
                <button
                  type="button"
                  className="hs-icon-btn"
                  style={{ border: '1.5px solid var(--herb-border)' }}
                  data-active={wishlisted}
                  onClick={() => toggleWishlist(product.id)}
                  aria-pressed={wishlisted}
                  aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                  <HerbIcon name={wishlisted ? 'wishlist-filled' : 'wishlist'} size={19} />
                </button>
              </div>

              {addedMessage && (
                <p style={{ color: 'var(--herb-green-600)', fontSize: 13, fontWeight: 600 }}>
                  <HerbIcon name="check" size={14} /> Added to cart.{' '}
                  <Link href="/herbs/cart" style={{ textDecoration: 'underline' }}>
                    View cart
                  </Link>
                </p>
              )}

              <p className="hs-disclaimer">
                Information here reflects traditional/Ayurvedic use and general wellness information
                — not medical advice. Not intended to diagnose, treat, cure or prevent any disease.
                Consult a qualified practitioner before use.
              </p>
            </div>
          </div>

          <div className="hs-tabs">
            <div className="hs-tabs__nav" role="tablist">
              {(
                [
                  ['description', 'Description'],
                  ['ingredients', 'Ingredients & Botanical Info'],
                  ['how-to-use', 'How to Use & Precautions'],
                  ['reviews', `Reviews (${product.reviewCount})`],
                ] as [Tab, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className="hs-tabs__btn"
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="hs-tabs__panel" role="tabpanel">
              {tab === 'description' && (
                <>
                  <p>{product.description}</p>
                  {product.benefits.length > 0 && (
                    <>
                      <p style={{ fontWeight: 700, color: 'var(--herb-ink)', marginTop: 16 }}>
                        Traditionally used for:
                      </p>
                      <ul>
                        {product.benefits.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              )}
              {tab === 'ingredients' && (
                <>
                  <p style={{ fontWeight: 700, color: 'var(--herb-ink)' }}>Ingredients</p>
                  <ul>
                    {product.ingredients.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                  {product.botanicalName && (
                    <p>
                      <strong>Botanical name:</strong> {product.botanicalName}
                    </p>
                  )}
                </>
              )}
              {tab === 'how-to-use' && (
                <>
                  <p>
                    <strong>How to use:</strong> {product.howToUse}
                  </p>
                  <p>
                    <strong>Precautions:</strong> {product.precautions}
                  </p>
                </>
              )}
              {tab === 'reviews' && (
                <div className="hs-reviews">
                  <p>
                    Average rating {product.rating.toFixed(1)} / 5 from {product.reviewCount}{' '}
                    reviews.
                  </p>
                  <EmptyReviewsNote />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="hs-section hs-section--alt">
          <div className="container">
            <div className="hs-section__head">
              <div>
                <h2 className="hs-section__title">Related Herbs</h2>
                <p className="hs-section__subtitle">
                  Similar products based on form and wellness category
                </p>
              </div>
            </div>
            <div className="hs-product-grid">
              {related.map((p) => (
                <HerbProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {recentlyViewed.length > 1 && (
        <section className="hs-section">
          <div className="container">
            <div className="hs-section__head">
              <div>
                <h2 className="hs-section__title">Recently Viewed</h2>
              </div>
            </div>
            <RecentlyViewedGrid excludeId={product.id} ids={recentlyViewed} catalog={catalog} />
          </div>
        </section>
      )}

      {lightboxOpen && (
        <div
          className="hs-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Zoomed product image"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            className="hs-lightbox__close"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close zoom"
          >
            <HerbIcon name="close" size={18} />
          </button>
          <div className="hs-lightbox__image" onClick={(e) => e.stopPropagation()}>
            <HerbArt
              art={activeImage}
              label={product.name}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </div>
      )}
    </>
  );
}

function EmptyReviewsNote() {
  return (
    <p style={{ color: 'var(--herb-ink-soft)' }}>
      Individual written reviews aren&apos;t available yet in this demo catalogue — the rating above
      reflects seeded demo data and will be replaced by real customer reviews via the admin panel.
    </p>
  );
}

function RecentlyViewedGrid({
  ids,
  excludeId,
  catalog,
}: {
  ids: string[];
  excludeId: string;
  catalog?: HerbProduct[];
}) {
  const all = getAllHerbProducts(catalog);
  const products = ids
    .filter((id) => id !== excludeId)
    .map((id) => all.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .slice(0, 4);

  if (products.length === 0) return null;

  return (
    <div className="hs-product-grid">
      {products.map((p) => (
        <HerbProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
