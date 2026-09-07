import Link from 'next/link';
import { ProductImage } from './HomeopathyMedia';
import { RatingLine, PriceTag, getDiscountPercent } from './HomeopathyUI';
import { AddToCartForm } from '@/components/interactive/AddToCartForm';
import type { Product } from '@/lib/mongodb/schemas';

export interface HomeopathyProductCardProps {
  product: Product;
}

/**
 * Product grid card — recreated from the Herbs Store's
 * `HerbProductCard.tsx` (`hm-product-card` markup/classes, badges,
 * hover-revealed actions), over the real `Product` schema. The
 * Add-to-Cart action is the EXISTING `AddToCartForm` component used
 * verbatim (posts to the real `/product-store-cart` route, real session
 * cart) — not a reimplementation.
 */
export function HomeopathyProductCard({ product }: HomeopathyProductCardProps) {
  const outOfStock = (product.pQuantity ?? 0) <= 0;
  const discount = getDiscountPercent(product.pMrp, product.pPrice);
  const name = product.pName || product.pHeading;

  return (
    <div className="hm-product-card">
      <div className="hm-product-card__media">
        <div className="hm-product-card__badges">
          {discount && <span className="hm-badge hm-badge--sale">Sale</span>}
          {outOfStock && <span className="hm-badge hm-badge--out">Out of Stock</span>}
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
          {outOfStock ? (
            <button type="button" className="hm-btn hm-btn--ghost hm-btn--sm hm-btn--full" disabled>
              Out of Stock
            </button>
          ) : (
            <AddToCartForm product={product} />
          )}
        </div>
      </div>
    </div>
  );
}
