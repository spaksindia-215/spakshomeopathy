import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getAllAdminPinCodes } from '@/lib/demo/admin';

/**
 * `/admin/pin-code-list` — ported from `admin/pin-code-list.blade.php`
 * (142 lines), `AdminController@PinCodeList`.
 *
 * B-09 / DR-03 (confirmed directly this session via `schemas/pinCode.ts`'s
 * own header, NOT a new finding): the real `pin_codes` table's columns
 * are `pincode`/`location`/`country`/`uid`/`status` (status is a
 * `varchar`, not numeric) — NOT `pin_code`/`pin_address`/`pin_status`
 * (int), which is what `PinCodeList`'s Blade view and every pincode
 * controller method actually reference. Reading the REAL table with the
 * BROKEN view's exact field names would produce blank/null cells for
 * every row in production. This page instead reads the schema's real
 * field names (`pincode`, `location`, `status`), which is the only way
 * to show the real 1 row's actual data — DR-03 remains unresolved
 * (whether new saves should be "fixed" or artificially reproduce the
 * SQL failure) and is NOT decided here; this is a read-only List view.
 *
 * FLAGSHIP PRESERVED MISLABEL (still applies regardless of the B-09
 * field-name substitution above): the header row says "Name" over what
 * is actually the pincode value — not the location/address. Preserved
 * verbatim; the column is NOT relabeled to "Pin Code" to match the data
 * it truly holds.
 *
 * Status column uses capitalized "Active"/"Inactive" (unlike Blog's
 * lowercase "active") — preserved with that exact casing; compared
 * against the string `'1'`/`'0'`, matching the real column's varchar type.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Pin Code List',
};

export default function AdminPinCodeListPage() {
  const pincodes = getAllAdminPinCodes();

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css"
      />

      <section className="content-header">
        <h1>Pin Code List</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Pin Code List</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          <div className="col-xs-12">
            <div className="box">
              <div className="box-body">
                <table id="example2" className="table table-bordered table-hover">
                  <thead>
                    <tr>
                      {/* PRESERVED MISLABEL: "Name" over the pincode value — see file header. */}
                      <th>Name</th>
                      <th>Pin Code</th>
                      <th>Address</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pincodes.map((pc, i) => (
                      <tr key={pc.legacyId}>
                        <td>{i + 1}</td>
                        <td>{pc.pincode}</td>
                        <td>{pc.location}</td>
                        <td>{pc.status === '1' ? 'Active' : 'Inactive'}</td>
                        <td>
                          <Link href={`/admin/edit-pincode/${pc.legacyId}`}>
                            <i className="fa fa-pencil"></i>
                          </Link>
                          &nbsp;&nbsp;&nbsp;&nbsp;
                          <a href={`/admin/destroy-pincode/${pc.legacyId}`}>
                            <i className="fa fa-trash"></i>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      <script src="/admin-assets/bower_components/datatables.net/js/jquery.dataTables.min.js"></script>
      <script src="/admin-assets/bower_components/datatables.net-bs/js/dataTables.bootstrap.min.js"></script>
      <script
        dangerouslySetInnerHTML={{
          __html: `
$(function () {
$('#example1').DataTable()
$('#example2').DataTable({
'paging'      : true,
'lengthChange': false,
'searching'   : false,
'ordering'    : true,
'info'        : true,
'autoWidth'   : false
})
})
`,
        }}
      />
    </>
  );
}
