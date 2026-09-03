import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';

/**
 * `/admin/add-blog-category` — ported from `admin/add-blog-category.blade.php`
 * (145 lines), `AdminController@AddBlogCategory` (GET) /
 * `SaveBlogCategory` (POST, to `admin/save-blog-category`).
 *
 * PRESERVED DEFECT: Bootstrap CSS loaded twice, matching the module-wide
 * pattern.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Add Blog Category',
};

export default function AdminAddBlogCategoryPage() {
  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/bootstrap/dist/css/bootstrap.min.css"
      />

      <section className="content-header">
        <h1>Add Blog Category</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Add Blog Category</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          <form method="post" action="/admin/save-blog-category" encType="multipart/form-data">
            <div className="col-md-6">
              <div className="box box-success">
                <div className="box-header with-border">
                  <h3 className="box-title">Category Info</h3>
                </div>
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Category Name</label>
                    <input
                      type="text"
                      name="bcat_name"
                      className="form-control"
                      placeholder="Enter Name"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="box box-info">
                <div className="box-header with-border">
                  <h3 className="box-title">Category Info</h3>
                </div>
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Image</label>
                    <input type="file" name="bcat_image" className="form-control" />
                  </div>

                  <div className="box-footer">
                    <button type="submit" className="btn btn-success">
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
