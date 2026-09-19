import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { CKEditorPlaceholder } from '@/components/admin/CKEditorPlaceholder';
import { getProductByLegacyId } from '@/lib/demo';
import { getDb } from '@/lib/mongodb/client';
import { CategoryRepository } from '@/lib/mongodb/repositories/categoryRepository';
import type { VariantSlot } from '@/lib/mongodb/schemas';

/**
 * `/admin/edit-product/[id]` — ported from `admin/edit-product.blade.php`
 * (881 lines), `AdminController@EditProduct` (GET) / `UpdateProduct`
 * (POST, to `admin/update-product`).
 *
 * Category `<select>` sources from `categories` — same as `add-product`
 * — but ordered `name DESC` here vs. `name ASC` on Add (confirmed
 * directly this session, `AdminController@EditProduct` line 379 vs.
 * `AddProduct` line 205) — a genuine small inconsistency, preserved by
 * sorting the client-side copy descending on this page only, not
 * normalized to match Add.
 *
 * CR-006 Phase 4: switched to live `CategoryRepository.findAllByNameAscending()`
 * then re-sorted DESCENDING in application code — same fix as
 * `add-product`, same DESC-preservation reasoning as above; the product
 * itself (`getProductByLegacyId`) remains `@/lib/demo`-backed, unchanged,
 * per this phase's deliberately narrow scope (the dropdown only).
 *
 * FLAGSHIP PRESERVED BUG, verified directly this session (source lines
 * 492 and 530): the slot-9 and slot-10 "Product How to Use" textareas
 * are pre-filled from `$getPDetail->p_price9` / `p_price10` — the PRICE
 * fields, not `p_desc9`/`p_desc10` — a copy-paste bug. Reproduced below
 * by deliberately setting those two textareas' `defaultValue` from
 * `slot9.pPrice` / `slot10.pPrice`, NOT `slot9.pDesc` / `slot10.pDesc`.
 * Do not "fix" this to show the description.
 *
 * OTHER PRESERVED DEFECTS:
 *   - Slot 1's "Old Image" preview sources from a SEPARATE data path
 *     (`$getImgDetail`, the `product_images` table, i.e. this schema's
 *     `images[0]`) than slots 2-10's old-image previews (`$getPDetail->
 *     p_imageN`, i.e. `slotN.pImage`) — a genuine source asymmetry, not
 *     a typo. Reproduced with two different data sources below.
 *   - Every "Old Image" block ends with a bare `<img src="">` — a dead,
 *     always-broken second image tag with no source. Reproduced literally.
 *   - Two Bootstrap modals (`AddImg`, `AddSpecif`) have real POST targets
 *     (`admin/save-pimage`, `admin/save-pspecification`) but no visible
 *     trigger control anywhere in source — built as real modals (so
 *     their markup/behavior is inspectable) but with no button wired to
 *     open them, matching source exactly.
 *   - Bootstrap CSS loaded twice (see `add-product`'s identical note).
 *   - CKEditor bound only to `p_desc`, not the numbered "How to Use"
 *     textareas — same as `add-product`.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Edit Product',
};

export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const legacyId = Number(id);
  const product = Number.isFinite(legacyId) ? getProductByLegacyId(legacyId) : undefined;

  if (!product) {
    notFound();
  }

  // Ordered `name DESC` on this page only — see file header.
  const db = await getDb();
  const categories = (await new CategoryRepository(db).findAllByNameAscending()).sort((a, b) =>
    (b.name ?? '').localeCompare(a.name ?? '')
  );

  const slots: { n: number; slot: VariantSlot }[] = [
    { n: 2, slot: product.slot2 },
    { n: 3, slot: product.slot3 },
    { n: 4, slot: product.slot4 },
    { n: 5, slot: product.slot5 },
    { n: 6, slot: product.slot6 },
    { n: 7, slot: product.slot7 },
    { n: 8, slot: product.slot8 },
    { n: 9, slot: product.slot9 },
    { n: 10, slot: product.slot10 },
  ];

  const slot1OldImage = product.images[0]?.pImage ?? '';

  return (
    <>
      <AdminStylesheets />
      {/* PRESERVED DEFECT: bootstrap.min.css loaded twice in source. */}
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/bootstrap/dist/css/bootstrap.min.css"
      />

      <section className="content-header">
        <h1>Edit Product</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Edit Product</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          <form method="post" action="/admin/update-product" encType="multipart/form-data">
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
                      defaultValue={product.pHeading}
                      placeholder="Enter Product Heading"
                      required
                    />
                  </div>

                  <div className="input_fields_container">
                    <div className="form-group">
                      <label htmlFor="exampleInputEmail1">Old Image</label>
                      {/* PRESERVED: slot 1's old image comes from the SEPARATE
                          product_images record, not slotN.pImage. */}
                      <img
                        src={`/uploaded_files/products/${slot1OldImage}`}
                        style={{ height: '100px', width: '100px' }}
                        alt=""
                      />
                      <input
                        type="hidden"
                        className="form-control"
                        name="old_image"
                        value={slot1OldImage}
                      />
                      {/* PRESERVED DEFECT: dead trailing <img> with no src, present after every Old Image block in source. */}
                      <img src="" alt="" />
                    </div>
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
                      defaultValue={product.pName ?? ''}
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
                      defaultValue={product.pMrp ?? ''}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="exampleInputPassword1">Sell Price</label>
                    <input
                      type="number"
                      className="form-control"
                      name="p_price"
                      defaultValue={product.pPrice ?? ''}
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
                      defaultValue={product.pDesc1 ?? ''}
                    ></textarea>
                  </div>

                  {slots.map(({ n, slot }) => (
                    <div key={n}>
                      <div className="input_fields_container">
                        <div className="form-group">
                          <label htmlFor="exampleInputEmail1">Old Image {n}</label>
                          <img
                            src={`/uploaded_files/products/${slot.pImage ?? ''}`}
                            style={{ height: '100px', width: '100px' }}
                            alt=""
                          />
                          <input
                            type="hidden"
                            className="form-control"
                            name={`old_image${n}`}
                            value={slot.pImage ?? ''}
                          />
                          <img src="" alt="" />
                        </div>
                      </div>

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
                          placeholder={n === 2 ? 'Enter Name' : undefined}
                          defaultValue={slot.pName ?? ''}
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
                          defaultValue={slot.pMrp ?? ''}
                          placeholder={n <= 2 ? 'Enter MRP' : undefined}
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
                          defaultValue={slot.pPrice ?? ''}
                          placeholder={n <= 2 ? 'Enter Sell Price' : undefined}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="exampleInputPassword1">
                          Product How to Use{n === 5 ? '5' : ` ${n}`}
                        </label>
                        {/* FLAGSHIP PRESERVED BUG (n=9,10 only): pre-filled from
                            the PRICE field, not the description — see file header. */}
                        <textarea
                          className="form-control"
                          name={`p_desc${n}`}
                          placeholder={
                            n === 5
                              ? 'Enter Product How to Use5'
                              : n === 9
                                ? 'Enter Product How to Use 9'
                                : n === 10
                                  ? 'Enter Product How to Use 10'
                                  : undefined
                          }
                          defaultValue={
                            n === 9 || n === 10 ? String(slot.pPrice ?? '') : (slot.pDesc ?? '')
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
                    <select name="p_cat" className="form-control" defaultValue={product.pCat ?? ''}>
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
                    <CKEditorPlaceholder name="p_desc" defaultValue={product.pDesc ?? ''} />
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputPassword1">Product quantity</label>
                    <input
                      type="number"
                      className="form-control"
                      name="p_quantity"
                      placeholder="Enter quantity"
                      defaultValue={product.pQuantity ?? ''}
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
                      defaultValue={product.pRating ?? ''}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Status</label>
                    <select
                      name="p_status"
                      className="form-control"
                      defaultValue={product.pStatus ?? ''}
                    >
                      <option value="">--select--</option>
                      <option value="1">Active</option>
                      <option value="0">Inactive</option>
                    </select>
                  </div>

                  <div className="box-footer">
                    <input type="hidden" name="p_id" value={product.legacyId} />
                    <button type="submit" className="btn btn-success">
                      Update Product
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* Modal — no visible trigger in source; see file header. */}
      <div className="modal fade" id="AddImg" role="dialog">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <button type="button" className="close" data-dismiss="modal">
                &times;
              </button>
              <h4 className="modal-title">Add Image</h4>
            </div>
            <div className="modal-body">
              <form method="post" action="/admin/save-pimage" encType="multipart/form-data">
                <input type="file" className="form-control" name="p_pimage" />
                <br />
                <input type="hidden" name="p_id" value={product.legacyId} />
                <input
                  type="submit"
                  name="saveimg"
                  className="btn btn-success"
                  value="Save Image"
                />
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Modal — no visible trigger in source; see file header. */}
      <div className="modal fade" id="AddSpecif" role="dialog">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <button type="button" className="close" data-dismiss="modal">
                &times;
              </button>
              <h4 className="modal-title">Add Specification</h4>
            </div>
            <div className="modal-body">
              <form method="post" action="/admin/save-pspecification">
                <div className="form-group">
                  <label htmlFor="exampleInputPassword1">Heading</label>
                  <input
                    type="text"
                    className="form-control"
                    name="p_pheading"
                    placeholder="Enter Heading"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="exampleInputPassword1">Specification</label>
                  <input
                    type="text"
                    className="form-control"
                    name="p_pspecification"
                    placeholder="Enter Specification"
                  />
                </div>
                <br />
                <input type="hidden" name="p_id" value={product.legacyId} />
                <input
                  type="submit"
                  name="saveSpecif"
                  className="btn btn-success"
                  value="Save Specification"
                />
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
