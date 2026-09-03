'use client';

import Link from 'next/link';
import { HerbArt } from './HerbArt';
import { HerbIcon } from './HerbIcon';
import { PriceTag, RatingLine } from './HerbsUI';
import { useHerbsStore } from './HerbsStoreProvider';
import type { HerbProduct } from '@/lib/herbs/types';
import { getLeadVariant } from '@/lib/herbs/types';

export interface HerbProductCardProps {
  product: HerbProduct;
}

/**
 * Premium product grid card (§7 of the original brief). Genuinely working
 * interactions: wishlist toggle and quick view both operate on real
 * client state (`useHerbsStore`), not decorative buttons.
 */
export function HerbProductCard({ product }: HerbProductCardProps) {
  const { isWishlisted, toggleWishlist, openQuickView, addToCart } = useHerbsStore();
  const lead = getLeadVariant(product);
  const wishlisted = isWishlisted(product.id);
  const outOfStock = product.status === 'out-of-stock' || product.stock <= 0;

  return (
    <div className="hs-product-card">
      <div className="hs-product-card__media">
        <div className="hs-product-card__badges">
          {lead?.compareAtPrice && <span className="hs-badge hs-badge--sale">Sale</span>}
          {product.newArrival && <span className="hs-badge hs-badge--new">New</span>}
          {product.bestseller && <span className="hs-badge hs-badge--bestseller">Bestseller</span>}
          {outOfStock && <span className="hs-badge hs-badge--out">Out of Stock</span>}
        </div>
        <div className="hs-product-card__actions">
          <button
            type="button"
            className="hs-product-card__icon-btn"
            data-active={wishlisted}
            onClick={() => toggleWishlist(product.id)}
            aria-pressed={wishlisted}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <HerbIcon name={wishlisted ? 'wishlist-filled' : 'wishlist'} size={17} />
          </button>
          <button
            type="button"
            className="hs-product-card__icon-btn"
            onClick={() => openQuickView(product)}
            aria-label={`Quick view ${product.name}`}
          >
            <HerbIcon name="eye" size={17} />
          </button>
        </div>
        <Link href={`/herbs/product/${product.slug}`} aria-label={product.name}>
          <HerbArt
            art={product.image}
            label={product.name}
            style={{ width: '100%', height: '100%' }}
          />
        </Link>
      </div>

      <div className="hs-product-card__body">
        <span className="hs-product-card__category">{product.categoryLabel}</span>
        <h3 className="hs-product-card__title">
          <Link href={`/herbs/product/${product.slug}`}>{product.name}</Link>
        </h3>
        <RatingLine rating={product.rating} reviewCount={product.reviewCount} />
        {lead && <PriceTag price={lead.price} compareAtPrice={lead.compareAtPrice} />}
        <div className="hs-product-card__footer">
          <button
            type="button"
            className="hs-btn hs-btn--ghost hs-btn--sm hs-btn--full"
            disabled={outOfStock || !lead}
            onClick={() => lead && addToCart(product, lead, 1)}
          >
            <HerbIcon name="cart" size={15} />
            {outOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}
