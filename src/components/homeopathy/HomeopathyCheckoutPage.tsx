'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HomeopathyIcon } from './HomeopathyIcon';
import { ProductImage } from './HomeopathyMedia';
import { EmptyState } from './HomeopathyUI';
import { useHomeopathyStore } from './HomeopathyStoreProvider';

const FREE_SHIPPING_THRESHOLD = 499;
const SHIPPING_FEE = 49;

export function HomeopathyCheckoutPage() {
  const { cart, cartSubtotal, clearCart } = useHomeopathyStore();
  const [orderId, setOrderId] = useState('');

  const shipping = cartSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = cartSubtotal + shipping;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOrderId(`SPK-HOM-${Date.now().toString(36).toUpperCase()}`);
    clearCart();
  }

  if (orderId) {
    return (
      <section className="hm-section">
        <div className="container">
          <EmptyState
            icon="check"
            title="Demo order placed."
            text={`Order reference ${orderId}. This is a demo confirmation only; no order was sent to an order-processing or payment service.`}
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

  if (cart.length === 0) {
    return (
      <section className="hm-section">
        <div className="container">
          <EmptyState
            icon="cart"
            title="Your cart is empty."
            text="Add medicines to your cart before checking out."
            action={
              <Link href="/homeopathy/products" className="hm-btn hm-btn--primary hm-btn--sm">
                Browse Medicines
              </Link>
            }
          />
        </div>
      </section>
    );
  }

  return (
    <section className="hm-section hm-section--tight">
      <div className="container">
        <div className="hm-section__head">
          <div>
            <h1 className="hm-section__title">Checkout</h1>
          </div>
        </div>

        <div className="hm-demo-notice">
          <HomeopathyIcon name="lock" size={18} />
          <span>
            <strong>Demo checkout.</strong> No payment is processed and no order is sent to an
            order-processing service.
          </span>
        </div>

        <div className="hm-checkout-layout">
          <form onSubmit={handleSubmit}>
            <h2 style={{ fontSize: 16, marginBottom: 14 }}>Delivery Details</h2>
            <div className="hm-form-grid">
              <div className="hm-form-field">
                <label htmlFor="fullName">Full Name</label>
                <input id="fullName" name="fullName" autoComplete="name" required />
              </div>
              <div className="hm-form-field">
                <label htmlFor="phone">Phone Number</label>
                <input id="phone" name="phone" type="tel" autoComplete="tel" required />
              </div>
              <div className="hm-form-field hm-form-field--full">
                <label htmlFor="email">Email Address</label>
                <input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="hm-form-field hm-form-field--full">
                <label htmlFor="address">Address</label>
                <textarea
                  id="address"
                  name="address"
                  rows={3}
                  autoComplete="street-address"
                  required
                />
              </div>
              <div className="hm-form-field">
                <label htmlFor="city">City</label>
                <input id="city" name="city" autoComplete="address-level2" required />
              </div>
              <div className="hm-form-field">
                <label htmlFor="pincode">Pincode</label>
                <input
                  id="pincode"
                  name="pincode"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  required
                />
              </div>
            </div>

            <h2 style={{ fontSize: 16, margin: '20px 0 14px' }}>Payment Method</h2>
            <div className="hm-form-field">
              <label>
                <input type="radio" name="payment" defaultChecked readOnly /> Cash on Delivery
                (demo)
              </label>
            </div>

            <button
              type="submit"
              className="hm-btn hm-btn--primary hm-btn--full"
              style={{ marginTop: 12 }}
            >
              Place Order — ₹{total}
            </button>
          </form>

          <aside className="hm-summary">
            <p className="hm-summary__title">Order Summary</p>
            {cart.map((line) => (
              <div
                key={line.productId}
                className="hm-summary__row"
                style={{ alignItems: 'center', gap: 8 }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      flex: '0 0 32px',
                      overflow: 'hidden',
                      borderRadius: 4,
                    }}
                  >
                    <ProductImage filename={line.image} alt="" />
                  </span>
                  <span>
                    {line.productName} × {line.quantity}
                  </span>
                </span>
                <span>₹{line.unitPrice * line.quantity}</span>
              </div>
            ))}
            <div className="hm-summary__row">
              <span>Subtotal</span>
              <span>₹{cartSubtotal}</span>
            </div>
            <div className="hm-summary__row">
              <span>Shipping</span>
              <span>{shipping === 0 ? 'Free' : `₹${shipping}`}</span>
            </div>
            <div className="hm-summary__row hm-summary__row--total">
              <span>Total</span>
              <span>₹{total}</span>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
