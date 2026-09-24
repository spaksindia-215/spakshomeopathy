import type { Metadata } from 'next';
import { generateCsrfToken } from '@/lib/auth/csrf';

/**
 * `/partner/login` — Partner Panel feature. GENUINELY NEW, no Laravel
 * source page to mirror. Structurally copies `src/app/admin/login/page.tsx`
 * (standalone AdminLTE login-box, same asset stack, CSRF token wired the
 * same way) since partners should visually match the admin panel's own
 * login screen. The only functional difference is the hidden `backuser`
 * field (`partner` instead of `admin`) and the form target
 * (`/partner/user-login`).
 *
 * Forced dynamic for the same reason as `admin/login/page.tsx`: a
 * statically-prerendered page would freeze `generateCsrfToken()`'s output
 * at build time.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Partner Panel | Log in',
};

export default function PartnerLoginPage() {
  const csrfToken = generateCsrfToken();
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
      <link rel="stylesheet" href="/admin-assets/plugins/iCheck/square/blue.css" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,400,600,700,300italic,400italic,600italic"
      />

      <div className="hold-transition login-page">
        <div className="login-box">
          <div className="login-logo">
            <a href="/partner/login">
              <b>Spaks</b>Homeopathy Partner
            </a>
          </div>
          <div className="login-box-body">
            <p className="login-box-msg">Sign in to your partner account</p>
            <form action="/partner/user-login" method="post">
              <input type="hidden" name="_token" value={csrfToken} />
              <div className="form-group has-feedback">
                <input type="email" className="form-control" placeholder="Email" name="email" />
                <span className="glyphicon glyphicon-envelope form-control-feedback"></span>
              </div>
              <div className="form-group has-feedback">
                <input
                  type="password"
                  className="form-control"
                  placeholder="Password"
                  name="password"
                />
                <span className="glyphicon glyphicon-lock form-control-feedback"></span>
              </div>
              <div className="row">
                <div className="col-xs-8"></div>
                <div className="col-xs-4">
                  <input type="hidden" name="backuser" value="partner" />
                  <button
                    type="submit"
                    name="partnerlgn"
                    className="btn btn-primary btn-block btn-flat"
                  >
                    Sign In
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        <script src="/admin-assets/bower_components/jquery/dist/jquery.min.js"></script>
        <script src="/admin-assets/bower_components/bootstrap/dist/js/bootstrap.min.js"></script>
      </div>
    </>
  );
}
