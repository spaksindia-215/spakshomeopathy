/**
 * `POST /admin/send-password-reset` — GENUINELY NEW, no Laravel route to
 * mirror (see `forgot-password/page.tsx`'s own header). Follows this
 * codebase's own established convention for new admin-form POST
 * handlers (CSRF check, `setFlash`, redirect) — the same pattern
 * `save-homeopathy/route.ts` uses, adapted for a public (unauthenticated)
 * form: this route deliberately does NOT call `requireAdminSession()` —
 * a locked-out admin has no session to present.
 *
 * DOES NOT REVEAL WHETHER AN EMAIL EXISTS: always shows the same
 * "if that email exists, a reset link has been sent" message and
 * redirects to the same place, whether or not the submitted email
 * matches a real admin account (or a non-admin account) — the standard
 * anti-enumeration posture for a forgot-password flow. The token is
 * only generated/stored/emailed when a real admin account matches.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { UserRepository } from '@/lib/mongodb/repositories/userRepository';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { setFlash } from '@/lib/auth/flash';
import { generateResetToken } from '@/lib/auth/passwordReset';
import { sendPasswordResetEmail } from '@/lib/auth/sendPasswordResetEmail';
import { getAppConfig } from '@/lib/env';

const GENERIC_MESSAGE = 'If that email address has an admin account, a reset link has been sent.';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();
  const origin = request.nextUrl.origin;

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return redirectTo('/admin/forgot-password', 303);
  }

  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();

  if (email) {
    const db = await getDb();
    const repo = new UserRepository(db);
    const user = await repo.findByEmail(email);

    if (user && user.utype === 1) {
      const { rawToken, tokenHash, expiresAt } = generateResetToken();
      await repo.updateOne(
        { legacyId: user.legacyId },
        { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: expiresAt }
      );

      let appUrl = origin;
      try {
        appUrl = getAppConfig().url;
      } catch {
        // APP_URL unset — fall back to this request's own origin rather
        // than failing the whole request over a cosmetic URL-base choice.
      }
      const resetUrl = `${appUrl}/admin/reset-password/${rawToken}`;
      // Deliberately not awaited-and-branched-on for the response shown
      // to the requester (see file header, "does not reveal whether an
      // email exists") — but IS awaited here so a delivery failure is at
      // least logged server-side, not silently lost.
      const result = await sendPasswordResetEmail(email, resetUrl);
      if (!result.sent) {
        console.error(`Password reset email to ${email} failed to send: ${result.reason}`);
      }
    }
  }

  await setFlash('message', GENERIC_MESSAGE);
  return redirectTo('/admin/forgot-password', 303);
}
