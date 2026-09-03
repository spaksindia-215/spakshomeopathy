/**
 * Zod schema for the `herbOrders` MongoDB collection — the Herbs Store's
 * own order record, created when a checkout begins and updated once
 * payment is confirmed (Razorpay integration, this session's follow-on
 * to CR-003).
 *
 * Deliberately NOT the legacy `orders`/`orderProducts`/`payments`
 * collections (`@/lib/mongodb/schemas/order`, `@/lib/mongodb/collections`
 * `COLLECTIONS.orders` etc.) — those are governed, 1:1-traced to the
 * Laravel `orders`/`order_products`/`payments` tables (DR-01, approved
 * 2026-08-16) and their own write path (5% fee arithmetic, GroupId
 * generation, order/payment status codes) is frozen under contract F-15.
 * The Herbs Store has no Laravel order flow to trace to — this is a
 * parallel, self-contained order model, stored in the same isolated
 * `<dbname>_herbs` database as `herbProducts` (see
 * `@/lib/herbs/db/config`'s header for why).
 */

import { z } from 'zod';

export const herbOrderItemSchema = z.object({
  productId: z.string(),
  productSlug: z.string(),
  productName: z.string(),
  variantLabel: z.string(),
  unitPrice: z.number().nonnegative(),
  quantity: z.number().int().positive(),
});

export const herbOrderStatusSchema = z.enum([
  'created', // Razorpay order created, payment not yet attempted
  'paid', // signature verified, payment confirmed
  'failed', // payment attempt failed or was cancelled
]);

export const herbOrderSchema = z.object({
  id: z.string().min(1), // this app's own order id, e.g. "SPK-HRB-..."
  razorpayOrderId: z.string().optional(), // set once a Razorpay order is created
  razorpayPaymentId: z.string().optional(), // set once payment succeeds
  status: herbOrderStatusSchema,
  items: z.array(herbOrderItemSchema).min(1),
  subtotal: z.number().nonnegative(),
  shipping: z.number().nonnegative(),
  total: z.number().nonnegative(),
  customer: z.object({
    fullName: z.string(),
    phone: z.string(),
    email: z.string(),
    address: z.string(),
    city: z.string(),
    pincode: z.string(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type HerbOrderItem = z.infer<typeof herbOrderItemSchema>;
export type HerbOrderStatus = z.infer<typeof herbOrderStatusSchema>;
export type HerbOrder = z.infer<typeof herbOrderSchema>;
