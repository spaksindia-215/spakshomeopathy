/**
 * `POST /partner/user-login` — Partner Panel feature. GENUINELY NEW, no
 * Laravel route to mirror. Same shape as `admin/user-login/route.ts`
 * (CSRF check, `authService.login()`, `createSession()` on success), using
 * `backuser: 'partner'` so `login()`'s branch matrix routes only real
 * partner (`utype=5`) accounts here.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { login } from '@/lib/services/authService';
import { createSession } from '@/lib/auth/session';
import { setFlash } from '@/lib/auth/flash';
import { verifyCsrfToken } from '@/lib/auth/csrf';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const backuser = String(formData.get('backuser') ?? '');

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'Wrong Login Details');
    return redirectTo('/partner/login', 303);
  }

  if (!email || !password) {
    await setFlash('message', 'Wrong Login Details');
    return redirectTo('/partner/login', 303);
  }

  const db = await getDb();
  const result = await login(db, { email, password, backuser, cartTotal: 0 });

  if ('redirect' in result && result.redirect === 'wrong-credentials') {
    await setFlash('message', 'Wrong Login Details');
    return redirectTo('/partner/login', 303);
  }

  const { user } = result as Exclude<typeof result, { redirect: 'wrong-credentials' }>;
  await createSession(user);

  return redirectTo('/partner/dashboard', 303);
}
