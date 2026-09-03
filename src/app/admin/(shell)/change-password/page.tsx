import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';

/**
 * `/admin/change-password` — ported from `admin/change-password.blade.php`
 * (262 lines), `AdminController@ChangePassword` (GET) /
 * `AdminController@UpdatePassword` (POST, to `admin/update-password`).
 *
 * A GENUINELY SEPARATE FORM from `/admin/user-profile`'s embedded
 * "Change Password" tab — different field names (`oldpassword`/
 * `newpassword`/`password_confirmation`, no underscores, vs. the
 * profile tab's `old_password`/`new_password`/`confirm_password`),
 * different POST target (`admin/update-password` vs.
 * `admin/update-admin-password`), different controller method. Built as
 * two separate pages here too, per this page's own file header on
 * `user-profile/page.tsx`.
 *
 * PRESERVED DEFECTS, verified directly this session:
 *   - Breadcrumb reads "Dashboard" (not "Home", unlike every other admin
 *     page's breadcrumb) — a real inconsistency in source.
 *   - Both labels use dangling `for` attributes referencing nonexistent
 *     input ids (`exampleInputEmail1`, `exampleInputPassword1` — the
 *     latter reused twice, for both New Password and Confirm Password)
 *     — classic AdminLTE boilerplate leftover; the real `<input>`
 *     elements have no matching `id` at all. Reproduced as literal
 *     `htmlFor` values pointing at ids that don't exist on this page.
 *   - `autoComplete="off"` on the `<form>` itself (uncommon, preserved).
 *   - Submit button has no `name` attribute (unlike the profile page's
 *     `admBtn`/`passbtn` submit buttons).
 *   - Two flanking empty spacer columns (`col-md-3`) around the central
 *     `col-md-6` form column — preserved structurally.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Change Password',
};

export default function AdminChangePasswordPage() {
  return (
    <>
      <AdminStylesheets />

      <section className="content-header">
        <h1>Change Password</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Change Password</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          <div className="col-md-3"> </div>
          <div className="col-md-6">
            <div className="box box-success">
              <div className="box-header with-border">
                <h3 className="box-title">Change Password</h3>
              </div>
              <div className="box-body">
                <form autoComplete="off" method="post" action="/admin/update-password">
                  <div className="form-group">
                    {/* PRESERVED DEFECT: htmlFor references a nonexistent id — see file header. */}
                    <label htmlFor="exampleInputEmail1">Old Password</label>
                    <input
                      type="password"
                      name="oldpassword"
                      className="form-control"
                      placeholder="Enter Old Password"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputPassword1">New Password</label>
                    <input
                      type="password"
                      name="newpassword"
                      className="form-control"
                      placeholder="Enter New Password"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputPassword1">Confirm Password</label>
                    <input
                      type="password"
                      name="password_confirmation"
                      className="form-control"
                      placeholder="Enter Confirm Password"
                    />
                  </div>

                  <div className="form-group">
                    <button type="submit" className="btn btn-success">
                      Submit
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="col-md-3"> </div>
        </div>
      </section>
    </>
  );
}
