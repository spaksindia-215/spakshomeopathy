import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { CKEditorPlaceholder } from '@/components/admin/CKEditorPlaceholder';
import { getAllProducts } from '@/lib/demo';
import { getDb } from '@/lib/mongodb/client';
import { CategoryRepository } from '@/lib/mongodb/repositories/categoryRepository';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/add-post` — ported from `admin/add-post.blade.php` (393 lines),
 * `AdminController@AddPost` (GET) / `SavePost` (POST, to `admin/save-post`).
 *
 * P-04 (confirmed directly this session, `AdminController@AddPost` line
 * 844 + `SavePost` line 867): the Category `<select>` here is populated
 * from the `categories` table (`$getHomo`, a misleading variable name —
 * the REAL `tbl_homeopathy` query is commented out in source, line 843)
 * and its option VALUE is each category's `slug`, not its id — because
 * `SavePost` looks the category back up by `slug`. Category dropdown now
 * reads live `spaks_dev` (`CategoryRepository`, reused from the
 * categories sub-slice), matching source's own live query. Contrast with
 * `edit-post`, whose equivalent select uses `id` as the value (that page
 * looks the category up by id instead) — a genuine, confirmed asymmetry,
 * not normalized here.
 *
 * A SECOND, dead Category `<select>` exists earlier in source
 * (HTML-commented out, left column, using `$row->id` as its value) —
 * not reproduced; a comment is not visible markup.
 *
 * Product `<select>` uses each product's `p_slug` as its option value
 * (`getAllProducts()`, `option value={p.pSlug}`) — confirmed directly,
 * not the product's numeric id. DELIBERATELY STILL DEMO-FIXTURE-BACKED
 * THIS SLICE, disclosed asymmetry: source's `AddPost` also queries
 * `products` live, but products' own admin CRUD/read infrastructure is a
 * SEPARATE, not-yet-built M5-E entity — building a full live product
 * listing here would be scope creep into that entity, not a mechanical
 * extension of THIS slice. Flagged in
 * `docs/GATE-REPORT-M5-E-POSTS.md` rather than silently left
 * inconsistent with the category dropdown's own live-data switch.
 *
 * PRESERVED DEFECTS:
 *   - Bootstrap CSS loaded twice (same pattern as every Product/Category
 *     Add/Edit page).
 *   - Image field name is `p_pimage` here — DIFFERS from Edit's
 *     `post_image` (confirmed, source line 267 vs. `edit-post.blade.php`
 *     line 253). Preserved, not normalized.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Add Post',
};

export default async function AdminAddPostPage() {
  const db = await getDb();
  const categoryRepo = new CategoryRepository(db);
  const categories = await categoryRepo.findAllByNameAscending();
  const products = getAllProducts();
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
        <h1>Add Post</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Add Post</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <form method="post" action="/admin/save-post" encType="multipart/form-data">
            <input type="hidden" name="_token" value={csrfToken} />
            <div className="col-md-6">
              <div className="box box-success">
                <div className="box-header with-border">
                  <h3 className="box-title">Post Info</h3>
                </div>
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Post Title</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter Post Title"
                      name="post_title"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputPassword1"> Description</label>
                    <CKEditorPlaceholder name="post_desc" required />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="box box-info">
                <div className="box-header with-border">
                  <h3 className="box-title">Post Info</h3>
                </div>
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="exampleInputPassword1">Category</label>
                    <select
                      className="form-control"
                      name="post_homeopathy"
                      required
                      defaultValue=""
                    >
                      <option value="">--Select--</option>
                      {categories.map((c) => (
                        <option key={c.legacyId} value={c.slug ?? ''}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Image</label>
                    <input type="file" className="form-control" name="p_pimage" required />
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Product</label>
                    <select className="form-control" name="p_id" id="p_id" required defaultValue="">
                      <option value="">--Select--</option>
                      {products.map((p) => (
                        <option key={p.legacyId} value={p.pSlug ?? ''}>
                          {p.pHeading}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputPassword1">Status</label>
                    <select className="form-control" name="post_status" required defaultValue="">
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
