/**
 * Mainline-theme product grid card — the repeated `.shop-one__single`
 * block. Transliterated verbatim from `products.blade.php:49-67`
 * (identical structure also confirmed in the homepage's live disease
 * carousel, `index.blade.php:757-772`, which reuses this exact class
 * structure for category data — see `CategoryCard`'s own header for why
 * that one is a THIN wrapper around this component rather than a
 * duplicate).
 *
 * NOT used by the alt-theme/zeintext page family (`main-category-products`,
 * `all-products`, `top-poducts`, `categories`) — those pages use a
 * DIFFERENT card markup (`.product-item`/`.product-thumb`/
 * `.product-caption`, confirmed by direct diff against
 * `top-products.blade.php:167-235`), with different fields (`p_image` not
 * `p_bestimg`, a discount-percent calculation, name truncated to 32
 * chars, a shipping-date calculation) and even a different (likely
 * broken — links to `/detail/{slug}`, not `/product-details/{slug}`)
 * href target. That family gets its own card component when those pages
 * are built — this file does not attempt to unify the two, since doing so
 * would either lose the alt-theme's real quirks or invent a "shared"
 * shape neither source page actually has.
 *
 * PRESERVED DEFECT: source splits the product name on the literal string
 * "For" (`explode('For', $row->p_name)`) and renders the first half plus
 * a styled ` For {second half}` span — this is clearly intended for names
 * like "Arnica Gel For Muscle Pain" but will silently misbehave (or
 * render only the first segment with an empty red span) for any product
 * name that doesn't contain the word "For". Reproduced exactly, not
 * "fixed" — a name without "For" renders with a trailing empty
 * `.product-kitred` span. Do not add a conditional to hide it.
 */

import type { Product } from '@/lib/mongodb/schemas';

export interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const name = product.pName ?? '';
  const parts = name.split('For');
  const firstPart = parts[0] ?? '';
  const secondPart = parts.length > 1 ? parts.slice(1).join('For') : '';

  return (
    <a href={`/product-details/${product.pSlug ?? ''}`}>
      <div className="shop-one__single">
        <div className="shop-one__image">
          <img src={`/uploaded_files/products/${product.pBestimg ?? ''}`} alt={name} />
        </div>
        <div className="shop-one__content">
          <h3 className="shop-one__title">
            <a href={`/product-details/${product.pSlug ?? ''}`}>
              {firstPart}
              {parts.length > 1 && <span className="product-kitred"> For {secondPart}</span>}
            </a>
          </h3>
          <span className="shop-one__price-special">₹{product.pPrice ?? ''}</span>
          <span className="shop-one__price-regular">₹{product.pMrp ?? ''}</span>
        </div>
      </div>
    </a>
  );
}
