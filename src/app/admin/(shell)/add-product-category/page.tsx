import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/add-product-category` — ported from
 * `admin/add-product-category.blade.php`, `AdminController@AddProductCategory`
 * (GET) / `SaveProductCategory` (POST, to `admin/save-product-category`).
 *
 * M5-E (product_category sub-slice, all 3 levels): form now POSTs for
 * real, CSRF-token-wired, success flash rendered. Uploads validated per
 * D-04/FIX-003 (reused). Slug via `convertToSlug` (same algorithm as blog
 * categories/blogs/posts).
 *
 * PRESERVED DEFECT: Bootstrap CSS loaded twice, same module-wide pattern.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Add Product Category',
};

export default async function AdminAddProductCategoryPage() {
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
        <h1>Add Product Category</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Add Product Category</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <form method="post" action="/admin/save-product-category" encType="multipart/form-data">
            <input type="hidden" name="_token" value={csrfToken} />
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
                      name="cat_name"
                      className="form-control"
                      placeholder="Enter Name"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputPassword1">Status</label>
                    <select className="form-control" name="cat_status" defaultValue="">
                      <option value="">--Select--</option>
                      <option value="1">Active</option>
                      <option value="0">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="box box-info">
                <div className="box-header with-border">
                  <h3 className="box-title">Product Category Info</h3>
                </div>
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Image</label>
                    <input type="file" name="cat_image" className="form-control" />
                  </div>

                  <div className="box-footer">
                    <button type="submit" name="submit" className="btn btn-success">
                      Save Category
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
