import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { ProductCategoryRepository } from '@/lib/mongodb/repositories/categoryRepository';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/edit-product-category/[id]` — ported from
 * `admin/edit-product-category.blade.php`, `AdminController@EditProductCat`
 * (GET only — read the header below for why there is no corresponding
 * update handler).
 *
 * ★★★ GENUINE, PREVIOUSLY-UNDOCUMENTED BROKEN "EDIT" PAGE — REPRODUCED
 * FAITHFULLY, NOT FIXED ★★★
 * -----------------------------------------------------------------------
 * Verified directly this slice against BOTH the controller and the Blade
 * view:
 *   1. No `UpdateProductCategory` method exists anywhere in
 *      `AdminController.php` (confirmed by full-file grep this slice).
 *   2. No `update-product-category` route exists anywhere in
 *      `routes/admin.php` (confirmed by full-file grep this slice).
 *   3. `edit-product-category.blade.php`'s own `<form>` POSTs to
 *      `admin/save-product-category` — the SAME URL as `add-product-
 *      category.blade.php`'s form (source line 56 in both files).
 *   4. The Edit form carries NO hidden `id`/`legacyId` field of any kind
 *      (confirmed by full-file grep of `edit-product-category.blade.php`
 *      this slice — zero `<input type="hidden"` elements exist).
 *   5. `SavePost`-shaped `SaveProductCategory` ALWAYS does `$parent_id=0;
 *      $cat_level=1;` and a plain `insert()` — it has no `WHERE`/`update()`
 *      code path at all.
 *
 * CONSEQUENCE: pre-filling this form with the category's current name and
 * submitting it does NOT update that category. It silently INSERTS A
 * BRAND-NEW, DUPLICATE top-level category with the submitted name/image/
 * status, and the original row being "edited" is left completely
 * untouched. This is a severe, genuinely broken feature — not a cosmetic
 * defect — but it is Laravel's real, observable behavior today, verified
 * against source directly rather than assumed. It is reproduced exactly:
 * this page's form ALSO posts to `/admin/save-product-category` with no
 * hidden id field, so submitting it will, like source, create a
 * duplicate rather than update anything. NOT fixed, NOT given a
 * different (correct) action here — that would be exactly the kind of
 * silent "obvious bug, so I corrected it" reasoning contract §10.2
 * forbids. Flagged prominently here and in
 * `docs/GATE-REPORT-M5-E-PRODUCT-CATEGORIES.md` for the owner's
 * awareness — NOT registered as a new BROKEN-register item (B-#) or Fix
 * Register candidate by this session; that disposition is the owner's to
 * make, not defaulted here.
 *
 * The Status `<select>` ALSO has no `selected`/`defaultValue` binding to
 * the category's current status in source (confirmed, full-file grep) —
 * reproduced as an unbound `--Select--`-defaulted select, not silently
 * pre-selected to the real value.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Edit Product Category',
};

export default async function AdminEditProductCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const legacyId = Number(id);

  const db = await getDb();
  const repo = new ProductCategoryRepository(db);
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
        <h1>Edit Product Category</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Edit Product Category</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          {/* PRESERVED DEFECT (see file header): this form posts to
              /admin/save-product-category with NO hidden id field —
              submitting it creates a NEW duplicate category, it does
              NOT update this one. Reproduced exactly, not fixed. */}
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
                      defaultValue={category.catName}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputPassword1">Status</label>
                    {/* PRESERVED: no defaultValue binding in source either — see file header. */}
                    <select className="form-control" name="cat_status">
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
