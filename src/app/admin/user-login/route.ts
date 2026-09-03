/**
 * `POST /admin/user-login` — mirrors `routes/admin.php:5`
 * (`Route::post('user-login','Auth\LoginController@UserLogin')`, prefixed
 * `admin/` by `RouteServiceProvider.php:71`). The SAME controller method
 * as the public `/user-login` (verified: one `UserLogin` method in
 * `Auth\LoginController`, reused by both route files) — this handler
 * exists at a separate path only because Laravel's routing does, not
 * because the underlying logic differs. Backs
 * `src/app/admin/login/page.tsx`'s real form (`action="/admin/user-login"`,
 * hidden `backuser=admin`).
 *
 * M5-B: verifies `_token` via `csrf.ts` first — see `user-login/route.ts`'s
 * header for the full CSRF reasoning, identical here (this route sits in
 * `routes/admin.php`, but `admin.php` is also mapped inside the `web`
 * middleware group by `RouteServiceProvider.php:71`, so it carries the
 * same global `VerifyCsrfToken` protection as every `web.php` route).
 *
 * M5: `cartTotal` now reads the real session cart, same as
 * `user-login/route.ts` — see that file for the full reasoning. This
 * branch of `login()`'s redirect logic is realistically never reached via
 * THIS route in practice (the admin login form always sends
 * `backuser=admin`, and `login()`'s branch matrix only consults
 * `cartTotal` on the `utype==3 && backuser=='seller_buyer'` path — see
 * `authService.ts`), but the real value is threaded through anyway for
 * correctness, matching `user-login/route.ts` rather than leaving a
 * second, differently-stale call site.
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
    return NextResponse.redirect(new URL('/admin/login', origin), 303);
  }

  if (!email || !password) {
    await setFlash('message', 'Wrong Login Details');
    return NextResponse.redirect(new URL('/admin/login', origin), 303);
  }

  const db = await getDb();
  const cartContent = await getCartContent();
  const cartTotal = getTotalCartItem(cartContent);
  const result = await login(db, { email, password, backuser, cartTotal });

  if ('redirect' in result && result.redirect === 'wrong-credentials') {
    await setFlash('message', 'Wrong Login Details');
    return NextResponse.redirect(new URL('/admin/login', origin), 303);
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
