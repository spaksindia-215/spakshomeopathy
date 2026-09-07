import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { CategoryRepository } from '@/lib/mongodb/repositories/categoryRepository';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/edit-category/[id]` — ported from `admin/edit-category.blade.php`
 * (333 lines), `AdminController@EditCategory` (GET) / `UpdateCategory`
 * (POST, to `admin/update-category`).
 *
 * Unlike `add-hurbcat`, THIS page's title/heading/button text are all
 * correctly labeled "Edit Category" — the mislabeling is specific to the
 * Add form, not a module-wide pattern. Confirmed directly this session.
 *
 * M5-E: switched from `@/lib/demo` to live `spaks_dev` read
 * (`CategoryRepository.findByLegacyId`), CSRF-token-wired, success flash
 * rendered.
 *
 * PRESERVED DEFECTS:
 *   - Image field name is `image` here — DIFFERS from Add's `c_image`
 *     (confirmed directly, source line 178). Do not normalize to match.
 *   - "Old Image" block ends with a dead trailing `<img src="">`, same
 *     pattern as `edit-product`.
 *   - `CKEDITOR.replace('p_desc')` fires unconditionally with no matching
 *     `p_desc` field on this page either — dead, not reproduced.
 *   - Bootstrap CSS loaded twice (same as every other product/category
 *     Add/Edit page).
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Edit Category',
};

export default async function AdminEditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const legacyId = Number(id);

  const db = await getDb();
  const repo = new CategoryRepository(db);
  const category = Number.isFinite(legacyId) ? await repo.findByLegacyId(legacyId) : null;

  if (!category) {
    notFound();
  }

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
        <h1>Edit Category</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Edit Category</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <form method="post" action="/admin/update-category" encType="multipart/form-data">
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
                      className="form-control"
                      name="name"
                      placeholder="Enter Name"
                      defaultValue={category.name ?? ''}
                      required
                    />
                  </div>

                  <div className="input_fields_container">
                    <div className="form-group">
                      <label htmlFor="exampleInputEmail1">Old Image</label>
                      <img
                        src={`/uploaded_files/categories/${category.image ?? ''}`}
                        style={{ height: '100px', width: '100px' }}
                        alt=""
                      />
                      <input
                        type="hidden"
                        className="form-control"
                        name="old_image"
                        value={category.image ?? ''}
                      />
                      <img src="" alt="" />
                    </div>
                  </div>

                  <div className="input_fields_container">
                    <div className="form-group">
                      <label htmlFor="exampleInputEmail1">Image</label>
                      <input type="file" className="form-control" name="image" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Type</label>
                    <select name="type" className="form-control" defaultValue={category.type}>
                      <option value="">--select--</option>
                      <option value="H">Herbs</option>
                      <option value="N">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Status</label>
                    <select
                      name="status"
                      className="form-control"
                      defaultValue={category.status ?? ''}
                    >
                      <option value="">--select--</option>
                      <option value="1">Active</option>
                      <option value="0">Inactive</option>
                    </select>
                  </div>

                  <div className="box-footer">
                    <input type="hidden" name="id" value={category.legacyId} />
                    <button type="submit" className="btn btn-success">
                      Update Category
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
