import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';
import { requireBuyerSession } from '@/lib/auth/guard';
import { readAndClearFlash, setFlash } from '@/lib/auth/flash';
import { getDb } from '@/lib/mongodb/client';
import { updatePassword, type UpdatePasswordResult } from '@/lib/services/profileService';

/**
 * `/change-password` (GET page) + buyer password-change submission —
 * ported from `change-password.blade.php` (108 lines),
 * `BuyerController@ChangePassword` (GET, `return view('change-password')`,
 * zero variables) and `BuyerController@UpdatePassword` (the form's
 * submission target).
 *
 * ROUTE-COLLISION NOTE (why this is a Server Action, not a route.ts):
 * source has TWO DIFFERENT controllers mapped to the exact same URL,
 * `update-password` (`web.php:94` GET → `HomeController@UpdatePassword`,
 * the forgot-password reset flow, already built as
 * `src/app/update-password/page.tsx`; `web.php:115` POST →
 * `BuyerController@UpdatePassword`, THIS page's submission target, inside
 * the `checkBuyer` group). Next.js's App Router does not allow a
 * `page.tsx` and a `route.ts` in the same segment (verified directly this
 * session — `next build` fails with "You cannot have two parallel pages
 * that resolve to the same path" when both are present, even for
 * different HTTP methods than the page's implicit GET). Rather than move
 * the buyer's submission to a different URL (which the existing
 * `/update-password` GET page's Blade equivalent never had — the two
 * really do share one path in source), this uses a Next.js Server Action
 * colocated in this file: identical end-user behavior (same page, same
 * redirect-back-with-flash result), the existing `/update-password` GET
 * page is completely untouched, and no new URL is invented. Owner-decided
 * this session, not defaulted into silently.
 *
 * ROUTE PROTECTION: gated by `requireBuyerSession()`
 * (`src/lib/auth/guard.ts`), mirroring `routes/web.php`'s `checkBuyer`
 * group (`web.php:104-119`) — `change-password` (GET) is one of its
 * routes. The Server Action below re-checks the session independently
 * (Server Actions are invoked directly by the client, not necessarily
 * from this rendered page, so it cannot trust having already been
 * guarded by the page load that happened to render its form).
 *
 * FLASH MESSAGE: source uses `session()->flash('message', ...)` for
 * EVERY branch (success AND all 3 failure cases) — a different pattern
 * from login/register's message/AuthMsg split. Reproduced via the same
 * `setFlash('message', ...)` mechanism already used elsewhere
 * (`src/lib/auth/flash.ts`), with source's exact message text preserved
 * verbatim, including its grammar (e.g. "old password doesnt matched" —
 * not corrected, per contract F-17/NN-4, same discipline as
 * `save-user/route.ts`'s preserved "registraterd" typo).
 *
 * `$errors` (Laravel's ValidationException bag, rendered by
 * `change-password.blade.php`'s own `@if (count($errors) > 0)` block) is
 * NOT wired — same disclosed gap as `user-login/route.ts`/`save-user/route.ts`;
 * a validation failure here also flashes to 'message' instead.
 */
export const metadata: Metadata = {
  title: 'Spakshomeopathy - Change Password',
  other: {
    'msapplication-TileColor': '#ffffff',
    'theme-color': '#ffffff',
  },
};

const FAILURE_MESSAGE: Record<Exclude<UpdatePasswordResult, { ok: true }>['reason'], string> = {
  validation: 'oldpassword, newpassword, and password_confirmation are required.',
  'confirmation-mismatch': 'new password and confirm password does not matched',
  'old-password-incorrect': 'old password doesnt matched',
  'new-password-same-as-old': 'new password can not be the old password!',
  'user-not-found': 'Session user not found.',
};

async function submitChangePassword(formData: FormData): Promise<void> {
  'use server';

  // Independent re-check — see file header. Not just belt-and-suspenders:
  // a Server Action is a real network endpoint the client can invoke
  // directly, so it must enforce access control itself, not rely on the
  // page that happens to render its <form> having already done so.
  const session = await requireBuyerSession();

  const oldPassword = String(formData.get('oldpassword') ?? '');
  const newPassword = String(formData.get('newpassword') ?? '');
  const passwordConfirmation = String(formData.get('password_confirmation') ?? '');

  const db = await getDb();
  const result = await updatePassword(db, session.userId, {
    oldPassword,
    newPassword,
    passwordConfirmation,
  });

  if (!result.ok) {
    await setFlash('message', FAILURE_MESSAGE[result.reason]);
    redirect('/change-password');
  }

  await setFlash('message', 'password updated successfully');
  redirect('/change-password');
}

export default async function ChangePasswordPage() {
  await requireBuyerSession();
  const message = await readAndClearFlash('message');

  return (
    <div className="page-wrapper">
      <PublicStylesheets />
      <PublicHeader />

      <div className="row">
        <div className="col-12">
          <div className="breadcrumb-wrap">
            <nav aria-label="breadcrumb">
              <ul className="breadcrumb">
                <li className="breadcrumb-item">
                  <Link href="/">Home</Link>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  Change Password
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>

      <section className="cart-section sec-pad pb-0">
        <div className="container">
          <div className="inner-container">
            {message !== null && <div className="alert alert-success">{message}</div>}

            <form action={submitChangePassword}>
              <input type="hidden" name="utype" value="3" />
              <div className="row align-items-end">
                <div className="col-xl-2 col-lg-2"> </div>
                <div className="col-xl-8 col-lg-8">
                  <div className="col-xl-12 col-lg-12">
                    <div className="appointment-one__form-group">
                      <input
                        type="password"
                        name="oldpassword"
                        className="appointment-one__field"
                        placeholder="Old Password"
                        required
                      />
                    </div>
                  </div>

                  <div className="col-xl-12 col-lg-12">
                    <div className="appointment-one__form-group">
                      <input
                        type="password"
                        name="newpassword"
                        className="appointment-one__field"
                        placeholder="New Password"
                        required
                      />
                    </div>
                  </div>

                  <div className="col-xl-12 col-lg-12">
                    <div className="appointment-one__form-group">
                      <input
                        type="password"
                        name="password_confirmation"
                        className="appointment-one__field"
                        placeholder="Confirm Password"
                        required
                      />
                    </div>
                  </div>

                  <div className="col-xl-6 col-lg-12">
                    <button type="submit" className="appointment-one__btn thm-btn">
                      Update Password
                    </button>
                  </div>
                </div>
                <div className="col-xl-2 col-lg-2"> </div>
              </div>
            </form>
            <div className="result"></div>
          </div>
        </div>
      </section>
      <br />
      <br />

      <PublicFooter />
      <PublicScripts />
    </div>
  );
}
