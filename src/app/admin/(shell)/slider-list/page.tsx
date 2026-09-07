import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { SliderRepository } from '@/lib/mongodb/repositories/sliderRepository';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/slider-list` — ported from `admin/slider-list.blade.php` (142
 * lines), `AdminController@SliderList`.
 *
 * M5-E: switched from `@/lib/demo/admin`'s static fixture to a live
 * `spaks_dev` read (`SliderRepository.findAllDescending`), now that the
 * write path (add/edit/delete) is real — avoids the "half-migrated:
 * writes succeed but the list view doesn't show them" trap
 * `docs/M5-PREFLIGHT-AUDIT.md` §5/§10 warned M5-E about, same reasoning
 * already applied to `pin-code-list` in the prior sub-slice. Success
 * flash now rendered too.
 *
 * P-18 (Preserved Defect, unaffected by this slice): sliders are
 * maintained by admin but never rendered on the homepage — this remains
 * true; nothing in this slice wires `sliders` into any public-facing
 * page. Production had ZERO rows as of this project's earlier analysis
 * (`schemas/slider.ts`'s header) — this list now renders whatever is
 * actually in `spaks_dev` (honestly, including zero, if that's still the
 * real count), rather than a frozen point-in-time fixture. No sidebar nav
 * entry exists for this module either (same P-18 disconnect), not
 * reproduced with an added link.
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

export default async function AdminSliderListPage() {
  const db = await getDb();
  const repo = new SliderRepository(db);
  const sliders = await repo.findAllDescending();
  const message = await readAndClearFlash('message');

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
          {message !== null && <div className="alert alert-success">{message}</div>}
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
