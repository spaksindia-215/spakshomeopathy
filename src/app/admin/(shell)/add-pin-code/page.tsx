import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/add-pin-code` — ported from `admin/add-pin-code.blade.php`
 * (154 lines), `AdminController@AddPinCode` (GET) / `SavePinCode`
 * (POST, to `admin/save-pincode`).
 *
 * M5-E: form now POSTs for real (`src/app/admin/save-pincode/route.ts`),
 * CSRF-token-wired (source has `{{csrf_field()}}` on this form — verified
 * directly this slice), and the `session()->has('message')` success flash
 * is now rendered (was previously unwired — a real, if minor, gap this
 * slice closes since it's the exact page being touched anyway).
 *
 * THE FLAGSHIP PRESERVE-REAL-DEFECTS EXAMPLE OF THIS ENTIRE MIGRATION —
 * UPDATE (M5-E, owner decision, 2026-09-04): the Status `<select>`'s
 * corrupted `name="'pin_status"` attribute (a stray leading single-quote
 * INSIDE the attribute value — not a quoting artifact, genuinely part of
 * the string Laravel renders, source line 108) is now CORRECTED to
 * `name="pin_status"`, per the owner's explicit instruction accompanying
 * DR-03's resolution (Fix Register FIX-002, alongside FIX-001's B-09
 * resolution — see `docs/M3-OWNER-DECISION-RECORDS.md` DR-03 addendum and
 * `MIGRATION-CONTRACT.md` §9.3). Before this decision, this attribute was
 * this project's flagship example of a defect that must never be
 * "helpfully" fixed; it is corrected here ONLY because the owner
 * explicitly approved doing so as part of making pincode admin CRUD work
 * end-to-end (DR-03 Option 2) — this is not an engineer's unilateral
 * judgment call, and this comment intentionally preserves that history so
 * a future reader does not mistake this for an unauthorized "obvious bug"
 * fix (contract §10.2's prohibited-reasoning pattern). Prior to this
 * slice, correcting it would have violated F-17/NN-5; it does not now,
 * because it carries an explicit Fix Register entry.
 *
 * PRESERVED DEFECT: Bootstrap CSS loaded twice.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Add Pin Code',
};

export default async function AdminAddPinCodePage() {
  const csrfToken = generateCsrfToken();
  const message = await readAndClearFlash('message');

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
          {message !== null && <div className="alert alert-success">{message}</div>}
          <form method="post" action="/admin/save-pincode">
            <input type="hidden" name="_token" value={csrfToken} />
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
                    {/* M5-E: corrected per owner-approved Fix Register
                        entry FIX-002 — see file header. Was
                        name={"'pin_status"} (the flagship corrupted
                        attribute) before this slice. */}
                    <select className="form-control" name="pin_status" defaultValue="">
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
