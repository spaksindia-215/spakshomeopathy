import type { Metadata } from 'next';
import { getDb } from '@/lib/mongodb/client';
import { UserRepository } from '@/lib/mongodb/repositories/userRepository';
import { hashToken, verifyResetToken } from '@/lib/auth/passwordReset';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { readAndClearFlash } from '@/lib/auth/flash';

interface Props {
  params: Promise<{ token: string }>;
}

/**
 * `/admin/reset-password/[token]` — GENUINELY NEW, see
 * `forgot-password/page.tsx`'s own header for the full disclosure.
 *
 * Validates the token HERE (read-only: hash it, look up the matching
 * user, check expiry) so an invalid/expired link shows a clear message
 * immediately rather than only failing on submit — the actual password
 * WRITE happens in the `POST` route handler,
 * `update-password-reset/route.ts`, which re-validates independently
 * (never trusts that this page's own validation is still true by the
 * time of submission — the token could expire in the gap between page
 * load and form submit).
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Reset Password',
};

export default async function AdminResetPasswordPage({ params }: Props) {
  const { token } = await params;

  const db = await getDb();
  const repo = new UserRepository(db);
  const candidate = await repo.findByPasswordResetTokenHash(hashToken(token));
  const isValid = verifyResetToken(
    token,
    candidate?.passwordResetTokenHash,
    candidate?.passwordResetExpiresAt
  );

  const csrfToken = generateCsrfToken();
  const message = await readAndClearFlash('message');

  return (
    <>
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/bootstrap/dist/css/bootstrap.min.css"
      />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/font-awesome/css/font-awesome.min.css"
      />
      <link rel="stylesheet" href="/admin-assets/bower_components/Ionicons/css/ionicons.min.css" />
      <link rel="stylesheet" href="/admin-assets/dist/css/AdminLTE.min.css" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,400,600,700,300italic,400italic,600italic"
      />

      <div className="hold-transition login-page">
        <div className="login-box">
          <div className="login-logo">
            <a href="/admin/login">
              <b>Spaks</b>Homeopathy
            </a>
          </div>
          <div className="login-box-body">
            {!isValid ? (
              <>
                <p className="login-box-msg">
                  This reset link is invalid or has expired.
                </p>
                <p>
                  <a href="/admin/forgot-password">Request a new reset link</a>
                </p>
              </>
            ) : (
              <>
                <p className="login-box-msg">Choose a new password.</p>
                {message !== null && <div className="alert alert-danger">{message}</div>}
                <form action="/admin/update-password-reset" method="post">
                  <input type="hidden" name="_token" value={csrfToken} />
                  <input type="hidden" name="token" value={token} />
                  <div className="form-group has-feedback">
                    <input
                      type="password"
                      className="form-control"
                      placeholder="New password"
                      name="password"
                      minLength={8}
                      required
                    />
                    <span className="glyphicon glyphicon-lock form-control-feedback"></span>
                  </div>
                  <div className="form-group has-feedback">
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Confirm new password"
                      name="passwordConfirmation"
                      minLength={8}
                      required
                    />
                    <span className="glyphicon glyphicon-lock form-control-feedback"></span>
                  </div>
                  <div className="row">
                    <div className="col-xs-12">
                      <button type="submit" className="btn btn-primary btn-block btn-flat">
                        Set New Password
                      </button>
                    </div>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
