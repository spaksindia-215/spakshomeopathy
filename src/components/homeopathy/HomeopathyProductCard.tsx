'use client';

import Link from 'next/link';
import { ProductImage } from './HomeopathyMedia';
import { HomeopathyIcon } from './HomeopathyIcon';
import { RatingLine, PriceTag, getDiscountPercent } from './HomeopathyUI';
import { useHomeopathyStore } from './HomeopathyStoreProvider';
import type { Product } from '@/lib/mongodb/schemas';

export interface HomeopathyProductCardProps {
  product: Product;
}

/**
 * Product grid card — recreated from the Herbs Store's
 * `HerbProductCard.tsx` (`hm-product-card` markup/classes, badges,
 * hover-revealed actions), over the real `Product` schema.
 *
 * Add to Cart is now the SAME client-side interaction the Herbs Store
 * uses (`useHomeopathyStore().addToCart`, instant, no page reload) —
 * replacing the earlier `AddToCartForm` (a real GET submit to the legacy
 * `/product-store-cart` route/session cart), per the owner's explicit
 * request that Add to Cart on `/homeopathy/**` match `/herbs/**` exactly.
 * That legacy form/route is untouched and still used by the pre-existing
 * `/products` and `/details` pages — this card just no longer renders it.
 * Wishlist toggle and Quick View are new, genuinely-working interactions
 * mirroring `HerbProductCard`'s, backed by the same client store.
 */
export function HomeopathyProductCard({ product }: HomeopathyProductCardProps) {
  const { isWishlisted, toggleWishlist, openQuickView, addToCart } = useHomeopathyStore();
  const outOfStock = (product.pQuantity ?? 0) <= 0;
  const discount = getDiscountPercent(product.pMrp, product.pPrice);
  const name = product.pName || product.pHeading;
  const wishlisted = isWishlisted(product.legacyId);

  return (
    <div className="hm-product-card">
      <div className="hm-product-card__media">
        <div className="hm-product-card__badges">
          {discount && <span className="hm-badge hm-badge--sale">Sale</span>}
          {outOfStock && <span className="hm-badge hm-badge--out">Out of Stock</span>}
        </div>
        <div className="hm-product-card__actions">
          <button
            type="button"
            className="hm-product-card__icon-btn"
            data-active={wishlisted}
            onClick={() => toggleWishlist(product.legacyId)}
            aria-pressed={wishlisted}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <HomeopathyIcon name={wishlisted ? 'wishlist-filled' : 'wishlist'} size={17} />
          </button>
          <button
            type="button"
            className="hm-product-card__icon-btn"
            onClick={() => openQuickView(product)}
            aria-label={`Quick view ${name ?? 'product'}`}
          >
            <HomeopathyIcon name="eye" size={17} />
          </button>
        </div>
        <Link href={`/homeopathy/product/${product.pSlug}`} aria-label={name ?? 'Product'}>
          <ProductImage
            filename={product.pBestimg}
            alt={name ?? 'Homeopathy product'}
            style={{ width: '100%', height: '100%' }}
          />
        </Link>
      </div>

      <div className="hm-product-card__body">
        <span className="hm-product-card__category">{product.pHeading}</span>
        <h3 className="hm-product-card__title">
          <Link href={`/homeopathy/product/${product.pSlug}`}>{name}</Link>
        </h3>
        <RatingLine rating={product.pRating} />
        <PriceTag price={product.pPrice} mrp={product.pMrp} />
        <div className="hm-product-card__footer">
          <button
            type="button"
            className="hm-btn hm-btn--ghost hm-btn--sm hm-btn--full"
            disabled={outOfStock}
            onClick={() => addToCart(product, 1)}
          >
            <HomeopathyIcon name="cart" size={15} />
            {outOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}
