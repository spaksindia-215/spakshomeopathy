import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getProductByLegacyId } from '@/lib/demo';
import { getDb } from '@/lib/mongodb/client';
import { ProductRepository } from '@/lib/mongodb/repositories/productRepository';

/**
 * `/admin/product-view/[id]` — ported from `admin/product-view.blade.php`
 * (233 lines), `AdminController@ViewProduct`. Read-only detail table.
 *
 * IMPORTANT CONFIRMED FINDING (verified directly this session,
 * `AdminController@ViewProduct` lines 699-707): Category/Sub Category
 * name lookups here resolve `p_cat`/`p_subcat` against the
 * `product_category` table — NOT `categories`, unlike `add-product`/
 * `edit-product`'s Category select (which explicitly queries
 * `categories`). This is the exact `p_cat` OVERLOADED MEANING documented
 * in `schemas/product.ts`'s file header, now seen concretely: the same
 * `p_cat` value means a different table depending which admin page reads
 * it. `product_category` is Phase 2 scope (the unlinked tree) — no
 * fixture exists for it this phase, so Category/Sub Category below
 * always render blank, honestly reflecting "this lookup has no Phase-1
 * data source," not a bug in this migration.
 *
 * A THIRD commented-out lookup exists in source too (`$OtherGetCat`
 * against `p_ocat`) — genuinely dead, never rendered even in the real
 * app; not reproduced at all.
 *
 * `product_features`/`product_variations` are explicitly NOT embedded in
 * `schemas/product.ts` (VESTIGIAL, DR-02 unresolved) — the "Product
 * Features" row always renders empty here, matching a real 0-row-join
 * outcome, not invented content.
 *
 * PRESERVED DEFECTS:
 *   - Status column is a dead-looking but REAL link in source
 *     (`admin/update-product-status/{id}`) — reproduced as an inert
 *     anchor (no real backend here), matching the "Deativate" typo from
 *     `product-list`.
 *   - Page script calls `$('#example1').DataTable()` — `#example1`
 *     does not exist anywhere on this page (only `#example2` does); a
 *     real orphaned/dead call in source. Reproduced literally as an
 *     inert extra call with no matching element.
 *   - LIVE `.DataTable()` init on `#example2`, with the exact source
 *     options (`paging:true, lengthChange:false, searching:false,
 *     ordering:true, info:true, autoWidth:false`) — unlike `product-list`/
 *     `cat-list`/`post-list`, which load the same libraries but never
 *     call `.DataTable()` at all.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Product View',
};

export default async function AdminProductViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const legacyId = Number(id);

  const db = await getDb();
  const repo = new ProductRepository(db);
  const product = Number.isFinite(legacyId)
    ? ((await repo.findByLegacyId(legacyId)) ?? getProductByLegacyId(legacyId))
    : undefined;

  if (!product) {
    notFound();
  }

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css"
      />

      <section className="content-header">
        <h1>Product View</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Product View</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          <div className="col-xs-12">
            <div className="box">
              <div className="box-body">
                <table id="example2" className="table table-bordered table-hover">
                  <tbody>
                    <tr>
                      <th style={{ width: '30%' }}>Category</th>
                      {/* Always blank — see file header (product_category lookup, Phase 2). */}
                      <td style={{ width: '70%' }}></td>
                    </tr>
                    <tr>
                      <th style={{ width: '30%' }}>Sub Category</th>
                      <td style={{ width: '70%' }}></td>
                    </tr>
                    <tr>
                      <th style={{ width: '30%' }}>Product Name</th>
                      <td style={{ width: '70%' }}>{product.pName}</td>
                    </tr>
                    <tr>
                      <th style={{ width: '30%' }}>Reference No</th>
                      <td style={{ width: '70%' }}>{product.reffNo ?? ''}</td>
                    </tr>
                    <tr>
                      <th>MRP</th>
                      <td>₹{product.pMrp}</td>
                    </tr>
                    <tr>
                      <th>Sell Price</th>
                      <td>₹{product.pPrice}</td>
                    </tr>
                    <tr>
                      <th>Stock</th>
                      <td>{product.pQuantity}</td>
                    </tr>
                    <tr>
                      <th>Short Desc</th>
                      <td>{(product.pDesc ?? '').replace(/<[^>]*>/g, '')}</td>
                    </tr>
                    <tr>
                      <th>Product Desc</th>
                      <td dangerouslySetInnerHTML={{ __html: product.pDesc ?? '' }} />
                    </tr>
                    <tr>
                      <th>HSN Code</th>
                      <td>{product.hsnCode ?? ''}</td>
                    </tr>
                    <tr>
                      <th>Shipping Time</th>
                      <td>{product.shippingTime ?? ''}</td>
                    </tr>
                    <tr>
                      <th>Search Terms</th>
                      <td>{product.searchTerms ?? ''}</td>
                    </tr>
                    <tr>
                      <th>Product Images</th>
                      <td>
                        {product.images.map((img, i) => (
                          <img
                            key={i}
                            src={`/uploaded_files/products/${img.pImage ?? ''}`}
                            style={{ height: '100px', width: '100px' }}
                            className="img-thumbnail"
                            alt=""
                          />
                        ))}
                      </td>
                    </tr>
                    <tr>
                      <th>Product Features</th>
                      {/* Always empty — product_features not embedded (VESTIGIAL, DR-02 unresolved). See file header. */}
                      <td></td>
                    </tr>
                    <tr>
                      <th>Product specifications</th>
                      <td>
                        {product.specifications.map((spec, i) => (
                          <span key={i}>
                            <b>{spec.pHeading}:</b> {spec.pSpecification} ,
                          </span>
                        ))}
                      </td>
                    </tr>
                    <tr>
                      <th>Video Link</th>
                      <td>{product.videoLink ?? ''}</td>
                    </tr>
                    <tr>
                      <th>Status</th>
                      <td>
                        {product.pStatus === 1 && (
                          <a
                            href={`/admin/update-product-status/${product.legacyId}`}
                            className="btn btn-danger"
                          >
                            Deativate
                          </a>
                        )}
                        {product.pStatus === 0 && (
                          <a
                            href={`/admin/update-product-status/${product.legacyId}`}
                            className="btn btn-success"
                          >
                            Active
                          </a>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      <script src="/admin-assets/bower_components/datatables.net/js/jquery.dataTables.min.js"></script>
      <script src="/admin-assets/bower_components/datatables.net-bs/js/dataTables.bootstrap.min.js"></script>
      {/* PRESERVED DEFECT: #example1 does not exist on this page — a real orphaned call in source. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
$(function () {
$('#example1').DataTable()
$('#example2').DataTable({
'paging'      : true,
'lengthChange': false,
'searching'   : false,
'ordering'    : true,
'info'        : true,
'autoWidth'   : false
})
})
`,
        }}
      />
    </>
  );
}
