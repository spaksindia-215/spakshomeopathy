import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { CKEditorPlaceholder } from '@/components/admin/CKEditorPlaceholder';
import { getDb } from '@/lib/mongodb/client';
import { CategoryRepository } from '@/lib/mongodb/repositories/categoryRepository';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { readAndClearFlash } from '@/lib/auth/flash';
import { requirePartnerSession } from '@/lib/auth/guard';

/**
 * `/partner/add-product` — Partner Panel feature. GENUINELY NEW. Renders
 * the SAME field set as `admin/(shell)/add-product/page.tsx` (identical
 * `name` attributes: `p_heading`, `p_image`, `p_name`, `p_mrp`, `p_price`,
 * `p_desc1`, per-slot `p_imageN`/`p_nameN`/`p_mrpN`/`p_priceN`/`p_descN`,
 * `p_cat`, `p_desc`, `p_quantity`, `p_rating`) — no new fields invented,
 * per the requirement's own instruction to reuse the existing product form
 * rather than inventing one. Posts to the SAME shared
 * `/admin/save-product` route handler the admin form uses; that handler
 * resolves the caller as admin-or-partner via `requireProductActor()` and
 * forces `pStatus=0` for a partner submission server-side regardless of
 * what this form would otherwise submit — so this page omits the Status
 * field entirely (there is nothing for a partner to choose: a submission
 * always starts pending admin approval).
 *
 * Category `<select>` sources from `CategoryRepository.findAllByNameAscending()`
 * — the same existing-categories-only list the admin form uses. Partners
 * cannot create or modify categories anywhere in this panel.
 *
 * Forced dynamic for the same reason as every other CSRF-token-bearing
 * page in this app.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Partner Panel | Add Product',
};

export default async function PartnerAddProductPage() {
  await requirePartnerSession();
  const db = await getDb();
  const categories = await new CategoryRepository(db).findAllByNameAscending();
  const csrfToken = generateCsrfToken();
  const message = await readAndClearFlash('message');

  return (
    <>
      <AdminStylesheets />

      <section className="content-header">
        <h1>Add Product</h1>
        <ol className="breadcrumb">
          <li>
            <a href="/partner/dashboard">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Add Product</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <div className="alert alert-info">
            Products you submit are reviewed by an admin before they appear on the public site.
          </div>
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
                    <label htmlFor="p_heading">Product Heading</label>
                    <input
                      type="text"
                      className="form-control"
                      id="p_heading"
                      name="p_heading"
                      placeholder="Enter Product Heading"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="p_image">Image</label>
                    <input type="file" className="form-control" id="p_image" name="p_image" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="p_name">Product Name</label>
                    <input
                      type="text"
                      className="form-control"
                      id="p_name"
                      name="p_name"
                      placeholder="Enter Name"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="p_mrp">Product MRP</label>
                    <input
                      type="number"
                      className="form-control"
                      id="p_mrp"
                      name="p_mrp"
                      placeholder="Enter MRP"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="p_price">Sell Price</label>
                    <input
                      type="number"
                      className="form-control"
                      id="p_price"
                      name="p_price"
                      placeholder="Enter Sell Price"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="p_desc1">Product How to Use</label>
                    <textarea
                      className="form-control"
                      id="p_desc1"
                      name="p_desc1"
                      placeholder="Enter Product How to Use"
                    ></textarea>
                  </div>

                  {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <div key={n}>
                      <div className="form-group">
                        <label htmlFor={`p_image${n}`}>Image {n}</label>
                        <input
                          type="file"
                          className="form-control"
                          id={`p_image${n}`}
                          name={`p_image${n}`}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor={`p_name${n}`}>Product {n} Name</label>
                        <input
                          type="text"
                          className="form-control"
                          id={`p_name${n}`}
                          name={`p_name${n}`}
                          placeholder="Enter Name"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor={`p_mrp${n}`}>Product MRP {n}</label>
                        <input
                          type="number"
                          className="form-control"
                          id={`p_mrp${n}`}
                          name={`p_mrp${n}`}
                          placeholder="Enter MRP"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor={`p_price${n}`}>Sell Price {n}</label>
                        <input
                          type="number"
                          className="form-control"
                          id={`p_price${n}`}
                          name={`p_price${n}`}
                          placeholder="Enter Sell Price"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor={`p_desc${n}`}>Product How to Use {n}</label>
                        <textarea
                          className="form-control"
                          id={`p_desc${n}`}
                          name={`p_desc${n}`}
                          placeholder={`Enter Product How to Use ${n}`}
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
                    <label htmlFor="p_cat">Category</label>
                    <select name="p_cat" id="p_cat" className="form-control">
                      <option value="">--select--</option>
                      {categories.map((c) => (
                        <option key={c.legacyId} value={c.legacyId}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="p_desc">Product Description</label>
                    <CKEditorPlaceholder name="p_desc" />
                  </div>

                  <div className="form-group">
                    <label htmlFor="p_quantity">Product quantity</label>
                    <input
                      type="number"
                      className="form-control"
                      id="p_quantity"
                      name="p_quantity"
                      placeholder="Enter quantity"
                      defaultValue={50}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="p_rating">Product Rating</label>
                    <input
                      type="number"
                      className="form-control"
                      id="p_rating"
                      name="p_rating"
                      placeholder="Enter Rating"
                      defaultValue={5}
                      required
                    />
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
