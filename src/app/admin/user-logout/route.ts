/**
 * `GET /admin/user-logout` — mirrors `routes/admin.php:8`
 * (`Route::get('user-logout','Auth\LoginController@getSignOut')`, inside
 * the `userAuth`-guarded group, prefixed `admin/`).
 *
 * DELIBERATE DEVIATION FROM SOURCE, owner-requested (production launch
 * cleanup): source's `getSignOut()` has no admin-specific redirect branch
 * and sends every logout to `redirect('home')` — the public storefront.
 * For this live admin panel that means signing out lands an admin back
 * on the public homepage instead of the login screen, which is confusing
 * navigation, not a behavior worth preserving. This route redirects to
 * `/admin/login` instead. The public `/logout` route (buyer-facing) is
 * untouched — `/home` remains correct there.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { destroySession } from '@/lib/auth/session';

export async function GET(_request: NextRequest): Promise<NextResponse> {
  await destroySession();
  return redirectTo('/admin/login', 303);
}
