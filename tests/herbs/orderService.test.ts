/**
 * `@/lib/herbs/orders/service` tests — verifies the same graceful-
 * degradation contract as `@/lib/herbs/db/service` (see that test file's
 * own header): every function must return a typed, non-throwing result
 * when no database (and/or no Razorpay) is configured.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  startHerbCheckout,
  confirmHerbOrderPayment,
  getHerbOrderById,
  getAllHerbOrders,
} from '@/lib/herbs/orders/service';
import type { HerbOrderItem } from '@/lib/herbs/orders/schema';

const ENV_KEYS = [
  'MONGODB_URI',
  'MONGODB_DB_NAME',
  'MONGODB_ENV',
  'MONGODB_ALLOW_PRODUCTION',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
] as const;
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

const sampleItems: HerbOrderItem[] = [
  {
    productId: 'hp-01',
    productSlug: 'ashwagandha-root-powder',
    productName: 'Ashwagandha Root Powder',
    variantLabel: '100g',
    unitPrice: 259,
    quantity: 1,
  },
];

const sampleCustomer = {
  fullName: 'Test Customer',
  phone: '9000000000',
  email: 'test@example.com',
  address: '123 Test Street',
  city: 'Delhi',
  pincode: '110001',
};

describe('Herbs order service — no database configured', () => {
  it('startHerbCheckout returns ok:false with an explicit reason, no order created', async () => {
    const result = await startHerbCheckout({
      items: sampleItems,
      subtotal: 259,
      shipping: 49,
      customer: sampleCustomer,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/no database/i);
    expect(result.order).toBeUndefined();
  });

  it('confirmHerbOrderPayment returns ok:false with an explicit reason', async () => {
    const result = await confirmHerbOrderPayment({
      orderId: 'SPK-HRB-TEST',
      razorpayOrderId: 'order_x',
      razorpayPaymentId: 'pay_x',
      razorpaySignature: 'deadbeef',
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/no database/i);
  });

  it('getHerbOrderById returns null rather than throwing', async () => {
    await expect(getHerbOrderById('SPK-HRB-TEST')).resolves.toBeNull();
  });

  it('getAllHerbOrders returns null rather than throwing', async () => {
    await expect(getAllHerbOrders()).resolves.toBeNull();
  });
});

describe('Herbs order service — database configured, Razorpay not configured', () => {
  beforeEach(() => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017';
    process.env.MONGODB_DB_NAME = 'spaks_dev';
    process.env.MONGODB_ENV = 'development';
  });

  it('confirmHerbOrderPayment reports Razorpay not configured without touching the database', async () => {
    const result = await confirmHerbOrderPayment({
      orderId: 'SPK-HRB-TEST',
      razorpayOrderId: 'order_x',
      razorpayPaymentId: 'pay_x',
      razorpaySignature: 'deadbeef',
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/razorpay/i);
  });
});
