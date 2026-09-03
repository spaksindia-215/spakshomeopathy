/**
 * Razorpay signature verification tests (UNIT). Verifies the HMAC-SHA256
 * scheme Razorpay documents for both the client-side Checkout success
 * response and server-side webhooks, using a real secret set via env vars
 * for the duration of each test — no network call to Razorpay involved.
 */

import { createHmac } from 'crypto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const ENV_KEYS = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET'] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('verifyRazorpayPaymentSignature', () => {
  it('throws RazorpayNotConfiguredError when keys are unset', async () => {
    const { verifyRazorpayPaymentSignature, RazorpayNotConfiguredError } = await import(
      '@/lib/herbs/payments/razorpay'
    );
    expect(() =>
      verifyRazorpayPaymentSignature({
        razorpayOrderId: 'order_x',
        razorpayPaymentId: 'pay_x',
        razorpaySignature: 'deadbeef',
      })
    ).toThrow(RazorpayNotConfiguredError);
  });

  it('returns true for a correctly computed signature', async () => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_fake';
    process.env.RAZORPAY_KEY_SECRET = 'fake_secret';

    const { verifyRazorpayPaymentSignature } = await import('@/lib/herbs/payments/razorpay');

    const orderId = 'order_ABC123';
    const paymentId = 'pay_XYZ789';
    const signature = createHmac('sha256', 'fake_secret')
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    expect(
      verifyRazorpayPaymentSignature({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
      })
    ).toBe(true);
  });

  it('returns false for a tampered signature', async () => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_fake';
    process.env.RAZORPAY_KEY_SECRET = 'fake_secret';

    const { verifyRazorpayPaymentSignature } = await import('@/lib/herbs/payments/razorpay');

    const orderId = 'order_ABC123';
    const paymentId = 'pay_XYZ789';
    const realSignature = createHmac('sha256', 'fake_secret')
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    const tampered = realSignature.slice(0, -2) + '00';

    expect(
      verifyRazorpayPaymentSignature({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: tampered,
      })
    ).toBe(false);
  });

  it('returns false for a signature computed with the wrong secret (forgery attempt)', async () => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_fake';
    process.env.RAZORPAY_KEY_SECRET = 'fake_secret';

    const { verifyRazorpayPaymentSignature } = await import('@/lib/herbs/payments/razorpay');

    const orderId = 'order_ABC123';
    const paymentId = 'pay_XYZ789';
    const forgedSignature = createHmac('sha256', 'wrong_secret')
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    expect(
      verifyRazorpayPaymentSignature({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: forgedSignature,
      })
    ).toBe(false);
  });

  it('returns false rather than throwing for a malformed (non-hex) signature', async () => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_fake';
    process.env.RAZORPAY_KEY_SECRET = 'fake_secret';

    const { verifyRazorpayPaymentSignature } = await import('@/lib/herbs/payments/razorpay');

    expect(
      verifyRazorpayPaymentSignature({
        razorpayOrderId: 'order_ABC123',
        razorpayPaymentId: 'pay_XYZ789',
        razorpaySignature: 'not-hex-at-all!!',
      })
    ).toBe(false);
  });
});

describe('verifyRazorpayWebhookSignature', () => {
  it('throws when RAZORPAY_WEBHOOK_SECRET is unset even if keys are configured', async () => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_fake';
    process.env.RAZORPAY_KEY_SECRET = 'fake_secret';

    const { verifyRazorpayWebhookSignature } = await import('@/lib/herbs/payments/razorpay');

    expect(() => verifyRazorpayWebhookSignature('{}', 'deadbeef')).toThrow(
      /RAZORPAY_WEBHOOK_SECRET/i
    );
  });

  it('returns true for a correctly computed webhook signature over the raw body', async () => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_fake';
    process.env.RAZORPAY_KEY_SECRET = 'fake_secret';
    process.env.RAZORPAY_WEBHOOK_SECRET = 'fake_webhook_secret';

    const { verifyRazorpayWebhookSignature } = await import('@/lib/herbs/payments/razorpay');

    const rawBody = JSON.stringify({ event: 'payment.captured' });
    const signature = createHmac('sha256', 'fake_webhook_secret').update(rawBody).digest('hex');

    expect(verifyRazorpayWebhookSignature(rawBody, signature)).toBe(true);
  });

  it('returns false when the raw body has been altered after signing', async () => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_fake';
    process.env.RAZORPAY_KEY_SECRET = 'fake_secret';
    process.env.RAZORPAY_WEBHOOK_SECRET = 'fake_webhook_secret';

    const { verifyRazorpayWebhookSignature } = await import('@/lib/herbs/payments/razorpay');

    const originalBody = JSON.stringify({ event: 'payment.captured', amount: 100 });
    const signature = createHmac('sha256', 'fake_webhook_secret')
      .update(originalBody)
      .digest('hex');
    const alteredBody = JSON.stringify({ event: 'payment.captured', amount: 999999 });

    expect(verifyRazorpayWebhookSignature(alteredBody, signature)).toBe(false);
  });
});
