/**
 * `getRazorpayConfig` / `isRazorpayConfigured` / `getRazorpayPublicKeyId`
 * tests (UNIT — no network, just env-var reading).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getRazorpayConfig,
  isRazorpayConfigured,
  getRazorpayPublicKeyId,
} from '@/lib/herbs/payments/config';

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

describe('getRazorpayConfig / isRazorpayConfigured', () => {
  it('returns null and reports unconfigured when no RAZORPAY_* vars are set', () => {
    expect(getRazorpayConfig()).toBeNull();
    expect(isRazorpayConfigured()).toBe(false);
    expect(getRazorpayPublicKeyId()).toBeNull();
  });

  it('returns null when only RAZORPAY_KEY_ID is set (secret missing)', () => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_fake';
    expect(getRazorpayConfig()).toBeNull();
  });

  it('returns a config when both key id and secret are set', () => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_fake';
    process.env.RAZORPAY_KEY_SECRET = 'fake_secret';

    const config = getRazorpayConfig();
    expect(config).not.toBeNull();
    expect(config?.keyId).toBe('rzp_test_fake');
    expect(config?.keySecret).toBe('fake_secret');
    expect(config?.webhookSecret).toBeUndefined();
    expect(isRazorpayConfigured()).toBe(true);
    expect(getRazorpayPublicKeyId()).toBe('rzp_test_fake');
  });

  it('includes webhookSecret only when set', () => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_fake';
    process.env.RAZORPAY_KEY_SECRET = 'fake_secret';
    process.env.RAZORPAY_WEBHOOK_SECRET = 'fake_webhook';

    expect(getRazorpayConfig()?.webhookSecret).toBe('fake_webhook');
  });
});
