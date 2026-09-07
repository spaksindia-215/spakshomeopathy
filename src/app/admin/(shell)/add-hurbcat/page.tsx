import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/add-hurbcat` — ported from `admin/add-category.blade.php` (330
 * lines), `AdminController@AddHurbCat` (GET, note the route/method spelling
 * "hurbcat"/"HurbCat" — a genuine source typo for "herb category",
 * preserved in the route path itself, not just a view artifact) /
 * `Savecategory` (POST, to `admin/save-cat`).
 *
 * M5-E: form now POSTs for real (`src/app/admin/save-cat/route.ts`),
 * CSRF-token-wired, success flash rendered. Uploads validated per D-04/
 * FIX-003 (reused). Slug generated via source's FIRST algorithm
 * (`name-rand()`, NOT `convertToSlug`) — see `save-cat/route.ts`'s
 * header.
 *
 * FLAGSHIP PRESERVED MISLABELS, verified directly this session — this
 * page is visually "Add Category" but reads like a leftover copy of the
 * Product form in THREE separate places:
 *   - `<title>` says "Add Product" (source line 13) — NOT "Add Category".
 *   - The page `<h1>`/breadcrumb correctly say "Add Catogory" (own typo:
 *     missing the "e" in "Category" — preserved verbatim, not "fixed" to
 *     "Category").
 *   - The submit button says "Save Product" (source line 187), not
 *     "Save Category".
 *   - `CKEDITOR.replace('p_desc')` script fires unconditionally but this
 *     form has NO `p_desc` field at all — a dead/copy-pasted script,
 *     not reproduced via `CKEditorPlaceholder` (there's nothing here for
 *     it to bind to; see that component's own header for the same note).
 *   - Image field name is `c_image` here (differs from Edit Category's
 *     `image` — see that page's header).
 *   - The "Add More Images" repeater script is HTML-commented dead code
 *     (not reproduced); the "Add More Specification" repeater script is
 *     live JS but has no matching container/trigger anywhere on this
 *     page (same orphaned-script pattern as `add-product`) — not
 *     reproduced as a working control.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Add Product',
};

export default async function AdminAddHurbCatPage() {
  const csrfToken = generateCsrfToken();
  const message = await readAndClearFlash('message');

  return (
    <>
      <AdminStylesheets />
      {/* PRESERVED DEFECT: bootstrap.min.css loaded twice in source. */}
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/bootstrap/dist/css/bootstrap.min.css"
      />

      <section className="content-header">
        <h1>Add Catogory</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Add Catogory</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <form method="post" action="/admin/save-cat" encType="multipart/form-data">
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
                      required
                    />
                  </div>
                </div>

                <div className="input_fields_container">
                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Image</label>
                    <input type="file" className="form-control" name="c_image" />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="exampleInputEmail1">Types</label>
                  <select name="type" className="form-control">
                    <option value="">--select--</option>
                    <option value="H">Herbs</option>
                    <option value="N">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="exampleInputEmail1">Status</label>
                  <select name="status" className="form-control">
                    <option value="">--select--</option>
                    <option value="1">Active</option>
                    <option value="0">Inactive</option>
                  </select>
                </div>

                <div className="box-footer">
                  {/* PRESERVED MISLABEL: says "Save Product", not "Save Category" — see file header. */}
                  <button type="submit" className="btn btn-success">
                    Save Product
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
