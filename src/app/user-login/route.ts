/**
 * `POST /user-login` — mirrors `routes/web.php:36`
 * (`Route::post('user-login','Auth\LoginController@UserLogin')`) exactly.
 *
 * Backs the real, unmodified form in `src/app/login/page.tsx`
 * (`action="/user-login"`, hidden `backuser=seller_buyer`). Native HTML
 * form POST (no client JS), so a redirect response reproduces Laravel's
 * server-rendered redirect flow without inventing a fetch/JSON layer
 * source never had.
 *
 * M5-B: verifies `_token` via `csrf.ts` before anything else — mirrors
 * `VerifyCsrfToken`'s global, un-excepted CSRF check (`web.php` routes
 * carry no exceptions, confirmed directly this slice). A mismatch throws
 * `TokenMismatchException` in Laravel, which — uncaught, and with
 * `APP_DEBUG=true` in source (verified directly this slice) — renders a
 * raw debug stack trace today. Reproduced as a clean redirect + flash
 * instead, same "no observable behavior of VALUE to preserve in a debug
 * crash page" reasoning `orderToken.ts` already applied to B-12's own
 * decrypt-failure handling — not a new decision, the established one.
 *
 * M5 UPDATE (2026-08-31): `cartTotal` now reads the REAL session cart's
 * distinct-line count (`src/lib/cart.ts`'s `getTotalCartItem()`) instead
 * of the hardcoded `0` this route used before a real cart existed —
 * closes the gap this file's own prior comment flagged. Matches source's
 * `session()->get('TotalCartItem')` read in `LoginController.php:56`
 * exactly (P-11: cart is anonymous/global-to-session and survives login,
 * so the pre-login cart's line count is what correctly drives the
 * cart-list-vs-myaccount redirect branch).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb/client';
import { login } from '@/lib/services/authService';
import { createSession } from '@/lib/auth/session';
import { setFlash } from '@/lib/auth/flash';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { getCartContent, getTotalCartItem } from '@/lib/cart';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const backuser = String(formData.get('backuser') ?? '');

  const origin = request.nextUrl.origin;

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'Wrong Login Details');
    return NextResponse.redirect(new URL('/login', origin), 303);
  }

  // Mirrors `$this->validate($request, ['email'=>'required|email','password'=>'required'])`
  // — a validation failure in Laravel redirects back with `$errors` (a
  // separate mechanism from the 'message'/'AuthMsg' session flashes this
  // app reproduces). No `$errors`-equivalent bag is wired yet (out of
  // this slice's scope). The closest faithful behavior available is the
  // SAME flash key ('message') the controller itself uses for
  // "Wrong Login Details" (LoginController.php:65/:74), since an empty
  // email/password can never match a stored credential either way and
  // both paths render into the SAME alert-success block in login.blade.php
  // (verified: 'AuthMsg' is populated only by CheckBuyer's "Please login
  // here" redirect, a different flow, never by UserLogin itself).
  if (!email || !password) {
    await setFlash('message', 'Wrong Login Details');
    return NextResponse.redirect(new URL('/login', origin), 303);
  }

  const db = await getDb();
  const cartContent = await getCartContent();
  const cartTotal = getTotalCartItem(cartContent);
  const result = await login(db, { email, password, backuser, cartTotal });

  if ('redirect' in result && result.redirect === 'wrong-credentials') {
    await setFlash('message', 'Wrong Login Details');
    return NextResponse.redirect(new URL('/login', origin), 303);
  }

  const { user, redirect } = result as Exclude<typeof result, { redirect: 'wrong-credentials' }>;
  await createSession(user);

  const target =
    redirect.kind === 'admin-home'
      ? '/admin/home'
      : redirect.kind === 'seller-myaccount'
        ? '/seller/myaccount'
        : redirect.kind === 'cart-list'
          ? '/cart-list'
          : '/myaccount';

  return NextResponse.redirect(new URL(target, origin), 303);
}
