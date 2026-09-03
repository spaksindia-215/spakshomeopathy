/**
 * `orders`, `orderProducts`, `payments` transformation — DR-01's approved
 * three-collection shape. Each source table maps to its own collection
 * independently; NO join or merge happens at this stage (that would be a
 * step toward embedding, which DR-01 explicitly rejected). GroupId/gid
 * linkage is preserved as plain field values, resolved later by the
 * repository layer (src/lib/mongodb/repositories/orderRepository.ts) or
 * by the verify stage's relationship checks, not by this stage.
 *
 * CRITICAL, PER OWNER INSTRUCTION (2026-08-16, M3-B §4): `orders.orderId`
 * is transformed as a NUMBER; `payments.orderId` is transformed as a
 * STRING. These are NOT unified. Do not "fix" this for consistency.
 */

import type { Order, OrderProduct, Payment } from '@/lib/mongodb/schemas';
import { toDate, toLegacyId } from '@/lib/mongodb/mapping';
import type { SourceRecord, TransformOutcome } from './types';

function s(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v);
}
function n(v: unknown): number | null {
  return v === null || v === undefined ? null : Number(v);
}

export function transformOrder(row: SourceRecord): TransformOutcome<Order> {
  const legacyId = row.id;
  if (legacyId === null || legacyId === undefined) {
    return { ok: false, legacyId: null, reason: 'missing id', sourceRecord: row };
  }
  try {
    const order: Order = {
      legacyId: toLegacyId(legacyId as number),
      qrTransectionId: s(row.qr_transection_id) ?? '', // NOT NULL in source
      custId: n(row.CustId),
      sellerId: n(row.SellerId),
      groupId: n(row.GroupId),
      productId: n(row.ProductId),
      quantity: n(row.quantity),
      sellPrice: s(row.SellPrice), // source: varchar — PRESERVED AS STRING, do not convert to number
      deliveryPrice: n(row.DeliveryPrice),
      totalPrice: n(row.TotalPrice),
      orderId: n(row.OrderId), // source: int(11) — PRESERVED AS NUMBER
      orderNotes: s(row.OrderNotes),
      orderStatus: n(row.OrderStatus),
      payMode: s(row.PayMode),
      orderDate: s(row.OrderDate),
      deliveryDate: s(row.deliveryDate),
      createdAt: toDate(row.created_at as string) ?? new Date(0),
      updatedAt: toDate(row.updated_at as string) ?? new Date(0),
    };
    return { ok: true, value: order, legacyId: order.legacyId };
  } catch (e) {
    return {
      ok: false,
      legacyId: legacyId as number,
      reason: e instanceof Error ? e.message : String(e),
      sourceRecord: row,
    };
  }
}

export function transformOrderProduct(row: SourceRecord): TransformOutcome<OrderProduct> {
  const legacyId = row.id;
  if (legacyId === null || legacyId === undefined) {
    return { ok: false, legacyId: null, reason: 'missing id', sourceRecord: row };
  }
  try {
    const orderProduct: OrderProduct = {
      legacyId: toLegacyId(legacyId as number),
      groupId: n(row.GroupId),
      productId: n(row.ProductId),
      orderImage: s(row.OrderImage),
      quantity: n(row.quantity),
      sellPrice: n(row.SellPrice), // source: int — PRESERVED AS NUMBER (unlike orders.sellPrice)
      deliveryCharge: n(row.DeliveryCharge),
      totalPrice: n(row.TotalPrice),
      sellerId: n(row.SellerId),
      buyerId: n(row.BuyerId),
      trackingCode: s(row.TrackingCode),
      delaveryDate: s(row.DelaveryDate), // sic, preserved
      delaveryBy: s(row.DelaveryBy), // sic, preserved
      orderStatus: n(row.OrderStatus),
      createdAt: toDate(row.created_at as string) ?? new Date(0),
      updatedAt: toDate(row.updated_at as string) ?? new Date(0),
    };
    return { ok: true, value: orderProduct, legacyId: orderProduct.legacyId };
  } catch (e) {
    return {
      ok: false,
      legacyId: legacyId as number,
      reason: e instanceof Error ? e.message : String(e),
      sourceRecord: row,
    };
  }
}

export function transformPayment(row: SourceRecord): TransformOutcome<Payment> {
  const legacyId = row.id;
  if (legacyId === null || legacyId === undefined) {
    return { ok: false, legacyId: null, reason: 'missing id', sourceRecord: row };
  }
  try {
    const payment: Payment = {
      legacyId: toLegacyId(legacyId as number),
      pid: n(row.pid),
      qunt: n(row.qunt), // sic, preserved
      gid: n(row.gid),
      cid: n(row.cid),
      sid: n(row.sid),
      amount: n(row.amount),
      totalAmount: n(row.totalAmount),
      orderId: s(row.orderId), // source: varchar — PRESERVED AS STRING (unlike orders.orderId)
      payStatus: n(row.payStatus),
      orderStatus: n(row.orderStatus),
      adminFee: n(row.AdminFee), // P-17 — preserved arithmetic value, not recomputed
      sellerPay: n(row.SellerPay),
      discount: n(row.discount),
      payMode: s(row.payMode),
      payDate: s(row.payDate),
      createdAt: toDate(row.created_at as string) ?? new Date(0),
      updatedAt: toDate(row.updated_at as string) ?? new Date(0),
    };
    return { ok: true, value: payment, legacyId: payment.legacyId };
  } catch (e) {
    return {
      ok: false,
      legacyId: legacyId as number,
      reason: e instanceof Error ? e.message : String(e),
      sourceRecord: row,
    };
  }
}

export function transformOrders(rows: SourceRecord[]): TransformOutcome<Order>[] {
  return rows.map(transformOrder);
}
export function transformOrderProducts(rows: SourceRecord[]): TransformOutcome<OrderProduct>[] {
  return rows.map(transformOrderProduct);
}
export function transformPayments(rows: SourceRecord[]): TransformOutcome<Payment>[] {
  return rows.map(transformPayment);
}
