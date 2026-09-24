import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { CKEditorPlaceholder } from '@/components/admin/CKEditorPlaceholder';
import { getDb } from '@/lib/mongodb/client';
import { CategoryRepository } from '@/lib/mongodb/repositories/categoryRepository';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/add-product` — ported from `admin/add-product.blade.php` (730
 * lines), `AdminController@AddProduct` (GET) / `SaveProduct` (POST, to
 * `admin/save-product`).
 *
 * Category `<select>` sources from the `categories` table (`$getCat =
 * DB::table('categories')->OrderBy('name','ASC')->get()` — confirmed
 * directly this session in `AdminController@AddProduct`, line 205), NOT
 * a `product_category`/`tbl_homeopathy` table despite the field name
 * `p_cat` and this page's "Product" framing — the same misleadingly-named
 * pattern documented for Posts (P-04's sibling finding).
 *
 * CR-006 Phase 4: switched this ONE dropdown from `@/lib/demo`'s
 * `getAllCategories()` (a static, generated-at-build-time snapshot) to
 * live `CategoryRepository.findAllByNameAscending()` — the exact same
 * method/query `cat-list`/`add-post` already use for the identical
 * `name ASC`, no-type-filter read. This is a small, additive live-wiring
 * fix, NOT a rewrite of this page's own (still `@/lib/demo`-backed, still
 * out of this phase's scope) form submission or field set — see
 * `docs/CR-006-PHASE-4-PLAN.md` §1 for why the rest of this page's
 * write-path live-wiring is deliberately not touched here.
 *
 * 10 VARIANT SLOTS, individually named fields (matches `schemas/product.ts`'s
 * explicit F-20 "do not restructure into an array" contract) — slot 1 has
 * a distinct, larger field set (`p_heading`, `p_image`, `p_name`, `p_mrp`,
 * `p_price`, `p_desc1`) from slots 2-10 (`p_imageN`/`p_nameN`/`p_mrpN`/
 * `p_priceN`/`p_descN`). Reproduced as 10 explicit blocks, not a mapped
 * loop, matching source's own repetitive structure and making each slot's
 * field-name divergence visible rather than papered over by abstraction.
 *
 * PRESERVED DEFECTS, verified directly this session:
 *   - Bootstrap's own stylesheet `<link>` is loaded TWICE in source
 *     (lines 21 and 25, byte-identical duplicate) — reproduced as two
 *     literal `<link>` tags below, not de-duplicated.
 *   - A large first block of Product Name/MRP/Sell Price fields is
 *     HTML-commented out in source (lines 144-176) — genuinely dead,
 *     the SAME three fields reappear live just below with identical
 *     `name` attributes. Not reproduced at all (a comment isn't visible
 *     markup to migrate).
 *   - CKEditor 4.7.3 (`CKEDITOR.replace('p_desc')`) is bound ONLY to the
 *     bottom-of-form `p_desc` ("Product Description") field — the 10
 *     per-slot "How to Use" fields (`p_desc1`..`p_desc10`) are PLAIN
 *     `<textarea>`s, never CKEditor-bound, despite the similar naming.
 *     Only `p_desc` uses `CKEditorPlaceholder` below; `p_desc1..10` are
 *     ordinary textareas.
 *   - The "Add More Images" input-repeater script is entirely
 *     HTML-commented out in source (dead) — not reproduced. The
 *     "Add More Specification" repeater script (`add_more_button_spcf` /
 *     `.input_fields_container_spf`) IS live JS in source, but no
 *     `.input_fields_container_spf` element or trigger button actually
 *     exists anywhere in this page's visible markup — a real dead/orphaned
 *     script (matches the plan's "AddSpecif" modal-adjacent finding: the
 *     repeater's target container lives on a DIFFERENT admin page, not
 *     this one). Not reproduced as a functioning control here — there is
 *     nothing in source to click that would exercise it on this page.
 *   - Quantity defaults to `50`, Rating defaults to `5` — literal
 *     hardcoded `value` attributes in source, preserved as defaultValues.
 *   - Status `<select>` offers only blank/"Active"/"Inactive" — no
 *     "Draft" or other state; reproduced exactly.
 *
 * Partner Panel feature: this form now posts to a REAL handler
 * (`/admin/save-product/route.ts`, newly built — source was never ported)
 * instead of a nonexistent one, and carries a CSRF `_token` field the
 * handler requires (same pattern every other admin form POST uses).
 * Forced dynamic for the same reason as the login pages: a
 * statically-prerendered page would freeze `generateCsrfToken()`'s output
 * at build time.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin Panel | Add Product',
};

export default async function AdminAddProductPage() {
  const db = await getDb();
  const categories = await new CategoryRepository(db).findAllByNameAscending();
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
        <h1>Add Product</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Add Product</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <form method="post" action="/admin/save-product" encType="multipart/form-data">
            <input type="hidden" name="_token" value={csrfToken} />
            {/* left column */}
            <div className="col-md-6">
              <div className="box box-success">
                <div className="box-header with-border">
                  <h3 className="box-title">Product Info</h3>
                </div>
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Product Heading</label>
                    <input
                      type="text"
                      className="form-control"
                      name="p_heading"
                      placeholder="Enter Product Heading"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Image</label>
                    <input type="file" className="form-control" name="p_image" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Product Name</label>
                    <input
                      type="text"
                      className="form-control"
                      name="p_name"
                      placeholder="Enter Name"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="exampleInputPassword1">Product MRP</label>
                    <input
                      type="number"
                      className="form-control"
                      name="p_mrp"
                      placeholder="Enter MRP"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="exampleInputPassword1">Sell Price</label>
                    <input
                      type="number"
                      className="form-control"
                      name="p_price"
                      placeholder="Enter Sell Price"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="exampleInputPassword1">Product How to Use</label>
                    <textarea
                      className="form-control"
                      name="p_desc1"
                      placeholder="Enter Product How to Use"
                    ></textarea>
                  </div>

                  {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <div key={n}>
                      <div className="form-group">
                        <label htmlFor="exampleInputEmail1">Image {n}</label>
                        <input type="file" className="form-control" name={`p_image${n}`} />
                      </div>
                      <div className="form-group">
                        <label htmlFor="exampleInputEmail1">
                          Product{n === 2 ? '2' : ` ${n}`} Name
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name={`p_name${n}`}
                          placeholder="Enter Name"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="exampleInputPassword1">
                          {n === 2 ? 'Product2 MRP' : `Product MRP ${n}`}
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          name={`p_mrp${n}`}
                          placeholder="Enter MRP"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="exampleInputPassword1">
                          {n === 2 ? 'Sell2 Price' : `Sell Price ${n}`}
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          name={`p_price${n}`}
                          placeholder="Enter Sell Price"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="exampleInputPassword1">
                          Product How to Use{n === 5 ? '5' : ` ${n}`}
                        </label>
                        <textarea
                          className="form-control"
                          name={`p_desc${n}`}
                          placeholder={
                            n === 5 ? 'Enter Product How to Use5' : `Enter Product How to Use ${n}`
                          }
                        ></textarea>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* right column */}
            <div className="col-md-6">
              <div className="box box-info">
                <div className="box-header with-border">
                  <h3 className="box-title">Product Info</h3>
                </div>
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Category</label>
                    <select name="p_cat" className="form-control">
                      <option value="">--select--</option>
                      {categories.map((c) => (
                        <option key={c.legacyId} value={c.legacyId}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputPassword1">Product Description</label>
                    <CKEditorPlaceholder name="p_desc" />
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputPassword1">Product quantity</label>
                    <input
                      type="number"
                      className="form-control"
                      name="p_quantity"
                      placeholder="Enter quantity"
                      defaultValue={50}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputPassword1">Product Rating</label>
                    <input
                      type="number"
                      className="form-control"
                      name="p_rating"
                      placeholder="Enter Rating"
                      defaultValue={5}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Status</label>
                    <select name="p_status" className="form-control">
                      <option value="">--select--</option>
                      <option value="1">Active</option>
                      <option value="0">Inactive</option>
                    </select>
                  </div>

                  <div className="box-footer">
                    <button type="submit" className="btn btn-success">
                      Save Product
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
