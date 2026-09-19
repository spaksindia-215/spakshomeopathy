import type { Metadata } from 'next';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/forgot-password` — GENUINELY NEW, no working Laravel backend
 * to port. The real `admin/login.blade.php` has an "I forgot my
 * password" link, but it's HTML-commented out and dead (see
 * `src/app/admin/login/page.tsx`'s own header) — this is a live,
 * functional replacement, not a migration.
 *
 * Same login-box visual shell as `/admin/login`, kept structurally
 * separate (its own page, not a mode toggle on the login page) so it
 * can be linked to/bookmarked/emailed on its own.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Forgot Password',
};

export default async function AdminForgotPasswordPage() {
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
            <p className="login-box-msg">
              Enter your admin email and we&apos;ll send you a link to reset your password.
            </p>
            {message !== null && <div className="alert alert-success">{message}</div>}
            <form action="/admin/send-password-reset" method="post">
              <input type="hidden" name="_token" value={csrfToken} />
              <div className="form-group has-feedback">
                <input
                  type="email"
                  className="form-control"
                  placeholder="Email"
                  name="email"
                  required
                />
                <span className="glyphicon glyphicon-envelope form-control-feedback"></span>
              </div>
              <div className="row">
                <div className="col-xs-12">
                  <button type="submit" className="btn btn-primary btn-block btn-flat">
                    Send Reset Link
                  </button>
                </div>
              </div>
            </form>
            <p style={{ marginTop: 15 }}>
              <a href="/admin/login">Back to login</a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
