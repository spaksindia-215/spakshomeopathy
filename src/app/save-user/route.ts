/**
 * `POST /save-user` — mirrors `routes/web.php:37`
 * (`Route::post('save-user','Auth\RegisterController@UserRegister')`).
 *
 * Backs `src/app/register/page.tsx`'s real form (`action="/save-user"`,
 * hidden `utype=3`). Only the utype=3 branch is implemented — see
 * `src/lib/services/authService.ts`'s header for why utype=2/4
 * (seller/file-upload registration, `/seller-register`) is out of this
 * slice's scope. This route rejects any non-3 `utype` explicitly rather
 * than silently mis-handling it.
 *
 * M5-B: verifies `_token` FIRST, before the utype branch check — mirrors
 * Laravel's middleware-then-controller ordering (`VerifyCsrfToken` runs
 * before `Auth\RegisterController::UserRegister` is ever invoked, so a
 * CSRF failure on a `/seller-register` submission is rejected identically
 * to one from `/register`, regardless of what the controller would have
 * done with the utype afterward). See `user-login/route.ts`'s header for
 * why a clean redirect+flash is used instead of reproducing Laravel's
 * `APP_DEBUG=true` stack-trace page for `TokenMismatchException`.
 *
 * The CSRF-failure redirect target is `/register`, matching this route's
 * PRE-EXISTING validation-failure redirect below (also always `/register`,
 * regardless of which page's form actually posted here) — this endpoint
 * has never distinguished "came from /register" vs. "came from
 * /seller-register" for any failure case, not a new inconsistency
 * introduced by this slice. A `/seller-register` submission that fails
 * CSRF lands on `/register` with a flash message, same as it would for
 * every other failure branch this route already has.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { registerBuyer } from '@/lib/services/authService';
import { setFlash } from '@/lib/auth/flash';
import { verifyCsrfToken } from '@/lib/auth/csrf';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();
  const utype = String(formData.get('utype') ?? '');

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return redirectTo('/register', 303);
  }

  if (utype !== '3') {
    // Source's utype=2/4 branch (seller registration with document
    // uploads) is not implemented by this slice — see file header.
    // Not silently accepted as if it were a buyer registration.
    return NextResponse.json(
      {
        error:
          'Seller registration (utype 2/4) is not implemented in this milestone. ' +
          'Use /seller-register for the seller flow once built.',
      },
      { status: 501 }
    );
  }

  const name = String(formData.get('name') ?? '');
  const email = String(formData.get('email') ?? '');
  const mobile = String(formData.get('mobile') ?? '');
  const password = String(formData.get('password') ?? '');

  const db = await getDb();
  const result = await registerBuyer(db, { name, email, mobile, password });

  if (!result.ok) {
    // Source's `$request->validate([...])` throws a ValidationException on
    // a missing required field, which Laravel auto-redirects back with
    // `$errors` populated (not 'message') — this app has no $errors-bag
    // equivalent wired yet (same gap noted in user-login/route.ts). The
    // 'unique:users' failure is PART OF THAT SAME validation exception in
    // source (both are Laravel `Validator` failures, indistinguishable at
    // the redirect-target level) — reproduced here as the same redirect
    // back to /register with a message, the closest faithful behavior
    // available without a real $errors bag.
    const reason =
      result.reason === 'email-taken'
        ? 'The email has already been taken.'
        : `The following fields are required: ${result.fields.join(', ')}.`;
    await setFlash('message', reason);
    return redirectTo('/register', 303);
  }

  // Mirrors RegisterController.php:152 exactly, including source's own
  // typo ("registraterd") — not corrected, per contract F-17/NN-4.
  await setFlash('message', 'you registraterd successfully please login here.');
  return redirectTo('/login', 303);
}
