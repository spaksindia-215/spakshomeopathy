/**
 * One-request stash for `SuccessOrder`'s `$row` payload
 * (`HomeController.php:563`: `return view('order-placed', ['row' => $row]);`).
 *
 * WHY THIS EXISTS
 * ----------------
 * Source's `SuccessOrder` (a POST controller method) returns a rendered
 * Blade VIEW DIRECTLY, with `$row` passed as view data — no redirect
 * happens. Next.js's `route.ts` POST handlers cannot return page JSX (no
 * React-rendering capability inside a Route Handler in this codebase's
 * architecture — no App Router mechanism exists here for "render this page
 * component from a route handler with these props," and this project has
 * established no precedent for hand-rolling HTML-string responses from a
 * route.ts anywhere else). This module bridges that gap with a short-lived,
 * signed, single-read cookie — same category and mechanism as
 * `src/lib/auth/flash.ts`'s one-shot pattern, extended to carry a small
 * structured payload instead of a plain string.
 *
 * `POST /success-order`'s route handler stashes `$row` here, then redirects
 * to `GET /order-placed`; `order-placed/page.tsx` reads (and clears) the
 * stash on that ONE subsequent request. A direct `GET /order-placed` hit
 * with no prior stash finds nothing here and reproduces B-17's crash — see
 * that page's own header. This is NOT a redirect-then-view Laravel
 * pattern (source never redirects here at all) — it is the smallest bridge
 * that preserves BOTH observable outcomes source has for this view
 * (crashes on a bare GET; renders real content after a successful
 * SuccessOrder POST) inside a framework that structurally cannot return
 * page JSX from a POST handler.
 *
 * Signed (not merely opaque) because the payload feeds directly into
 * rendered HTML — same integrity rationale as `cart.ts`'s cart cookie, not
 * because the content is secret.
 */

import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';
import { getCryptoConfig } from '../env';

const STASH_COOKIE = 'spaks_success_order_row';

export interface SuccessOrderRow {
  name: string;
  deliveryDate: string;
  amount: number | null;
  orderId: number;
  payMode: string;
  orderDate: string;
  fullAddress: string | null;
  pinCode: string | null;
  state: string | null;
  country: string | null;
  houseNo: string | null;
  landmark: string | null;
  mobile: string | null;
}

function sign(data: string): string {
  const { sessionSecret } = getCryptoConfig();
  return createHmac('sha256', sessionSecret).update(data).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function stashSuccessOrderRow(row: SuccessOrderRow): Promise<void> {
  const cookieStore = await cookies();
  const json = Buffer.from(JSON.stringify(row)).toString('base64url');
  const signature = sign(json);
  cookieStore.set(STASH_COOKIE, `${json}.${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60, // one-request window, same as flash.ts
  });
}

/** Reads and clears the stash in the same call — a direct GET with no
 * prior POST finds nothing (returns `null`), reproducing B-17. */
export async function readAndClearSuccessOrderRow(): Promise<SuccessOrderRow | null> {
  const cookieStore = await cookies();
  const entry = cookieStore.get(STASH_COOKIE);
  if (!entry) return null;
  cookieStore.delete(STASH_COOKIE);

  const parts = entry.value.split('.');
  if (parts.length !== 2) return null;
  const json = parts[0];
  const signature = parts[1];
  if (json === undefined || signature === undefined) return null;
  if (!safeEqual(signature, sign(json))) return null;

  try {
    return JSON.parse(Buffer.from(json, 'base64url').toString('utf-8')) as SuccessOrderRow;
  } catch {
    return null;
  }
}
