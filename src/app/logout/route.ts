/**
 * `GET /logout` — mirrors `routes/web.php:39`
 * (`Route::get('logout','Auth\LoginController@getSignOut')`):
 * `Auth::logout()` then `redirect('home')`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { destroySession } from '@/lib/auth/session';
import { LOGOUT_REDIRECT } from '@/lib/services/authService';

export async function GET(_request: NextRequest): Promise<NextResponse> {
  await destroySession();
  return redirectTo(LOGOUT_REDIRECT, 303);
}
