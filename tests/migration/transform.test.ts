/**
 * Transformation stage tests — identifier preservation, type preservation,
 * relationship preservation, null handling, status preservation.
 */

import { describe, it, expect } from 'vitest';
import { extractTable } from '@/lib/migration/extract';
import {
  transformUsers,
  transformProducts,
  transformOrders,
  transformOrderProducts,
  transformPayments,
} from '@/lib/migration/transform';
import { isTransformSuccess } from '@/lib/migration/transform/types';
import { SAMPLE_DUMP } from './fixtures/sample-dump';

describe('transformUsers — identifier and null-handling preservation', () => {
  const userRows = extractTable(SAMPLE_DUMP, 'users');
  const buyerProfileRows = extractTable(SAMPLE_DUMP, 'buyer_profile');
  const outcomes = transformUsers(userRows, buyerProfileRows);

  it('preserves the legacyId exactly equal to the source id', () => {
    const first = outcomes[0]!;
    expect(first.ok).toBe(true);
    if (isTransformSuccess(first)) {
      expect(first.value.legacyId).toBe(1);
    }
  });

  it('embeds buyerProfile only for the user with a matching buyer_profile row', () => {
    const withProfile = outcomes.find((o) => isTransformSuccess(o) && o.value.legacyId === 3);
    const withoutProfile = outcomes.find((o) => isTransformSuccess(o) && o.value.legacyId === 1);
    expect(withProfile?.ok && withProfile.value.buyerProfile).toBeDefined();
    expect(withoutProfile?.ok && withoutProfile.value.buyerProfile).toBeUndefined();
  });

  it('preserves null fields as null, not defaulted to empty string or 0', () => {
    const nullUser = outcomes.find((o) => isTransformSuccess(o) && o.value.legacyId === 2);
    expect(nullUser?.ok && nullUser.value.mobile).toBeNull();
    expect(nullUser?.ok && nullUser.value.utype).toBeNull();
  });
});

describe('transformProducts — relationship preservation (embedded images)', () => {
  const productRows = extractTable(SAMPLE_DUMP, 'products');
  const imageRows = extractTable(SAMPLE_DUMP, 'product_images');
  const reviewRows = extractTable(SAMPLE_DUMP, 'product_review');
  const specRows = extractTable(SAMPLE_DUMP, 'product_specification');
  const outcomes = transformProducts(productRows, imageRows, reviewRows, specRows);

  it('embeds only images whose p_id matches this product (orphan image excluded)', () => {
    const product1 = outcomes.find((o) => isTransformSuccess(o) && o.value.legacyId === 1);
    expect(product1?.ok && product1.value.images).toHaveLength(1);
    expect(product1?.ok && product1.value.images[0]!.pImage).toBe('normal-extra.jpg');
  });

  it('a product with no matching images gets an empty array, not undefined', () => {
    const product2 = outcomes.find((o) => isTransformSuccess(o) && o.value.legacyId === 2);
    expect(product2?.ok && product2.value.images).toEqual([]);
  });

  it('preserves the NOT NULL pHeading even when every nullable field is null', () => {
    const product2 = outcomes.find((o) => isTransformSuccess(o) && o.value.legacyId === 2);
    expect(product2?.ok && product2.value.pHeading).toBe('Minimal Heading Only');
    expect(product2?.ok && product2.value.pName).toBeNull();
  });
});

describe('order group — GroupId/type preservation across orders/orderProducts/payments', () => {
  const orderOutcomes = transformOrders(extractTable(SAMPLE_DUMP, 'orders'));
  const lineOutcomes = transformOrderProducts(extractTable(SAMPLE_DUMP, 'orderproducts'));
  const paymentOutcomes = transformPayments(extractTable(SAMPLE_DUMP, 'payments'));

  it('preserves orders.sellPrice as a string and orderProducts.sellPrice as a number for the SAME order', () => {
    const order = orderOutcomes.find((o) => isTransformSuccess(o) && o.value.groupId === 100);
    const line = lineOutcomes.find(
      (o) => isTransformSuccess(o) && o.value.groupId === 100 && o.value.legacyId === 1
    );
    expect(order?.ok && typeof order.value.sellPrice).toBe('string');
    expect(line?.ok && typeof line.value.sellPrice).toBe('number');
  });

  it('preserves orders.orderId as a number and payments.orderId as a string for the same conceptual order', () => {
    const order = orderOutcomes.find((o) => isTransformSuccess(o) && o.value.groupId === 100);
    const payment = paymentOutcomes.find((o) => isTransformSuccess(o) && o.value.gid === 100);
    expect(order?.ok && typeof order.value.orderId).toBe('number');
    expect(order?.ok && order.value.orderId).toBe(1200101);
    expect(payment?.ok && typeof payment.value.orderId).toBe('string');
    expect(payment?.ok && payment.value.orderId).toBe('1200101');
  });

  it('preserves P-03: order (status 5) and payment (status 4) for the same GroupId carry DIFFERENT status values', () => {
    const cancelledOrder = orderOutcomes.find(
      (o) => isTransformSuccess(o) && o.value.groupId === 300
    );
    const cancelledLine = lineOutcomes.find(
      (o) => isTransformSuccess(o) && o.value.groupId === 300
    );
    const cancelledPayment = paymentOutcomes.find(
      (o) => isTransformSuccess(o) && o.value.gid === 300
    );

    expect(cancelledOrder?.ok && cancelledOrder.value.orderStatus).toBe(5);
    expect(cancelledLine?.ok && cancelledLine.value.orderStatus).toBe(5);
    expect(cancelledPayment?.ok && cancelledPayment.value.orderStatus).toBe(4);
  });

  it('an order with multiple line items produces multiple transformed orderProducts, all sharing one groupId', () => {
    const linesForOrder100 = lineOutcomes.filter(
      (o) => isTransformSuccess(o) && o.value.groupId === 100
    );
    expect(linesForOrder100).toHaveLength(2);
  });

  it('an order with no matching payment produces zero payment records for its groupId — not an error', () => {
    const paymentsForOrder200 = paymentOutcomes.filter(
      (o) => isTransformSuccess(o) && o.value.gid === 200
    );
    expect(paymentsForOrder200).toHaveLength(0);
  });

  it('preserves the DelaveryDate/DelaveryBy misspellings as field names (compile-time check via property access)', () => {
    const line = lineOutcomes.find(isTransformSuccess);
    expect(line && 'delaveryDate' in line.value).toBe(true);
    expect(line && 'delaveryBy' in line.value).toBe(true);
  });
});
