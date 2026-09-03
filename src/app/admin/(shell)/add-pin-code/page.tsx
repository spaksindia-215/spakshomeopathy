import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';

/**
 * `/admin/add-pin-code` — ported from `admin/add-pin-code.blade.php`
 * (154 lines), `AdminController@AddPinCode` (GET) / `SavePinCode`
 * (POST, to `admin/save-pincode`).
 *
 * THE FLAGSHIP PRESERVE-REAL-DEFECTS EXAMPLE OF THIS ENTIRE MIGRATION,
 * re-verified directly this session at source line 108: the Status
 * `<select>`'s `name` attribute literally reads
 * `name="'pin_status"` — a stray leading single-quote INSIDE the
 * attribute value itself (not a quoting/escaping artifact of the Blade
 * template — the character is genuinely part of the string Laravel
 * renders into the HTML). Because of B-09 (see `pin-code-list`'s header:
 * the real `pin_codes` table doesn't even have a `pin_status` column),
 * this field was never going to save correctly regardless — but the
 * corrupted attribute name is a SEPARATE, independently real defect on
 * top of that, and is reproduced byte-for-byte below via a literal
 * `name="'pin_status"` string, NOT `name="pin_status"`. Do not "fix"
 * this — it is the single most load-bearing example this migration's
 * fidelity discipline exists to protect.
 *
 * PRESERVED DEFECT: Bootstrap CSS loaded twice.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Add Pin Code',
};

export default function AdminAddPinCodePage() {
  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/bootstrap/dist/css/bootstrap.min.css"
      />

      <section className="content-header">
        <h1>Add Pin Code</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Add Pin Code</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          <form method="post" action="/admin/save-pincode">
            <div className="col-md-6">
              <div className="box box-success">
                <div className="box-header with-border">
                  <h3 className="box-title">Pin Code Info</h3>
                </div>
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Pin Code</label>
                    <input
                      type="text"
                      name="pin_code"
                      className="form-control"
                      placeholder="Enter Pin Code"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputPassword1">Address</label>
                    <input
                      type="text"
                      name="pin_address"
                      className="form-control"
                      placeholder="Enter Address"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="box box-info">
                <div className="box-header with-border">
                  <h3 className="box-title">Pin Code Info</h3>
                </div>
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="exampleInputPassword1">Status</label>
                    {/* FLAGSHIP PRESERVED DEFECT — see file header. Literal
                        corrupted attribute value, not a typo in this file. */}
                    <select className="form-control" name={"'pin_status"} defaultValue="">
                      <option value="">--Select--</option>
                      <option value="1">Active</option>
                      <option value="0">Inactive</option>
                    </select>
                  </div>

                  <div className="box-footer">
                    <button type="submit" name="submit" className="btn btn-success">
                      Submit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
