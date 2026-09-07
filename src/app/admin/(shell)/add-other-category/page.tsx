import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { ProductCategoryRepository } from '@/lib/mongodb/repositories/categoryRepository';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { readAndClearFlash } from '@/lib/auth/flash';

const TOP_LEVEL = 1;

/**
 * `/admin/add-other-category` — ported from
 * `admin/add-other-category.blade.php`, `AdminController@AddOtherCategory`
 * (GET) / `SaveOtherCategory` (POST, to `admin/save-other-category`).
 *
 * ★★★ GENUINE, PREVIOUSLY-UNDOCUMENTED BROKEN CASCADING DROPDOWN —
 * REPRODUCED FAITHFULLY, NOT FIXED ★★★
 * -----------------------------------------------------------------------
 * The "Sub Category" `<select name="p_subcat">` starts as a single
 * `--Select--` placeholder (confirmed directly against source — no
 * server-rendered options at all) and is populated ONLY by client-side
 * AJAX (`jQuery.ajax({url: 'getsub-category/'+catID, ...})`) when the
 * "Main Category" select changes. That AJAX endpoint —
 * `GET getsub-category/{id}` → `SellerController@GetSubCat`
 * (`routes/admin.php:36`) — has NO CONTROLLER CLASS AT ALL
 * (`SellerController` does not exist anywhere in this codebase; already
 * catalogued as B-05, `docs/M5-PREFLIGHT-AUDIT.md` §1 finding 1).
 * **On real Laravel today, this means the AJAX call always fails and
 * `p_subcat` NEVER receives real options — every genuine "Other Category"
 * submission has `p_subcat=''`.**
 *
 * B-05 is explicitly OUT OF SCOPE for this sub-slice (owner's own scoping
 * decision, `docs/GATE-REPORT-M5-E-PRODUCT-CATEGORIES.md` §0) — this page
 * therefore does NOT build a working `getsub-category` endpoint or any
 * client-side cascading logic. The "Main Category" select is real (reads
 * live `spaks_dev` top-level categories, matching source's own
 * `$getCat` query); the "Sub Category" select is reproduced EXACTLY as
 * source renders it — a single, permanently-empty `--Select--` option,
 * with no JS wiring behind it — matching what a real visitor on
 * unpatched Laravel actually experiences.
 *
 * `p_cat` (Main Category) is READ by `SaveOtherCategory` but never used
 * for anything beyond an unused local variable assignment — confirmed
 * directly this slice. Reproduced: this page's Main Category select is
 * fully real and submits correctly, but the submitted value is dead on
 * arrival server-side too, exactly like source.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Add Other Category',
};

export default async function AdminAddOtherCategoryPage() {
  const db = await getDb();
  const repo = new ProductCategoryRepository(db);
  const categories = await repo.findByLevelDescending(TOP_LEVEL);
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
        <h1>Add Other Category</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Add Other Category</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <form method="post" action="/admin/save-other-category" encType="multipart/form-data">
            <input type="hidden" name="_token" value={csrfToken} />
            <div className="col-md-6">
              <div className="box box-success">
                <div className="box-header with-border">
                  <h3 className="box-title">Category Info</h3>
                </div>
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="exampleInputPassword1">Main Category</label>
                    <select className="form-control" name="p_cat" defaultValue="">
                      <option value="">--Select--</option>
                      {categories.map((c) => (
                        <option key={c.legacyId} value={c.legacyId}>
                          {c.catName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputPassword1">Sub Category</label>
                    {/* PRESERVED DEFECT — see file header. Permanently
                        empty in source; the AJAX endpoint that would
                        populate it (B-05) does not exist. Not wired. */}
                    <select className="form-control" name="p_subcat" defaultValue="">
                      <option value="">--Select--</option>
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
