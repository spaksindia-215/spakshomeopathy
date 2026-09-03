/**
 * `GET /admin/user-logout` — mirrors `routes/admin.php:8`
 * (`Route::get('user-logout','Auth\LoginController@getSignOut')`, inside
 * the `userAuth`-guarded group, prefixed `admin/`). Same underlying
 * `getSignOut()` as the public `/logout` — `Auth::logout()` then
 * `redirect('home')` (verified: `getSignOut` has no admin-specific
 * redirect branch in source).
 */

import { NextRequest, NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth/session';
import { LOGOUT_REDIRECT } from '@/lib/services/authService';

export async function GET(request: NextRequest): Promise<NextResponse> {
  await destroySession();
  return NextResponse.redirect(new URL(LOGOUT_REDIRECT, request.nextUrl.origin), 303);
}
