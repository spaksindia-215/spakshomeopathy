/**
 * M3-A schema validation tests.
 *
 * Proves: (1) every fixture representing a well-formed, faithfully-migrated
 * document passes its schema; (2) schemas reject shapes that would
 * represent a fidelity violation (a required source field missing, a wrong
 * type on a deliberately-preserved anomaly like orders.sellPrice being a
 * string); (3) the specific preserved anomalies documented in the schema
 * files (misspellings, type mismatches between similarly-named fields
 * across collections) are exercised explicitly, not just implied.
 */

import { describe, it, expect } from 'vitest';
import {
  userSchema,
  productSchema,
  orderSchema,
  orderProductSchema,
  paymentSchema,
  categorySchema,
  pinCodeSchema,
} from '@/lib/mongodb/schemas';
import {
  validUser,
  validUserWithBuyerProfile,
  validProduct,
  validOrder,
  validOrderProduct,
  validPayment,
  validCategory,
  validPinCode,
} from './fixtures';

describe('userSchema', () => {
  it('accepts a valid user with no buyer profile', () => {
    expect(() => userSchema.parse(validUser)).not.toThrow();
  });

  it('accepts a valid user with an embedded buyer profile', () => {
    const parsed = userSchema.parse(validUserWithBuyerProfile);
    expect(parsed.buyerProfile).toBeDefined();
    expect(parsed.buyerProfile?.pinCode).toBe('110025');
  });

  it('rejects a user missing the required password field', () => {
    const { password: _password, ...withoutPassword } = validUser;
    expect(() => userSchema.parse(withoutPassword)).toThrow();
  });

  it('accepts nullable fields as null (matches source DEFAULT NULL columns)', () => {
    expect(() => userSchema.parse({ ...validUser, mobile: null, image: null })).not.toThrow();
  });
});

describe('productSchema', () => {
  it('accepts a valid product with all 9 variant slots present', () => {
    expect(() => productSchema.parse(validProduct)).not.toThrow();
  });

  it('rejects a product missing pHeading (the one NOT NULL business column in source)', () => {
    const { pHeading: _pHeading, ...withoutHeading } = validProduct;
    expect(() => productSchema.parse(withoutHeading)).toThrow();
  });

  it('preserves an empty reviews array (source has 0 rows in product_review today)', () => {
    const parsed = productSchema.parse(validProduct);
    expect(parsed.reviews).toEqual([]);
  });

  it('accepts uid as null (matches source reality — always null, confirms B-07/B-08)', () => {
    const parsed = productSchema.parse({ ...validProduct, uid: null });
    expect(parsed.uid).toBeNull();
  });
});

describe('order group schemas — DR-01 three-collection shape', () => {
  it('orderSchema accepts sellPrice as a STRING (source: varchar(255))', () => {
    const parsed = orderSchema.parse(validOrder);
    expect(typeof parsed.sellPrice).toBe('string');
  });

  it('orderSchema rejects sellPrice as a number (would violate the preserved type anomaly)', () => {
    expect(() => orderSchema.parse({ ...validOrder, sellPrice: 90 })).toThrow();
  });

  it('orderProductSchema accepts sellPrice as a NUMBER (source: int(11)) — the opposite of orders.sellPrice', () => {
    const parsed = orderProductSchema.parse(validOrderProduct);
    expect(typeof parsed.sellPrice).toBe('number');
  });

  it('orderProductSchema preserves the delaveryDate/delaveryBy misspellings as field names', () => {
    // This test passes by virtue of TypeScript compiling at all — if the
    // schema had "corrected" these to deliveryDate/deliveryBy, the fixture
    // (typed against OrderProduct) would fail to compile. Runtime check
    // included for completeness.
    expect(() => orderProductSchema.parse(validOrderProduct)).not.toThrow();
  });

  it('paymentSchema accepts orderId as a STRING (source: varchar(255)) — unlike orders.orderId which is a number', () => {
    const parsed = paymentSchema.parse(validPayment);
    expect(typeof parsed.orderId).toBe('string');
  });

  it('paymentSchema preserves the qunt misspelling (source: quantity meant, "qunt" written)', () => {
    expect(() => paymentSchema.parse(validPayment)).not.toThrow();
  });

  it('all three order-group documents share the same groupId/gid value for one order', () => {
    expect(validOrder.groupId).toBe(validOrderProduct.groupId);
    expect(validOrder.groupId).toBe(validPayment.gid);
  });

  it('P-03 fidelity: order-group documents can carry independently-different orderStatus values', () => {
    // Illustrates that nothing in the schema forces orders/orderProducts/payments
    // orderStatus to agree — which is required to reproduce P-03 (admin cancel
    // writes 5/5/4 across the three, not a uniform value).
    const cancelledOrder = { ...validOrder, orderStatus: 5 };
    const cancelledLine = { ...validOrderProduct, orderStatus: 5 };
    const cancelledPayment = { ...validPayment, orderStatus: 4 };
    expect(() => orderSchema.parse(cancelledOrder)).not.toThrow();
    expect(() => orderProductSchema.parse(cancelledLine)).not.toThrow();
    expect(() => paymentSchema.parse(cancelledPayment)).not.toThrow();
    expect(cancelledOrder.orderStatus).not.toBe(cancelledPayment.orderStatus);
  });
});

describe('categorySchema', () => {
  it('accepts type "N" and "H" (the schema\'s only enum column in source)', () => {
    expect(() => categorySchema.parse(validCategory)).not.toThrow();
    expect(() => categorySchema.parse({ ...validCategory, type: 'H' })).not.toThrow();
  });

  it('rejects a type value outside N/H', () => {
    expect(() => categorySchema.parse({ ...validCategory, type: 'X' })).toThrow();
  });

  it('rejects a missing type (NOT NULL in source)', () => {
    const { type: _type, ...withoutType } = validCategory;
    expect(() => categorySchema.parse(withoutType)).toThrow();
  });
});

describe('pinCodeSchema — DR-03 groundwork', () => {
  it('accepts status as a STRING (source: varchar(255), an anomaly vs. every other numeric status column)', () => {
    const parsed = pinCodeSchema.parse(validPinCode);
    expect(typeof parsed.status).toBe('string');
  });

  it("describes the collection's REAL shape, not the mismatched column names the BROKEN controller writes", () => {
    // pin_code/pin_address (the columns B-09's controller writes) should
    // never appear as field names on this schema — pincode/location are
    // the real columns.
    const parsed = pinCodeSchema.parse(validPinCode);
    expect(parsed).toHaveProperty('pincode');
    expect(parsed).toHaveProperty('location');
    expect(parsed).not.toHaveProperty('pin_code');
    expect(parsed).not.toHaveProperty('pin_address');
  });
});
