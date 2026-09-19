/**
 * `POST /admin/update-password-reset` — GENUINELY NEW, see
 * `forgot-password/page.tsx`'s own header for the full disclosure.
 *
 * RE-VALIDATES THE TOKEN INDEPENDENTLY of the page that linked here
 * (`reset-password/[token]/page.tsx`) — never trusts that a token valid
 * at page-render time is still valid at submit time (the gap between
 * page load and form submission could span the token's own 1-hour
 * expiry, or a second concurrent reset request could have superseded
 * it). This is the ONLY place the password is actually written.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb/client';
import { UserRepository } from '@/lib/mongodb/repositories/userRepository';
import { hashToken, verifyResetToken } from '@/lib/auth/passwordReset';
import { hashPassword } from '@/lib/auth/password';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { setFlash } from '@/lib/auth/flash';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();
  const origin = request.nextUrl.origin;

  const token = String(formData.get('token') ?? '');

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return NextResponse.redirect(new URL(`/admin/reset-password/${token}`, origin), 303);
  }

  const password = String(formData.get('password') ?? '');
  const passwordConfirmation = String(formData.get('passwordConfirmation') ?? '');

  if (password.length < 8) {
    await setFlash('message', 'Password must be at least 8 characters.');
    return NextResponse.redirect(new URL(`/admin/reset-password/${token}`, origin), 303);
  }
  if (password !== passwordConfirmation) {
    await setFlash('message', 'Passwords do not match.');
    return NextResponse.redirect(new URL(`/admin/reset-password/${token}`, origin), 303);
  }

  const db = await getDb();
  const repo = new UserRepository(db);
  const user = await repo.findByPasswordResetTokenHash(hashToken(token));
  const isValid = verifyResetToken(token, user?.passwordResetTokenHash, user?.passwordResetExpiresAt);

  if (!isValid || !user) {
    await setFlash('message', 'This reset link is invalid or has expired.');
    return NextResponse.redirect(new URL('/admin/forgot-password', origin), 303);
  }

  const newHashedPassword = await hashPassword(password);
  await repo.resetPasswordByLegacyId(user.legacyId, newHashedPassword);

  await setFlash('message', 'Your password has been reset. Please sign in.');
  return NextResponse.redirect(new URL('/admin/login', origin), 303);
}
