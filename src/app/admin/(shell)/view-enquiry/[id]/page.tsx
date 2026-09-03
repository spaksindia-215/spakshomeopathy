import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getAdminEnquiryByLegacyId } from '@/lib/demo/admin';

/**
 * `/admin/view-enquiry/[id]` — ported from `admin/view-enquiry.blade.php`
 * (139 lines), `AdminController@ViewEnquiry`. Read-only detail table —
 * no defects found on this specific page (title/heading/breadcrumb are
 * all correctly labeled "View Enquiry", unlike its List sibling).
 *
 * `Date` row prints the raw `created_at` timestamp value directly
 * (`{{$getenqData->created_at}}`, no `date()`/format call in source) —
 * reproduced as a raw ISO-ish timestamp string, not reformatted to a
 * friendlier display.
 *
 * LIVE `.DataTable()` init (same options/dead `#example1` call as every
 * other List/View page with a live init in this module set) — present
 * even though this page's `#example2` table has no sortable/paginated
 * tabular data (just a fixed 5-row key/value layout); reproduced anyway
 * since source unconditionally includes it.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | View Enquiry',
};

export default async function AdminViewEnquiryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const legacyId = Number(id);
  const enquiry = Number.isFinite(legacyId) ? getAdminEnquiryByLegacyId(legacyId) : undefined;

  if (!enquiry) {
    notFound();
  }

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css"
      />

      <section className="content-header">
        <h1>View Enquiry</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">View Enquiry</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          <div className="col-xs-12">
            <div className="box">
              <div className="box-body">
                <table id="example2" className="table table-bordered table-hover">
                  <tbody>
                    <tr>
                      <th>Name</th>
                      <td>{enquiry.name}</td>
                    </tr>
                    <tr>
                      <th>Email Id</th>
                      <td>{enquiry.email}</td>
                    </tr>
                    <tr>
                      <th>Subject</th>
                      <td>{enquiry.subject}</td>
                    </tr>
                    <tr>
                      <th>Message</th>
                      <td>{enquiry.message}</td>
                    </tr>
                    <tr>
                      <th>Date</th>
                      <td>{enquiry.createdAt ? String(enquiry.createdAt) : ''}</td>
                    </tr>
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
