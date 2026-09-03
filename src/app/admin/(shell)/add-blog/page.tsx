import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { CKEditorPlaceholder } from '@/components/admin/CKEditorPlaceholder';
import { getAllBlogCategories } from '@/lib/demo';

/**
 * `/admin/add-blog` — ported from `admin/add-blog.blade.php` (182
 * lines), `AdminController@AddBlog` (GET) / `SaveBlog` (POST, to
 * `admin/save-blog`).
 *
 * PRESERVED DEFECTS: Bootstrap CSS loaded twice (same pattern as every
 * other Add/Edit page in this migration).
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Add Blog',
};

export default function AdminAddBlogPage() {
  const categories = getAllBlogCategories();

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/bootstrap/dist/css/bootstrap.min.css"
      />

      <section className="content-header">
        <h1>Add Blog</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Add Blog</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          <form method="post" action="/admin/save-blog" encType="multipart/form-data">
            <div className="col-md-6">
              <div className="box box-success">
                <div className="box-header with-border">
                  <h3 className="box-title">Blog Info</h3>
                </div>
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Blog Title</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter Blog Title"
                      name="blog_title"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputPassword1"> Description</label>
                    <CKEditorPlaceholder name="blog_desc" required />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="box box-info">
                <div className="box-header with-border">
                  <h3 className="box-title">Blog Info</h3>
                </div>
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="exampleInputPassword1">Blog Category</label>
                    <select className="form-control" name="blog_catid" required defaultValue="">
                      <option value="">--Select--</option>
                      {categories.map((c) => (
                        <option key={c.legacyId} value={c.legacyId}>
                          {c.bcatName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Image</label>
                    <input type="file" className="form-control" name="blog_image" required />
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Author</label>
                    <input type="text" className="form-control" name="blog_author" required />
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputPassword1">Status</label>
                    <select className="form-control" name="blog_status" required defaultValue="">
                      <option value="">--Select--</option>
                      <option value="1">Active</option>
                      <option value="0">Inactive</option>
                    </select>
                  </div>

                  <div className="box-footer">
                    <button type="submit" className="btn btn-success">
                      Save
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
