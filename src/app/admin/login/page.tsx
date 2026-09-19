import type { Metadata } from 'next';
import { generateCsrfToken } from '@/lib/auth/csrf';

/**
 * `/admin/login` — ported from `admin/login.blade.php` (103 lines),
 * `AdminController@login`.
 *
 * OUTSIDE the `(shell)` route group deliberately — source has NO
 * sidebar/header/footer here (`<body class="hold-transition
 * login-page">`, a standalone AdminLTE login-box layout), unlike every
 * other admin page. This page's OWN asset stack differs from
 * `AdminStylesheets`/`AdminScripts`'s shared baseline: no Ionicons, no
 * `_all-skins.min.css` (not needed — no sidebar to skin), but ADDS
 * iCheck (checkbox styling). Confirmed by direct read this session —
 * built inline here rather than through the shared shell components.
 *
 * PRESERVED FROM SOURCE, VERBATIM, NOT ACTIVATED:
 *   - "Remember Me" checkbox has NO `name` attribute in source — it never
 *     submits a value. Reproduced identically (no `name` prop below).
 *   - Hidden `backuser=admin` field — harmless, kept as a static value.
 *   - Neither email nor password inputs have `required` in source.
 *
 * "I FORGOT MY PASSWORD" — NOW A LIVE, FUNCTIONAL LINK, NOT A MIGRATION:
 * source has this link but HTML-commented out
 * (`<!-- <a href="#">I forgot my password</a><br> -->`) and dead — no
 * working backend ever existed in Laravel either (see
 * `src/app/admin/forgot-password/page.tsx`'s own header). Added as a
 * genuinely new, working capability at the owner's explicit request
 * (2026-09-16) after the one real admin account's password was lost
 * with no database access available to reset it directly.
 *
 * M4 (2026-08-21, owner-authorized): the form now really authenticates
 * (`action="/admin/user-login"` → `src/app/admin/user-login/route.ts`,
 * the SAME `Auth\LoginController@UserLogin` logic the public /login form
 * uses, mirrored in `authService.login()`). A real admin session
 * (utype=1) is created on success.
 *
 * PRESERVED GAP, VERIFIED DIRECTLY AGAINST SOURCE, NOT A BUG INTRODUCED
 * HERE: `UserLogin` only ever flashes failures to the `message` session
 * key (`LoginController.php:65`/`:74`) — but `admin/login.blade.php`
 * (lines 33-37) only reads `Session::get('error')`, a DIFFERENT key
 * nothing in `UserLogin` ever sets. A failed admin login therefore shows
 * NO visible error on the real Laravel admin page either — this is a
 * genuine, pre-existing source defect (message flashed to a key the view
 * never reads), not something this port broke. Reproduced faithfully: no
 * flash message is rendered on this page, matching source's actual
 * (broken) behavior exactly. Contrast with the public `/login` and
 * `/register` pages, whose Blade views DO read `message`/`AuthMsg` and
 * therefore DO render it.
 *
 * DEMO BYPASS — NO LONGER EFFECTIVE (M4 route-guard slice, this session):
 * the "Enter Admin Panel (Demo)" link below still points at `/admin/home`,
 * but that route (and every other route under `admin/(shell)/`) is now
 * gated by `requireAdminSession()` in `admin/(shell)/layout.tsx` — a click
 * with no valid admin (utype=1) session is server-redirected straight
 * back to this page, exactly like every other protected admin route.
 * Left in place (not deleted) since removing a link is a UX change beyond
 * this slice's scope ("do not invent new UX"); it is simply no longer a
 * live bypass, only inert leftover markup from the demo-UI phase.
 *
 * M5-B: added the `_token` hidden field, wired to `csrf.ts` (source has
 * `@csrf` here — `admin/login.blade.php:51`, confirmed directly this
 * slice) — `admin/user-login/route.ts` now verifies it.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Log in',
};

export default function AdminLoginPage() {
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
            <a href="/admin/login">
              <b>Spaks</b>Homeopathy
            </a>
          </div>
          <div className="login-box-body">
            <p className="login-box-msg">Sign in to start your session</p>
            <form action="/admin/user-login" method="post">
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
                <div className="col-xs-8">
                  <div className="checkbox icheck">
                    <label>
                      <input type="checkbox" /> Remember Me
                    </label>
                  </div>
                </div>
                <div className="col-xs-4">
                  <input type="hidden" name="backuser" value="admin" />
                  <button
                    type="submit"
                    name="admlgn"
                    className="btn btn-primary btn-block btn-flat"
                  >
                    Sign In
                  </button>
                </div>
              </div>
            </form>

            <p style={{ marginTop: 10 }}>
              <a href="/admin/forgot-password">I forgot my password</a>
            </p>

            {/* DEMO ONLY — see file header. Not part of the real Laravel UI. */}
            <div
              style={{
                marginTop: '20px',
                paddingTop: '15px',
                borderTop: '1px dashed #d2d6de',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: '11px', color: '#999', marginBottom: '8px' }}>
                DEMO ONLY — requires a real admin session; route protection is now enforced
              </p>
              <a
                href="/admin/home"
                className="btn btn-default btn-block btn-flat"
                style={{ borderStyle: 'dashed' }}
              >
                Enter Admin Panel (Demo)
              </a>
            </div>
          </div>
        </div>

        <script src="/admin-assets/bower_components/jquery/dist/jquery.min.js"></script>
        <script src="/admin-assets/bower_components/bootstrap/dist/js/bootstrap.min.js"></script>
        <script src="/admin-assets/plugins/iCheck/icheck.min.js"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
$(function () {
  if (window.jQuery && $.fn.iCheck) {
    $('input').iCheck({
      checkboxClass: 'icheckbox_square-blue',
      radioClass: 'iradio_square-blue',
      increaseArea: '20%'
    });
  }
});
`,
          }}
        />
      </div>
    </>
  );
}
