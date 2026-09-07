import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { ProductCategoryRepository } from '@/lib/mongodb/repositories/categoryRepository';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/add-product-subcategory` — ported from
 * `admin/add-product-subcategory.blade.php`,
 * `AdminController@AddProductSubCategory` (GET) / `SaveProductSubCat`
 * (POST, to `admin/save-product-subcat`).
 *
 * Parent-category dropdown reads live `spaks_dev`
 * (`ProductCategoryRepository.findTopLevel` — `where('parent_id','=','0')`,
 * matching source's `AddProductSubCategory` exactly).
 *
 * NO destroy, no edit/update route exists anywhere for sub-categories
 * (confirmed by full-file grep of `routes/admin.php` this slice) — only
 * Add+Save+List. `product-subcategory-list.blade.php`'s own edit link
 * points to `edit-product-subcat/{id}`, which has NO route registration
 * anywhere — a genuine, previously-undocumented dead link, distinct from
 * B-05/B-18 (flagged in that list page's own header, not reproduced as
 * anything other than a plain, non-functional href).
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Add Product Sub Category',
};

export default async function AdminAddProductSubcategoryPage() {
  const db = await getDb();
  const repo = new ProductCategoryRepository(db);
  const categories = await repo.findTopLevel();
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
        <h1>Add Product Sub Category</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Add Product Sub Category</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <form method="post" action="/admin/save-product-subcat" encType="multipart/form-data">
            <input type="hidden" name="_token" value={csrfToken} />
            <div className="col-md-6">
              <div className="box box-success">
                <div className="box-header with-border">
                  <h3 className="box-title">Category Info</h3>
                </div>
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="exampleInputPassword1">Parent Category</label>
                    <select className="form-control" name="parent_id" defaultValue="">
                      <option value="">--Select--</option>
                      {categories.map((c) => (
                        <option key={c.legacyId} value={c.legacyId}>
                          {c.catName}
                        </option>
                      ))}
                    </select>
                  </div>

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
