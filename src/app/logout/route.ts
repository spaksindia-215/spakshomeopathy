/**
 * `GET /logout` — mirrors `routes/web.php:39`
 * (`Route::get('logout','Auth\LoginController@getSignOut')`):
 * `Auth::logout()` then `redirect('home')`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth/session';
import { LOGOUT_REDIRECT } from '@/lib/services/authService';

export async function GET(request: NextRequest): Promise<NextResponse> {
  await destroySession();
  return NextResponse.redirect(new URL(LOGOUT_REDIRECT, request.nextUrl.origin), 303);
}
