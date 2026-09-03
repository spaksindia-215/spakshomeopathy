'use client';

import Link from 'next/link';
import { HerbArt } from './HerbArt';
import { HerbIcon } from './HerbIcon';
import { QuantitySelector, EmptyState } from './HerbsUI';
import { useHerbsStore } from './HerbsStoreProvider';

const FREE_SHIPPING_THRESHOLD = 499;
const SHIPPING_FEE = 49;

/** `/herbs/cart` (§17 of the original brief) — real, working cart state. */
export function HerbsCartPage() {
  const { cart, cartSubtotal, setCartQuantity, removeFromCart } = useHerbsStore();

  if (cart.length === 0) {
    return (
      <section className="hs-section">
        <div className="container">
          <EmptyState
            icon="cart"
            title="Your cart is empty."
            text="Looks like you haven't added any herbs yet."
            action={
              <Link href="/herbs/products" className="hs-btn hs-btn--primary hs-btn--sm">
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
    <section className="hs-section hs-section--tight">
      <div className="container">
        <div className="hs-section__head">
          <div>
            <h1 className="hs-section__title">Your Cart</h1>
            <p className="hs-section__subtitle">
              {cart.reduce((n, l) => n + l.quantity, 0)} item(s) in your cart
            </p>
          </div>
          <Link href="/herbs/products" className="hs-section__link">
            ← Continue Shopping
          </Link>
        </div>

        <div className="hs-cart-layout">
          <div>
            {cart.map((line) => (
              <div className="hs-cart-line" key={`${line.productId}-${line.variantLabel}`}>
                <div className="hs-cart-line__media">
                  <HerbArt
                    art={line.image}
                    label={line.productName}
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
                <div>
                  <Link href={`/herbs/product/${line.productSlug}`} className="hs-cart-line__name">
                    {line.productName}
                  </Link>
                  <div className="hs-cart-line__variant">{line.variantLabel}</div>
                </div>
                <div className="hs-cart-line__qty">
                  <QuantitySelector
                    quantity={line.quantity}
                    onChange={(next) => setCartQuantity(line.productId, line.variantLabel, next)}
                  />
                </div>
                <div className="hs-cart-line__total">₹{line.unitPrice * line.quantity}</div>
                <button
                  type="button"
                  className="hs-cart-line__remove"
                  onClick={() => removeFromCart(line.productId, line.variantLabel)}
                  aria-label={`Remove ${line.productName} from cart`}
                >
                  <HerbIcon name="close" size={16} />
                </button>
              </div>
            ))}
          </div>

          <aside className="hs-summary">
            <p className="hs-summary__title">Order Summary</p>
            <div className="hs-summary__row">
              <span>Subtotal</span>
              <span>₹{cartSubtotal}</span>
            </div>
            <div className="hs-summary__row">
              <span>Shipping</span>
              <span>{shipping === 0 ? 'Free' : `₹${shipping}`}</span>
            </div>
            {shipping > 0 && (
              <p style={{ fontSize: 12, color: 'var(--herb-ink-soft)' }}>
                Add ₹{FREE_SHIPPING_THRESHOLD - cartSubtotal} more for free shipping.
              </p>
            )}
            <div className="hs-summary__row hs-summary__row--total">
              <span>Total</span>
              <span>₹{total}</span>
            </div>
            <Link
              href="/herbs/checkout"
              className="hs-btn hs-btn--primary hs-btn--full"
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
