import Razorpay from 'razorpay';
import { createHmac, timingSafeEqual } from 'crypto';
import { getRazorpayConfig } from './config';

export class RazorpayNotConfiguredError extends Error {
  constructor() {
    super(
      'Razorpay is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set in ' +
        '.env.local). Checkout should check isRazorpayConfigured() first and fall back ' +
        'to the demo-only order flow rather than calling this directly.'
    );
    this.name = 'RazorpayNotConfiguredError';
  }
}

let client: Razorpay | undefined;

/** Lazily-constructed singleton, same pattern as `getHerbsDb()` — never
 * instantiated at import time, so a page that never reaches checkout
 * never needs the keys present. */
function getRazorpayClient(): Razorpay {
  if (client) return client;
  const config = getRazorpayConfig();
  if (!config) throw new RazorpayNotConfiguredError();
  client = new Razorpay({ key_id: config.keyId, key_secret: config.keySecret });
  return client;
}

export interface CreateRazorpayOrderInput {
  /** Amount in rupees (major unit) — converted to paise internally,
   * matching Razorpay's own subunit requirement (see the SDK's own
   * `amount` doc comment: "for an amount of ₹295, enter 29500"). */
  amountInRupees: number;
  /** This app's own order id (`HerbOrder.id`), passed as Razorpay's
   * `receipt` field for cross-referencing in the Razorpay dashboard. */
  receipt: string;
}

/** Creates a Razorpay order — the first step of the standard Checkout
 * flow (create order server-side → open Checkout client-side with that
 * order id → verify the signed response server-side on success). */
export async function createRazorpayOrder(input: CreateRazorpayOrderInput) {
  const rzp = getRazorpayClient();
  const amountInPaise = Math.round(input.amountInRupees * 100);
  return rzp.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt: input.receipt,
  });
}

export interface VerifyPaymentSignatureInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

/**
 * Verifies the HMAC-SHA256 signature Razorpay Checkout returns on
 * successful payment, per Razorpay's documented client-side verification
 * method: `HMAC_SHA256(order_id + "|" + payment_id, key_secret)` must
 * equal the returned signature. Uses `timingSafeEqual` (not `===`) so
 * signature comparison isn't vulnerable to a timing side-channel.
 */
export function verifyRazorpayPaymentSignature(input: VerifyPaymentSignatureInput): boolean {
  const config = getRazorpayConfig();
  if (!config) throw new RazorpayNotConfiguredError();

  const expected = createHmac('sha256', config.keySecret)
    .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'hex');
  const actualBuf = Buffer.from(input.razorpaySignature, 'hex');
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

/**
 * Verifies a Razorpay webhook's `X-Razorpay-Signature` header against the
 * raw request body, per Razorpay's webhook signature scheme:
 * `HMAC_SHA256(rawBody, webhookSecret)`. Distinct from
 * `verifyRazorpayPaymentSignature` above (different secret, different
 * input) — the webhook secret is configured separately in the Razorpay
 * dashboard when a webhook endpoint is registered.
 */
export function verifyRazorpayWebhookSignature(rawBody: string, signature: string): boolean {
  const config = getRazorpayConfig();
  if (!config?.webhookSecret) {
    throw new Error(
      'RAZORPAY_WEBHOOK_SECRET is not set — cannot verify webhook signatures. Set it in ' +
        '.env.local after registering a webhook endpoint in the Razorpay dashboard.'
    );
  }
  const expected = createHmac('sha256', config.webhookSecret).update(rawBody).digest('hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  const actualBuf = Buffer.from(signature, 'hex');
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}
