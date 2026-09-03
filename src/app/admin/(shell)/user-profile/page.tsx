import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDemoAdminUser } from '@/lib/demo/admin';

/**
 * `/admin/user-profile` — ported from `admin/profile.blade.php` (253
 * lines), the WORKING profile route (`UserController@UserProfile`).
 * NOTE: `GET /admin/profile` → `AdminController@AdminProfile` is a
 * SEPARATE, BROKEN route (B-03, no matching controller method exists at
 * all) — not this page, not built (see docs/ADMIN-DEMO-UI-MIGRATION-REPORT.md).
 *
 * CONFIRMED BUG, PRESERVED: source line 69 checks `$AdmUser->image!=""`,
 * but `UserController@UserProfile` (verified directly this session) only
 * ever passes `['getUser' => $getUser]` to this view — `$AdmUser` is
 * genuinely undefined, which Blade/PHP resolves to falsy at render time
 * (no crash, no exception surfaced to the browser). Reproduced below by
 * simply never taking that conditional's true-branch — the profile image
 * always falls through to the generic `user.png` avatar, exactly as
 * every real page load does in production. Do NOT wire a real
 * `$getUser.image` check here; that would "fix" a bug this migration
 * must preserve.
 *
 * TWO SEPARATE PASSWORD FORMS EXIST IN THIS APP — do not confuse this
 * page's embedded "Change Password" tab (fields `old_password`/
 * `new_password`/`confirm_password`, posts to
 * `admin/update-admin-password`) with the DIFFERENT standalone
 * `/admin/change-password` page (fields `oldpassword`/`newpassword`/
 * `password_confirmation`, posts to `admin/update-password`) — two
 * genuinely different forms/routes/controller methods in source, built
 * as two genuinely separate pages here too.
 *
 * PRESERVED BUG: the embedded Change Password tab's 3 password inputs
 * all carry `@error('title')` (copy-paste artifact, unrelated to any of
 * these 3 field names) — has no visible manifestation in a static demo
 * (server-side validation errors never render here either way), so
 * nothing to visually reproduce; noted for completeness only.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | User Profile',
};

export default function AdminUserProfilePage() {
  const user = getDemoAdminUser();

  return (
    <>
      <AdminStylesheets />
      <link rel="stylesheet" href="/admin-assets/bower_components/morris.js/morris.css" />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/jvectormap/jquery-jvectormap.css"
      />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/bootstrap-datepicker/dist/css/bootstrap-datepicker.min.css"
      />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/bootstrap-daterangepicker/daterangepicker.css"
      />
      <link
        rel="stylesheet"
        href="/admin-assets/plugins/bootstrap-wysihtml5/bootstrap3-wysihtml5.min.css"
      />

      <section className="content-header">
        <h1>User Profile</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Home
            </a>
          </li>
          <li className="active">User profile</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          <div className="col-md-3">
            <div className="box box-primary">
              <div className="box-body box-profile">
                {/* PRESERVED BUG — see file header: $AdmUser is undefined in
                    source, so this branch never taken; always the generic
                    avatar. */}
                <img
                  className="profile-user-img img-responsive img-circle"
                  src="/admin-assets/dist/img/user.png"
                  alt="User profile picture"
                />
                <h3 className="profile-username text-center">{user.name}</h3>
                <p className="text-muted text-center">Admin</p>
                <ul className="list-group list-group-unbordered">
                  <li className="list-group-item">
                    <b>Email Id: </b> <a className="pull-right">{user.email}</a>
                  </li>
                  <li className="list-group-item">
                    <b>Mobile No: </b> <a className="pull-right">{user.mobile}</a>
                  </li>
                  <li className="list-group-item">
                    <b>Role: </b> <a className="pull-right">Admin</a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="col-md-9">
            <div className="nav-tabs-custom">
              <ul className="nav nav-tabs">
                <li className="active">
                  <a href="#user_profile" data-toggle="tab">
                    Edit Profile
                  </a>
                </li>
                <li>
                  <a href="#change_password" data-toggle="tab">
                    Change Password
                  </a>
                </li>
              </ul>
              <div className="tab-content">
                <div className="active tab-pane" id="user_profile">
                  <form
                    className="form-horizontal"
                    method="post"
                    action="/admin/update-admin-profile"
                    encType="multipart/form-data"
                  >
                    <div className="form-group">
                      <label htmlFor="inputName" className="col-sm-2 control-label">
                        Name
                      </label>
                      <div className="col-sm-10">
                        <input
                          type="text"
                          name="name"
                          className="form-control"
                          placeholder="Name"
                          defaultValue={user.name}
                          required
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="inputEmail" className="col-sm-2 control-label">
                        Email
                      </label>
                      <div className="col-sm-10">
                        <input
                          type="email"
                          name="email"
                          className="form-control"
                          placeholder="Email"
                          defaultValue={user.email}
                          required
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="inputMobile" className="col-sm-2 control-label">
                        Mobile No
                      </label>
                      <div className="col-sm-10">
                        <input
                          type="text"
                          name="mobile"
                          className="form-control"
                          placeholder="Mobile No"
                          defaultValue={user.mobile ?? ''}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="inputImage" className="col-sm-2 control-label">
                        Profile Image
                      </label>
                      <div className="col-sm-10">
                        <input type="file" name="image" className="form-control" />
                      </div>
                    </div>
                    <div className="form-group">
                      <div className="col-sm-offset-2 col-sm-10">
                        <input type="hidden" name="user_id" value={user.legacyId} />
                        <input type="hidden" name="old_image" value={user.image ?? ''} />
                        <button type="submit" name="admBtn" className="btn btn-success">
                          Update
                        </button>
                      </div>
                    </div>
                  </form>
                </div>

                <div className="tab-pane" id="change_password">
                  <form
                    className="form-horizontal"
                    method="post"
                    action="/admin/update-admin-password"
                  >
                    <div className="form-group">
                      <label htmlFor="oldPassword" className="col-sm-3 control-label">
                        Old Password
                      </label>
                      <div className="col-sm-9">
                        <input
                          type="password"
                          className="form-control"
                          name="old_password"
                          placeholder="Old Password"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="newPassword" className="col-sm-3 control-label">
                        New Password
                      </label>
                      <div className="col-sm-9">
                        <input
                          type="password"
                          className="form-control"
                          name="new_password"
                          placeholder="New Password"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="confirmPassword" className="col-sm-3 control-label">
                        Confirm Password
                      </label>
                      <div className="col-sm-9">
                        <input
                          type="password"
                          className="form-control"
                          name="confirm_password"
                          placeholder="Confirm Password"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <div className="col-sm-offset-2 col-sm-10">
                        <input type="hidden" name="user_id" value={user.legacyId} />
                        <button type="submit" name="passbtn" className="btn btn-success">
                          Update
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
