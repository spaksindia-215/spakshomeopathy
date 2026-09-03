/**
 * Non-throwing Razorpay configuration probe — same pattern as
 * `@/lib/herbs/db/config`'s `getHerbsDbConfig`/`isHerbsDbConfigured`:
 * checkout must degrade to an honest "payments not configured" state
 * rather than throw, since these keys are expected to be absent until
 * the owner adds them to `.env.local` (never pasted into chat/committed
 * — see `.env.example`'s own header).
 */

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret?: string;
}

export function getRazorpayConfig(): RazorpayConfig | null {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  return { keyId, keySecret, ...(webhookSecret ? { webhookSecret } : {}) };
}

export function isRazorpayConfigured(): boolean {
  return getRazorpayConfig() !== null;
}

/** The publishable key ID is safe to send to the browser (Razorpay
 * Checkout requires it client-side); the key SECRET must never leave the
 * server — this accessor exists so client-facing code has an explicit,
 * narrow way to get only the safe half. */
export function getRazorpayPublicKeyId(): string | null {
  return getRazorpayConfig()?.keyId ?? null;
}
