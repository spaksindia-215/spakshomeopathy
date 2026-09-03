import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getAllAdminEnquiries } from '@/lib/demo/admin';

/**
 * `/admin/enquires-list` — ported from `admin/enquires-list.blade.php`
 * (142 lines), `AdminController@getEnquiry` (misspelling "Enquires"
 * preserved throughout — route, view filename, sidebar label).
 *
 * FLAGSHIP PRESERVED MISLABEL, confirmed directly this session: the
 * `<title>` (line 7), page `<h1>` (line 40), and breadcrumb active item
 * (line 44) ALL literally read "Product List" — a genuine copy-paste
 * artifact from `product-list.blade.php`. Reproduced verbatim below —
 * NOT "Enquires List" or "Enquiry List".
 *
 * FLAGSHIP PRESERVED S.NO BUG, confirmed directly this session: `$sno++`
 * sits AFTER `@endforeach` (source lines 86-89), OUTSIDE the loop that
 * prints it. `$sno` is initialized once to `1` before the loop and never
 * incremented during it — every single row prints S.No "1", regardless
 * of position. Reproduced by literally rendering `1` for every row
 * (NOT `.map((e, i) => i + 1)`, which would silently fix this bug).
 *
 * PRESERVED MISLABEL: header row is "Name, Email Id, Image, Subject,
 * Action" but the body never renders anything under "Image" — there is
 * no image column in the real `enquiries` table at all (confirmed via
 * `schemas/enquiry.ts`: 8 columns, none of them an image). The "Image"
 * `<th>` is reproduced with a permanently empty `<td>` beneath it,
 * exactly matching this real column-count mismatch. A SEPARATE
 * column-count mismatch also exists: the header row has only 5 `<th>`
 * cells, but each body row renders 6 `<td>` cells (the leading S.No
 * value has no header of its own at all) — reproduced structurally as-is.
 *
 * Curated to 15 of the real 16,386 rows (the large majority of which are
 * spam/bot submissions per `schemas/enquiry.ts`'s own header) — same
 * bounded-curation precedent as the public site's `posts` fixture.
 *
 * LIVE `.DataTable()` init with the same dead `#example1` orphaned call
 * pattern seen throughout this module set.
 */
export const metadata: Metadata = {
  // PRESERVED MISLABEL — see file header. Not "Enquires List".
  title: 'Admin Panel | Product List',
};

export default function AdminEnquiresListPage() {
  const enquiries = getAllAdminEnquiries();

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css"
      />

      <section className="content-header">
        {/* PRESERVED MISLABEL — see file header. */}
        <h1>Product List</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Product List</li>
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
                      <th>Name</th>
                      <th>Email Id</th>
                      <th>Image</th>
                      <th>Subject</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enquiries.map((enq) => (
                      <tr key={enq.legacyId}>
                        {/* FLAGSHIP PRESERVED BUG: every row shows "1" — see file header. */}
                        <td>1</td>
                        <td>{enq.name}</td>
                        <td>{enq.email}</td>
                        {/* PRESERVED MISLABEL: "Image" header, no image column in source. */}
                        <td></td>
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
