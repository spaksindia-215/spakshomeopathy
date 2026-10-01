'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import { HerbArt } from './HerbArt';
import { HerbIcon } from './HerbIcon';
import { EmptyState } from './HerbsUI';
import { useHerbsStore } from './HerbsStoreProvider';
import {
  startCheckoutAction,
  confirmPaymentAction,
  isPaymentConfiguredAction,
} from '@/lib/herbs/orders/actions';
import type { HerbOrderItem } from '@/lib/herbs/orders/schema';

const SHIPPING_FEE = 49;
const FREE_SHIPPING_THRESHOLD = 499;

/** Minimal shape of the global `window.Razorpay` constructor injected by
 * Checkout.js — Razorpay's client-side widget ships as a script tag, not
 * an npm package (the `razorpay` package on npm is server-only, used in
 * `@/lib/herbs/payments/razorpay.ts`). Typed narrowly to what this
 * component actually uses, not the full SDK surface. */
interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void };
}
interface RazorpayCheckoutInstance {
  open: () => void;
}
declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

type Stage = 'form' | 'submitting' | 'demo-placed' | 'paid' | 'error';

/**
 * `/herbs/checkout` (§16, §18 of the original brief). Two real flows,
 * chosen automatically:
 *
 * 1. RAZORPAY CONFIGURED (`RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` set in
 *    `.env.local`, never in this repo/chat): a real order is created via
 *    `startCheckoutAction` (which creates BOTH a `herbOrders` DB record
 *    and a matching Razorpay order), Razorpay Checkout opens for the
 *    customer to pay, and `confirmPaymentAction` verifies the signed
 *    response server-side before marking the order paid.
 * 2. NOT CONFIGURED (this sandbox's actual state): falls back to the
 *    original demo-only confirmation — clearly labeled, no card fields,
 *    nothing transmitted to a payment processor.
 *
 * Either way, if a database is configured (independent of Razorpay), the
 * order is genuinely recorded in `herbOrders` — see
 * `@/lib/herbs/orders/service`'s own header.
 */
export function HerbsCheckoutPage() {
  const { cart, cartSubtotal, clearCart } = useHerbsStore();
  const [stage, setStage] = useState<Stage>('form');
  const [orderId, setOrderId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentReady, setPaymentReady] = useState<boolean | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    isPaymentConfiguredAction().then(setPaymentReady);
  }, []);

  const shipping = cartSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = cartSubtotal + shipping;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStage('submitting');
    setErrorMessage('');

    const form = e.currentTarget;
    const data = new FormData(form);
    const customer = {
      fullName: String(data.get('fullName') ?? ''),
      phone: String(data.get('phone') ?? ''),
      email: String(data.get('email') ?? ''),
      address: String(data.get('address') ?? ''),
      city: String(data.get('city') ?? ''),
      pincode: String(data.get('pincode') ?? ''),
    };
    const items: HerbOrderItem[] = cart.map((line) => ({
      productId: line.productId,
      productSlug: line.productSlug,
      productName: line.productName,
      variantLabel: line.variantLabel,
      unitPrice: line.unitPrice,
      quantity: line.quantity,
    }));

    const result = await startCheckoutAction(items, cartSubtotal, shipping, customer);

    if (!result.ok && !result.orderId) {
      // No database at all — genuinely nothing to attach a real order to.
      // Fall back to the original pure-demo confirmation.
      const demoId = `SPK-HRB-${Date.now().toString(36).toUpperCase()}`;
      setOrderId(demoId);
      setStage('demo-placed');
      clearCart();
      return;
    }

    if (result.razorpay && paymentReady) {
      openRazorpayCheckout(result.orderId!, result.razorpay, customer);
      return;
    }

    // Order saved to the database but Razorpay isn't configured (or its
    // own order-creation step failed) — demo confirmation, but backed by
    // a real, persisted `herbOrders` record this time.
    setOrderId(result.orderId ?? '');
    setStage('demo-placed');
    clearCart();
  }

  function openRazorpayCheckout(
    herbOrderId: string,
    razorpay: NonNullable<Awaited<ReturnType<typeof startCheckoutAction>>['razorpay']>,
    customer: { fullName: string; email: string; phone: string }
  ) {
    if (!window.Razorpay) {
      setErrorMessage('Payment widget failed to load. Please try again.');
      setStage('error');
      return;
    }
    const rzp = new window.Razorpay({
      key: razorpay.keyId,
      amount: razorpay.amountInPaise,
      currency: razorpay.currency,
      order_id: razorpay.orderId,
      name: 'Spaks Herbs',
      description: `Order ${herbOrderId}`,
      prefill: { name: customer.fullName, email: customer.email, contact: customer.phone },
      theme: { color: '#3c6f29' },
      handler: async (response) => {
        const confirmed = await confirmPaymentAction(
          herbOrderId,
          response.razorpay_order_id,
          response.razorpay_payment_id,
          response.razorpay_signature
        );
        if (confirmed.ok) {
          setOrderId(herbOrderId);
          setStage('paid');
          clearCart();
        } else {
          setErrorMessage(confirmed.reason ?? 'Payment verification failed.');
          setStage('error');
        }
      },
      modal: {
        ondismiss: () => setStage('form'),
      },
    });
    rzp.open();
  }

  if (stage === 'paid') {
    return (
      <section className="hs-section">
        <div className="container">
          <EmptyState
            icon="check"
            title="Payment successful."
            text={`Order ${orderId} has been paid and confirmed.`}
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

  if (stage === 'demo-placed') {
    return (
      <section className="hs-section">
        <div className="container">
          <EmptyState
            icon="check"
            title="Demo order placed."
            text={`Order reference ${orderId} — this is a demo confirmation only; no payment was processed.`}
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

  if (cart.length === 0) {
    return (
      <section className="hs-section">
        <div className="container">
          <EmptyState
            icon="cart"
            title="Your cart is empty."
            text="Add a few herbs to your cart before checking out."
            action={
              <Link href="/herbs/products" className="hs-btn hs-btn--primary hs-btn--sm">
                Browse Herbs
              </Link>
            }
          />
        </div>
      </section>
    );
  }

  return (
    <section className="hs-section hs-section--tight">
      {paymentReady && (
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="afterInteractive"
          onLoad={() => setScriptLoaded(true)}
        />
      )}
      <div className="container">
        <div className="hs-section__head">
          <div>
            <h1 className="hs-section__title">Checkout</h1>
          </div>
        </div>

        {paymentReady === false && (
          <div className="hs-demo-notice">
            <HerbIcon name="support" size={18} />
            <span>
              <strong>Demo checkout.</strong> No payment is processed and no card details are
              collected here. Razorpay is not configured in this environment yet — set{' '}
              <code>RAZORPAY_KEY_ID</code> and <code>RAZORPAY_KEY_SECRET</code> in{' '}
              <code>.env.local</code> to enable real payments.
            </span>
          </div>
        )}
        {paymentReady === true && (
          <div className="hs-demo-notice">
            <HerbIcon name="lock" size={18} />
            <span>
              <strong>Secure payment via Razorpay.</strong> Card, UPI and netbanking details are
              collected only inside Razorpay&apos;s own payment widget — never on this page.
            </span>
          </div>
        )}
        {stage === 'error' && (
          <div className="hs-demo-notice" style={{ borderColor: 'var(--herb-danger)' }}>
            <HerbIcon name="close" size={18} />
            <span>
              <strong>Payment could not be completed.</strong> {errorMessage}
            </span>
          </div>
        )}

        <div className="hs-checkout-layout">
          <form onSubmit={handleSubmit}>
            <h2 style={{ fontSize: 16, marginBottom: 14 }}>Delivery Details</h2>
            <div className="hs-form-grid">
              <div className="hs-form-field">
                <label htmlFor="fullName">Full Name</label>
                <input id="fullName" name="fullName" required />
              </div>
              <div className="hs-form-field">
                <label htmlFor="phone">Phone Number</label>
                <input id="phone" name="phone" type="tel" required />
              </div>
              <div className="hs-form-field hs-form-field--full">
                <label htmlFor="email">Email Address</label>
                <input id="email" name="email" type="email" required />
              </div>
              <div className="hs-form-field hs-form-field--full">
                <label htmlFor="address">Address</label>
                <textarea id="address" name="address" rows={3} required />
              </div>
              <div className="hs-form-field">
                <label htmlFor="city">City</label>
                <input id="city" name="city" required />
              </div>
              <div className="hs-form-field">
                <label htmlFor="pincode">Pincode</label>
                <input id="pincode" name="pincode" required />
              </div>
            </div>

            <h2 style={{ fontSize: 16, margin: '20px 0 14px' }}>Payment Method</h2>
            <div className="hs-form-field">
              <label className="hs-filters__option" data-active>
                <input type="radio" name="payment" defaultChecked readOnly />
                {paymentReady ? 'Razorpay (Card / UPI / Netbanking)' : 'Cash on Delivery (demo)'}
              </label>
            </div>

            <button
              type="submit"
              className="hs-btn hs-btn--primary hs-btn--full"
              style={{ marginTop: 12 }}
              disabled={
                stage === 'submitting' || paymentReady === null || (paymentReady && !scriptLoaded)
              }
            >
              {stage === 'submitting'
                ? 'Processing…'
                : paymentReady && !scriptLoaded
                  ? 'Loading payment widget…'
                  : paymentReady
                    ? `Pay ₹${total} with Razorpay`
                    : `Place Order — ₹${total}`}
            </button>
          </form>

          <aside className="hs-summary">
            <p className="hs-summary__title">Order Summary</p>
            {cart.map((line) => (
              <div
                key={`${line.productId}-${line.variantLabel}`}
                className="hs-summary__row"
                style={{ alignItems: 'center' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    <HerbArt
                      art={line.image}
                      label={line.productName}
                      style={{ width: '100%', height: '100%' }}
                    />
                  </span>
                  {line.productName} × {line.quantity}
                </span>
                <span>₹{line.unitPrice * line.quantity}</span>
              </div>
            ))}
            <div className="hs-summary__row">
              <span>Subtotal</span>
              <span>₹{cartSubtotal}</span>
            </div>
            <div className="hs-summary__row">
              <span>Shipping</span>
              <span>{shipping === 0 ? 'Free' : `₹${shipping}`}</span>
            </div>
            <div className="hs-summary__row hs-summary__row--total">
              <span>Total</span>
              <span>₹{total}</span>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
