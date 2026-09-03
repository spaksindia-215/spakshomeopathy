/**
 * Order service — bridges the Herbs Store checkout UI, the `herbOrders`
 * database, and the Razorpay payment integration. Same graceful-
 * degradation posture as `@/lib/herbs/db/service`: every function
 * returns a typed result rather than throwing, so the checkout page can
 * show an honest message instead of a raw error when no database and/or
 * no Razorpay keys are configured (the actual state of this sandbox).
 */

import { isHerbsDbConfigured, getHerbsDb } from '@/lib/herbs/db/client';
import { isRazorpayConfigured, getRazorpayPublicKeyId } from '@/lib/herbs/payments/config';
import { createRazorpayOrder, verifyRazorpayPaymentSignature } from '@/lib/herbs/payments/razorpay';
import { HerbOrderRepository } from './orderRepository';
import type { HerbOrder, HerbOrderItem } from './schema';

export interface CheckoutCustomer {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  pincode: string;
}

export interface StartCheckoutInput {
  items: HerbOrderItem[];
  subtotal: number;
  shipping: number;
  customer: CheckoutCustomer;
}

export interface StartCheckoutResult {
  /** Always true if an order record was created (DB required); a
   * missing Razorpay config still creates the order but omits
   * `razorpay`, so the UI can fall back to the demo confirmation flow
   * for that one order without losing the order record itself. */
  ok: boolean;
  reason?: string;
  order?: HerbOrder;
  razorpay?: {
    orderId: string;
    amountInPaise: number;
    currency: string;
    keyId: string;
  };
}

function newOrderId(): string {
  return `SPK-HRB-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Creates the `herbOrders` record and, if Razorpay is configured, a
 * matching Razorpay order — called when the checkout page loads (not on
 * form submit), so the Razorpay order id is ready before the customer
 * clicks "Pay" (Razorpay Checkout requires an order id up front).
 */
export async function startHerbCheckout(input: StartCheckoutInput): Promise<StartCheckoutResult> {
  if (!isHerbsDbConfigured()) {
    return { ok: false, reason: 'No database configured for the Herbs Store.' };
  }

  const total = input.subtotal + input.shipping;
  const now = new Date().toISOString();
  const order: HerbOrder = {
    id: newOrderId(),
    status: 'created',
    items: input.items,
    subtotal: input.subtotal,
    shipping: input.shipping,
    total,
    customer: input.customer,
    createdAt: now,
    updatedAt: now,
  };

  let razorpayInfo: StartCheckoutResult['razorpay'];
  if (isRazorpayConfigured()) {
    try {
      const rzpOrder = await createRazorpayOrder({ amountInRupees: total, receipt: order.id });
      order.razorpayOrderId = rzpOrder.id;
      razorpayInfo = {
        orderId: rzpOrder.id,
        amountInPaise:
          typeof rzpOrder.amount === 'string' ? Number(rzpOrder.amount) : rzpOrder.amount,
        currency: rzpOrder.currency,
        // Safe to send to the client: Checkout requires the public key id.
        // Non-null: isRazorpayConfigured() above already confirmed it's set.
        keyId: getRazorpayPublicKeyId()!,
      };
    } catch (err) {
      // DB order still gets saved below — Razorpay failure alone doesn't
      // block having a record of the attempted order.
      order.status = 'failed';
      order.updatedAt = new Date().toISOString();
      const db = await getHerbsDb();
      await new HerbOrderRepository(db).upsert(order);
      return {
        ok: false,
        reason: err instanceof Error ? err.message : 'Failed to create Razorpay order.',
        order,
      };
    }
  }

  const db = await getHerbsDb();
  await new HerbOrderRepository(db).upsert(order);

  return { ok: true, order, razorpay: razorpayInfo };
}

export interface ConfirmPaymentInput {
  orderId: string; // this app's HerbOrder.id
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface ConfirmPaymentResult {
  ok: boolean;
  reason?: string;
  order?: HerbOrder;
}

/**
 * Verifies the signature Razorpay Checkout returns on success, then
 * marks the matching `herbOrders` record paid. Called from a Server
 * Action after Checkout's `handler` callback fires client-side with the
 * payment response.
 */
export async function confirmHerbOrderPayment(
  input: ConfirmPaymentInput
): Promise<ConfirmPaymentResult> {
  if (!isHerbsDbConfigured()) {
    return { ok: false, reason: 'No database configured for the Herbs Store.' };
  }
  if (!isRazorpayConfigured()) {
    return { ok: false, reason: 'Razorpay is not configured.' };
  }

  const valid = verifyRazorpayPaymentSignature({
    razorpayOrderId: input.razorpayOrderId,
    razorpayPaymentId: input.razorpayPaymentId,
    razorpaySignature: input.razorpaySignature,
  });
  if (!valid) {
    return { ok: false, reason: 'Payment signature verification failed — payment not confirmed.' };
  }

  const db = await getHerbsDb();
  const repo = new HerbOrderRepository(db);
  const existing = await repo.findById(input.orderId);
  if (!existing) {
    return { ok: false, reason: `Order ${input.orderId} not found.` };
  }

  const updated: HerbOrder = {
    ...existing,
    status: 'paid',
    razorpayPaymentId: input.razorpayPaymentId,
    updatedAt: new Date().toISOString(),
  };
  await repo.upsert(updated);

  return { ok: true, order: updated };
}

export async function getHerbOrderById(id: string): Promise<HerbOrder | null> {
  if (!isHerbsDbConfigured()) return null;
  const db = await getHerbsDb();
  return new HerbOrderRepository(db).findById(id);
}

export async function getAllHerbOrders(): Promise<HerbOrder[] | null> {
  if (!isHerbsDbConfigured()) return null;
  const db = await getHerbsDb();
  return new HerbOrderRepository(db).findAll();
}
