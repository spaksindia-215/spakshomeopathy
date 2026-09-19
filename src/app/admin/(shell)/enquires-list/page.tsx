import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { getAdminEnquiriesView } from '@/lib/services/adminEnquiryService';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/enquires-list` — ported from `admin/enquires-list.blade.php`,
 * `AdminController@getEnquiry` (misspelling "Enquires" preserved
 * throughout — route, folder name, sidebar label).
 *
 * Reads live `enquiries` data via `getAdminEnquiriesView` (real
 * `EnquiryRepository`, not the fixture layer). Title/heading/breadcrumb
 * corrected to "Enquires List" and row numbering fixed to `i + 1` —
 * source's copy-paste "Product List" title and dead `$sno` counter were
 * genuine bugs, not behavior worth preserving into the production site.
 * The "Image" column is dropped: `enquiries` has no image field at all.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Enquires List',
};

export default async function AdminEnquiresListPage() {
  const db = await getDb();
  const enquiries = await getAdminEnquiriesView(db);
  const message = await readAndClearFlash('message');

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css"
      />

      <section className="content-header">
        <h1>Enquires List</h1>
        <ol className="breadcrumb">
          <li>
            <a href="/admin/home">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Enquires List</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <div className="col-xs-12">
            <div className="box">
              <div className="box-body">
                <table id="example2" className="table table-bordered table-hover">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Name</th>
                      <th>Email Id</th>
                      <th>Subject</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enquiries.map((enq, i) => (
                      <tr key={enq.legacyId}>
                        <td>{i + 1}</td>
                        <td>{enq.name}</td>
                        <td>{enq.email}</td>
                        <td>{enq.subject}</td>
                        <td>
                          <a href={`/admin/view-enquiry/${enq.legacyId}`}>
                            <i className="fa fa-eye"></i>
                          </a>
                          &nbsp;&nbsp;&nbsp;&nbsp;
                          <a href={`/admin/destroy-enquiry/${enq.legacyId}`}>
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
