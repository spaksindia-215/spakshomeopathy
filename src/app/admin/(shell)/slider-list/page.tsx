import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getAllAdminSliders } from '@/lib/demo/admin';

/**
 * `/admin/slider-list` — ported from `admin/slider-list.blade.php` (142
 * lines), `AdminController@SliderList`.
 *
 * Sliders table is confirmed ZERO REAL PRODUCTION ROWS (P-18,
 * `schemas/slider.ts`'s own header: "maintained by admin but unused by
 * the homepage... zero rows in production today"). This list renders
 * honestly empty here, matching that real state — not padded with
 * invented rows. No sidebar nav entry exists for this module either
 * (same P-18 disconnect), not reproduced with an added link.
 *
 * PRESERVED DEFECTS (same pattern as `blog-list`):
 *   - Status prints raw lowercase `"active"` / capitalized `"Inactive"`
 *     text, no badge styling.
 *   - Delete link has no confirm() dialog.
 *   - LIVE `.DataTable()` init with the same dead `#example1` orphaned
 *     call.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Slider List',
};

export default function AdminSliderListPage() {
  const sliders = getAllAdminSliders();

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css"
      />

      <section className="content-header">
        <h1>Slider List</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Slider List</li>
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
                      <th>S.No</th>
                      <th>Slider</th>
                      <th>Image</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sliders.map((slider, i) => (
                      <tr key={slider.legacyId}>
                        <td>{i + 1}</td>
                        <td>{slider.sliderTitle}</td>
                        <td>
                          <img
                            src={`/uploaded_files/slider/${slider.sliderImage}`}
                            height={80}
                            width={80}
                            alt=""
                          />
                        </td>
                        <td>{slider.sliderStatus === 1 ? 'active' : 'Inactive'}</td>
                        <td>
                          <Link href={`/admin/edit-slider/${slider.legacyId}`}>
                            <i className="fa fa-pencil"></i>
                          </Link>
                          &nbsp;&nbsp;&nbsp;&nbsp;
                          <a href={`/admin/destroy-slider/${slider.legacyId}`}>
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
