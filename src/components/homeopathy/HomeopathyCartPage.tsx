'use client';

import Link from 'next/link';
import { ProductImage } from './HomeopathyMedia';
import { HomeopathyIcon } from './HomeopathyIcon';
import { QuantitySelector, EmptyState } from './HomeopathyUI';
import { useHomeopathyStore } from './HomeopathyStoreProvider';

const FREE_SHIPPING_THRESHOLD = 499;
const SHIPPING_FEE = 49;

/**
 * `/homeopathy/cart` — real, working client-side cart state, recreated
 * from the Herbs Store's `HerbsCartPage.tsx` (identical layout, copy, and
 * free-shipping-threshold behavior) so both storefronts' cart experience
 * match exactly, per the owner's request.
*/

export function HomeopathyCartPage() {
  const { cart, cartSubtotal, setCartQuantity, removeFromCart } = useHomeopathyStore();

  if (cart.length === 0) {
    return (
      <section className="hm-section">
        <div className="container">
          <EmptyState
            icon="cart"
            title="Your cart is empty."
            text="Looks like you haven't added any medicines yet."
            action={
              <Link href="/homeopathy/products" className="hm-btn hm-btn--primary hm-btn--sm">
                Continue Shopping
              </Link>
            }
          />
        </div>
      </section>
    );
  }

  const shipping = cartSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = cartSubtotal + shipping;

  return (
    <section className="hm-section hm-section--tight">
      <div className="container">
        <div className="hm-section__head">
          <div>
            <h1 className="hm-section__title">Your Cart</h1>
            <p className="hm-section__subtitle">
              {cart.reduce((n, l) => n + l.quantity, 0)} item(s) in your cart
            </p>
          </div>
          <Link href="/homeopathy/products" className="hm-section__link">
            ← Continue Shopping
          </Link>
        </div>

        <div className="hm-cart-layout">
          <div>
            {cart.map((line) => (
              <div className="hm-cart-line" key={line.productId}>
                <div className="hm-cart-line__media">
                  <ProductImage
                    filename={line.image}
                    alt={line.productName}
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
                <div>
                  <Link href={`/homeopathy/product/${line.productSlug}`} className="hm-cart-line__name">
                    {line.productName}
                  </Link>
                </div>
                <div className="hm-cart-line__qty">
                  <QuantitySelector
                    quantity={line.quantity}
                    onChange={(next) => setCartQuantity(line.productId, next)}
                  />
                </div>
                <div className="hm-cart-line__total">₹{line.unitPrice * line.quantity}</div>
                <button
                  type="button"
                  className="hm-cart-line__remove"
                  onClick={() => removeFromCart(line.productId)}
                  aria-label={`Remove ${line.productName} from cart`}
                >
                  <HomeopathyIcon name="close" size={16} />
                </button>
              </div>
            ))}
          </div>

          <aside className="hm-summary">
            <p className="hm-summary__title">Order Summary</p>
            <div className="hm-summary__row">
              <span>Subtotal</span>
              <span>₹{cartSubtotal}</span>
            </div>
            <div className="hm-summary__row">
              <span>Shipping</span>
              <span>{shipping === 0 ? 'Free' : `₹${shipping}`}</span>
            </div>
            {shipping > 0 && (
              <p style={{ fontSize: 12, color: 'var(--hm-ink-soft)' }}>
                Add ₹{FREE_SHIPPING_THRESHOLD - cartSubtotal} more for free shipping.
              </p>
            )}
            <div className="hm-summary__row hm-summary__row--total">
              <span>Total</span>
              <span>₹{total}</span>
            </div>
            <Link
              href="/homeopathy/checkout"
              className="hm-btn hm-btn--primary hm-btn--full"
              style={{ marginTop: 16 }}
            >
              Proceed to Checkout
            </Link>
          </aside>
        </div>
      </div>
    </section>
  );
}
