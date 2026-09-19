/**
 * `POST /update-profile` — mirrors `routes/web.php:111`
 * (`Route::post('update-profile','BuyerController@UpdateProfile')`,
 * inside the `checkBuyer` group, `web.php:104-119`).
 *
 * Backs `src/app/profile/page.tsx`'s form (`action="/update-profile"`).
 * No route collision here (unlike `/update-password` — see
 * `src/app/change-password/page.tsx`'s header for that one), so this is a
 * normal `route.ts`, matching every other authenticated form submission
 * in this app (`user-login`, `save-user`).
 *
 * M5-B: verifies `_token` BEFORE `requireBuyerSession()` — mirrors
 * Laravel's actual middleware pipeline order: `VerifyCsrfToken` is a
 * GLOBAL `web`-group middleware (`Kernel.php`'s `$middleware`/
 * `$middlewareGroups['web']`), which runs before route-specific middleware
 * like `checkBuyer` is ever reached (confirmed directly this slice by
 * reading `Kernel.php`'s middleware registration order) — so on real
 * Laravel, a request with a bad CSRF token never even gets to `CheckBuyer`,
 * regardless of whether it's authenticated. Ordering this any other way
 * would silently invert that precedence.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { requireBuyerSession } from '@/lib/auth/guard';
import { updateProfile } from '@/lib/services/profileService';
import { setFlash } from '@/lib/auth/flash';
import { verifyCsrfToken } from '@/lib/auth/csrf';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return redirectTo('/profile', 303);
  }

  // Route Handlers, unlike Server Component renders, ARE allowed to
  // redirect + set cookies — so this guard call, unlike the page-level
  // ones, can fully reproduce CheckBuyer's redirect (still to /login,
  // still without the AuthMsg flash — see guard.ts's own disclosed gap
  // on why that part specifically stays unreproduced even here: the
  // guard function itself doesn't attempt it, for consistency, since the
  // flash content would be identical either way).
  const session = await requireBuyerSession();
  const name = String(formData.get('name') ?? '');
  const mobile = String(formData.get('mobile') ?? '');
  const pinCode = String(formData.get('PinCode') ?? '');
  const fullAddress = String(formData.get('FullAddress') ?? '');
  const houseNo = String(formData.get('HouseNo') ?? '');
  const landmark = String(formData.get('Landmark') ?? '');

  const db = await getDb();
  await updateProfile(db, session.userId, {
    name,
    mobile,
    pinCode,
    fullAddress,
    houseNo,
    landmark,
  });

  // Mirrors `redirect()->back()->with('message', 'Profile Updated successfully!!')`
  // (BuyerController.php:65) exactly, including source's own capitalization
  // ("Profile Updated" — capital U) — not corrected, per contract F-17/NN-4.
  // `redirect()->back()` in Laravel returns to the referring page, which is
  // always /profile for this form (the only page with this form action) —
  // reproduced as a direct redirect to /profile rather than reading a
  // Referer header, matching how every other route in this app already
  // handles "back" redirects (e.g. save-user/route.ts redirects to a fixed
  // target, not a parsed Referer).
  await setFlash('message', 'Profile Updated successfully!!');
  return redirectTo('/profile', 303);
}
