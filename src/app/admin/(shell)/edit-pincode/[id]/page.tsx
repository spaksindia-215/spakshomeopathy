import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getAdminPinCodeByLegacyId } from '@/lib/demo/admin';

/**
 * `/admin/edit-pincode/[id]` — ported from `admin/edit-pincode.blade.php`
 * (155 lines), `AdminController@EditPinCode` (GET) / `UpdatePinCode`
 * (POST, to `admin/update-pincode`).
 *
 * DELIBERATE CONTRAST WITH `add-pin-code`: this page's equivalent Status
 * `<select>` is well-formed — `name="pin_status"` (source line 109, no
 * stray quote) — confirmed directly this session. Do NOT "fix" Add to
 * match Edit, or "break" Edit to match Add; both are reproduced exactly
 * as they independently exist in source.
 *
 * Same B-09 field-name caveat as `pin-code-list` applies to what this
 * form pre-fills from (`pincode`/`location`/`status`, the real column
 * names) — see that page's header for the full context.
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
  const pincode = Number.isFinite(legacyId) ? getAdminPinCodeByLegacyId(legacyId) : undefined;

  if (!pincode) {
    notFound();
  }

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
          <form method="post" action="/admin/update-pincode">
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
