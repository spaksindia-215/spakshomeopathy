import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';

/**
 * `/admin/add-slider` — ported from `admin/add-slider.blade.php` (165
 * lines), `AdminController@AddSlider` (GET) / `SaveSlider` (POST, to
 * `admin/save-slider`).
 *
 * PRESERVED DEFECT: Bootstrap CSS loaded twice, same as every other
 * Add/Edit page in this migration.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Add Slider',
};

export default function AdminAddSliderPage() {
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
          <form method="post" action="/admin/save-slider" encType="multipart/form-data">
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
