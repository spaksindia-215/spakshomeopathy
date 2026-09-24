import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { ProductRepository } from '@/lib/mongodb/repositories/productRepository';
import { UserRepository } from '@/lib/mongodb/repositories/userRepository';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/product-list` — ported from `admin/product-list.blade.php`
 * (147 lines), `AdminController@ProductList`. Reads live `products` data
 * via `ProductRepository.findAll()` (real Mongo, not the fixture layer).
 *
 * Partner Panel feature: the Status column's badges now link to a REAL
 * toggle handler (`/admin/toggle-product-status/[id]/route.ts`, newly
 * built) instead of the previously dead `href="#"` — this is what lets an
 * admin activate a partner-submitted product (created with `pStatus=0`).
 * A "Partner" column was added showing whether `createdByUserId` is set,
 * so admins can distinguish partner submissions from their own.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Product List',
};

export default async function AdminProductListPage() {
  const db = await getDb();
  const repo = new ProductRepository(db);
  const products = await repo.findAll();
  const message = await readAndClearFlash('message');

  const partnerIds = [
    ...new Set(products.map((p) => p.createdByUserId).filter((id): id is number => id != null)),
  ];
  const partners = await new UserRepository(db).findByLegacyIds(partnerIds);
  const partnerNameById = new Map(partners.map((p) => [p.legacyId, p.name]));

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css"
      />

      <section className="content-header">
        <h1>Product List</h1>
        <ol className="breadcrumb">
          <li>
            <a href="/admin/home">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Product List</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <div className="col-xs-12">
            <div className="box">
              <div className="box-body">
                <table id="example2" className="table table-bordered table-hover">
                  <thead>
                    <tr>
                      <th style={{ width: '8%' }}>S.No</th>
                      <th style={{ width: '20%' }}>Title</th>
                      <th style={{ width: '10%' }}>Image</th>
                      <th style={{ width: '10%' }}>Price</th>
                      <th style={{ width: '8%' }}>Quantity</th>
                      <th style={{ width: '14%' }}>Partner</th>
                      <th style={{ width: '15%' }}>Status</th>
                      <th style={{ width: '15%' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product, i) => (
                      <tr key={product.legacyId}>
                        <td>{i + 1}</td>
                        <td>{product.pName}</td>
                        <td>
                          <img
                            src={`/uploaded_files/products/${product.pBestimg ?? ''}`}
                            style={{ height: '100px', width: '100px' }}
                            alt=""
                          />
                        </td>
                        <td>₹{product.pPrice}</td>
                        <td>{product.pQuantity}</td>
                        <td>
                          {product.createdByUserId != null ? (
                            <span className="label label-info">
                              {partnerNameById.get(product.createdByUserId) ?? 'Partner'}
                            </span>
                          ) : (
                            <em className="text-muted">Admin</em>
                          )}
                        </td>
                        <td>
                          {product.pStatus === 1 && (
                            <a
                              href={`/admin/toggle-product-status/${product.legacyId}`}
                              className="btn btn-success"
                            >
                              Active
                            </a>
                          )}
                          {product.pStatus !== 1 && (
                            <a
                              href={`/admin/toggle-product-status/${product.legacyId}`}
                              className="btn btn-danger"
                            >
                              Deativate
                            </a>
                          )}
                        </td>
                        <td>
                          <Link href={`/admin/edit-product/${product.legacyId}`}>
                            <i className="fa fa-pencil btn btn-info btn-sm"></i>
                          </Link>
                          &nbsp;&nbsp;&nbsp;&nbsp;
                          <a href={`/admin/destroy-product/${product.legacyId}`}>
                            <i className="fa fa-trash btn btn-danger btn-sm"></i>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
