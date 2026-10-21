import { NextResponse } from 'next/server';
import { verifyRazorpayWebhookSignature } from '@/lib/herbs/payments/razorpay';
import { getRazorpayConfig } from '@/lib/herbs/payments/config';
import { getHerbsDb, isHerbsDbConfigured } from '@/lib/herbs/db/client';
import { HerbOrderRepository } from '@/lib/herbs/orders/orderRepository';

/**
 * `POST /api/herbs/razorpay-webhook` — server-to-server payment
 * confirmation, independent of the client-side Checkout `handler`
 * callback in `HerbsCheckoutPage.tsx`. Not a port of any Laravel route —
 * genuinely new surface area for the Herbs Store's Razorpay integration
 * (CR-003 follow-on).
 *
 * WHY THIS EXISTS ALONGSIDE THE CLIENT-SIDE CONFIRMATION:
 * the `handler` callback in Razorpay Checkout only fires if the
 * customer's browser stays on the page after paying — if they close the
 * tab, lose connectivity, or the JS errors, the order can stay stuck at
 * `status: 'created'` even though Razorpay successfully charged the
 * customer. Registering this URL as a webhook in the Razorpay dashboard
 * (Settings → Webhooks, event: `payment.captured`) makes confirmation
 * resilient to that — Razorpay calls this endpoint directly regardless
 * of what happens in the browser.
 *
 * Optional: only active when `RAZORPAY_WEBHOOK_SECRET` is set (a
 * separate secret from the API keys, generated when the webhook is
 * registered). Without it, this endpoint returns 501 rather than
 * silently accepting unverifiable requests.
 */
export async function POST(request: Request) {
  const config = getRazorpayConfig();
  if (!config?.webhookSecret) {
    return NextResponse.json(
      { error: 'Webhook not configured (RAZORPAY_WEBHOOK_SECRET unset).' },
      { status: 501 }
    );
  }

  const signature = request.headers.get('x-razorpay-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing X-Razorpay-Signature header.' }, { status: 400 });
  }

  // Signature is computed over the RAW body — must read as text before
  // any JSON parsing, or the byte-for-byte match will fail.
  const rawBody = await request.text();

  let valid: boolean;
  try {
    valid = verifyRazorpayWebhookSignature(rawBody, signature);
  } catch {
    return NextResponse.json({ error: 'Webhook verification failed.' }, { status: 500 });
  }
  if (!valid) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  if (!isHerbsDbConfigured()) {
    // Signature is valid but there's nowhere to record the result — ack
    // with 200 so Razorpay doesn't retry indefinitely for an environment
    // that will never have a database (this sandbox's actual state).
    return NextResponse.json({ received: true, note: 'No database configured.' });
  }

  let payload: {
    event?: string;
    payload?: { payment?: { entity?: { order_id?: string; id?: string } } };
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (payload.event === 'payment.captured') {
    const razorpayOrderId = payload.payload?.payment?.entity?.order_id;
    const razorpayPaymentId = payload.payload?.payment?.entity?.id;
    if (razorpayOrderId && razorpayPaymentId) {
      const db = await getHerbsDb();
      const repo = new HerbOrderRepository(db);
      const order = await repo.findByRazorpayOrderId(razorpayOrderId);
      if (order && order.status !== 'paid') {
        await repo.upsert({
          ...order,
          status: 'paid',
          razorpayPaymentId,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
