import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { getAdminEnquiryByLegacyId } from '@/lib/services/adminEnquiryService';

/**
 * `/admin/view-enquiry/[id]` — ported from `admin/view-enquiry.blade.php`,
 * `AdminController@ViewEnquiry`. Reads live `enquiries` data via
 * `getAdminEnquiryByLegacyId` (real `EnquiryRepository`, not the fixture
 * layer).
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
  const db = await getDb();
  const enquiry = Number.isFinite(legacyId) ? await getAdminEnquiryByLegacyId(db, legacyId) : null;

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
            <a href="/admin/home">
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
