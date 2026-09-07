import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/add-slider` — ported from `admin/add-slider.blade.php` (165
 * lines), `AdminController@AddSlider` (GET) / `SaveSlider` (POST, to
 * `admin/save-slider`).
 *
 * M5-E: form now POSTs for real (`src/app/admin/save-slider/route.ts`),
 * CSRF-token-wired (source has `{{csrf_field()}}`), success flash
 * rendered. D-04 RESOLVED this slice (Fix Register FIX-003) — uploads are
 * now extension-whitelisted and filename-sanitized; see
 * `src/lib/uploads/adminUpload.ts`'s header for the full reasoning.
 *
 * PRESERVED DEFECT: Bootstrap CSS loaded twice, same as every other
 * Add/Edit page in this migration.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Add Slider',
};

export default async function AdminAddSliderPage() {
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
        <h1>Add Slider</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Add Slider</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <form method="post" action="/admin/save-slider" encType="multipart/form-data">
            <input type="hidden" name="_token" value={csrfToken} />
            <div className="col-md-6">
              <div className="box box-success">
                <div className="box-header with-border">
                  <h3 className="box-title">Slider Info</h3>
                </div>
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Slider Title</label>
                    <input
                      type="text"
                      name="slider_title"
                      className="form-control"
                      placeholder="Enter Slider Title"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputPassword1">Slider Subtitle</label>
                    <input
                      type="text"
                      name="slider_subtitle"
                      className="form-control"
                      placeholder="Enter Subtitle"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="box box-info">
                <div className="box-header with-border">
                  <h3 className="box-title">Slider Info</h3>
                </div>
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Image</label>
                    <input type="file" name="slider_image" className="form-control" required />
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputPassword1">Status</label>
                    <select className="form-control" name="slider_status" required defaultValue="">
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
