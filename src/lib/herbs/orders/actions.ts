'use server';

/**
 * Server Actions bridging the `/herbs/checkout` UI to the order/payment
 * service. Not under `src/actions/` — same reasoning as
 * `@/lib/herbs/db/actions`'s own header (that directory is reserved for
 * Server Actions replacing one of the Laravel migration's 36 cataloged
 * forms; this has no Laravel equivalent).
 */

import { startHerbCheckout, confirmHerbOrderPayment, type CheckoutCustomer } from './service';
import type { HerbOrderItem } from './schema';
import { isRazorpayConfigured } from '@/lib/herbs/payments/config';

export interface StartCheckoutActionResult {
  ok: boolean;
  reason?: string;
  orderId?: string;
  razorpay?: {
    orderId: string;
    amountInPaise: number;
    currency: string;
    keyId: string;
  };
}

export async function startCheckoutAction(
  items: HerbOrderItem[],
  subtotal: number,
  shipping: number,
  customer: CheckoutCustomer
): Promise<StartCheckoutActionResult> {
  const result = await startHerbCheckout({ items, subtotal, shipping, customer });
  return {
    ok: result.ok,
    reason: result.reason,
    orderId: result.order?.id,
    razorpay: result.razorpay,
  };
}

export interface ConfirmPaymentActionResult {
  ok: boolean;
  reason?: string;
}

export async function confirmPaymentAction(
  orderId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): Promise<ConfirmPaymentActionResult> {
  const result = await confirmHerbOrderPayment({
    orderId,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });
  return { ok: result.ok, reason: result.reason };
}

export async function isPaymentConfiguredAction(): Promise<boolean> {
  return isRazorpayConfigured();
}
