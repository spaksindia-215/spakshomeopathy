import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { PinCodeRepository } from '@/lib/mongodb/repositories/pinCodeRepository';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/edit-pincode/[id]` — ported from `admin/edit-pincode.blade.php`
 * (155 lines), `AdminController@EditPinCode` (GET) / `UpdatePinCode`
 * (POST, to `admin/update-pincode`).
 *
 * DELIBERATE CONTRAST WITH `add-pin-code`: this page's equivalent Status
 * `<select>` is well-formed — `name="pin_status"` (source line 109, no
 * stray quote) — confirmed directly this session. This was ALREADY
 * correct before M5-E's Fix Register FIX-002 corrected Add's corrupted
 * attribute to match — Edit itself required no change here, both forms
 * simply converge on the same correct attribute name now, for two
 * different reasons (Edit: never broken; Add: explicitly fixed).
 *
 * M5-E: switched from `@/lib/demo/admin`'s static fixture to a live
 * `spaks_dev` read (`PinCodeRepository.findByLegacyId`), CSRF-token-wired
 * (source has `{{csrf_field()}}` on this form), and the
 * `session()->has('message')` success flash is now rendered (was
 * previously unwired). Same B-09/DR-03 field-name mapping as
 * `pin-code-list` (real columns `pincode`/`location`/`status` — see that
 * page's header for the full context; DR-03 itself is RESOLVED per
 * `pinCodeRepository.ts`'s header).
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Edit Pin Code',
};

export default async function AdminEditPinCodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const legacyId = Number(id);

  const db = await getDb();
  const repo = new PinCodeRepository(db);
  const pincode = Number.isFinite(legacyId) ? await repo.findByLegacyId(legacyId) : null;

  if (!pincode) {
    notFound();
  }

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
        <h1>Edit Pin Code</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Edit Pin Code</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <form method="post" action="/admin/update-pincode">
            <input type="hidden" name="_token" value={csrfToken} />
            <input type="hidden" name="pin_id" value={pincode.legacyId} />

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
                      defaultValue={pincode.pincode ?? ''}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputPassword1">Address</label>
                    <input
                      type="text"
                      name="pin_address"
                      className="form-control"
                      placeholder="Enter Address"
                      defaultValue={pincode.location ?? ''}
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
                    <select
                      className="form-control"
                      name="pin_status"
                      required
                      defaultValue={pincode.status ?? ''}
                    >
                      <option value="">--Select--</option>
                      <option value="1">Active</option>
                      <option value="0">Inactive</option>
                    </select>
                  </div>

                  <div className="box-footer">
                    <button type="submit" name="submit" className="btn btn-success">
                      Update
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
