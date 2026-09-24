/**
 * `GET /partner/user-logout` — Partner Panel feature. Mirrors
 * `admin/user-logout/route.ts`'s shape: destroy the session, redirect back
 * to the panel's own login page (not the public homepage).
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { destroySession } from '@/lib/auth/session';

export async function GET(_request: NextRequest): Promise<NextResponse> {
  await destroySession();
  return redirectTo('/partner/login', 303);
}
