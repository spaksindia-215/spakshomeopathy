import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { isCosmeticsDbConfigured } from '@/lib/cosmetics/db/config';
import { readCosmeticsProductsFromDb } from '@/lib/cosmetics/db/service';

export const metadata: Metadata = {
  title: 'Admin Panel | Cosmetics List',
};

/**
 * `/admin/cosmetics-list` — Cosmetics CRUD feature. Lists every
 * admin-added Cosmetics product with Edit/Delete links, same layout
 * convention as `diseases-list`/`videos-list` (this codebase's other
 * genuinely-new list screens).
 */
export default async function AdminCosmeticsListPage() {
  const dbConfigured = isCosmeticsDbConfigured();
  const products = dbConfigured ? ((await readCosmeticsProductsFromDb()) ?? []) : [];

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css"
      />

      <section className="content-header">
        <h1>Cosmetics List</h1>
        <ol className="breadcrumb">
          <li>
            <a href="/admin/home">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Cosmetics List</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {!dbConfigured && (
            <div className="col-xs-12">
              <div className="alert alert-warning">
                No database is configured for Cosmetics admin-add — this list will always be empty
                until one is.
              </div>
            </div>
          )}
          <div className="col-xs-12">
            <div className="box">
              <div className="box-body">
                <table className="table table-bordered table-hover">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Image</th>
                      <th>Name</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product, i) => (
                      <tr key={product.legacyId}>
                        <td>{i + 1}</td>
                        <td>
                          {product.pBestimg && (
                            <img
                              src={`/uploaded_files/products/${product.pBestimg}`}
                              height={60}
                              width={60}
                              alt=""
                            />
                          )}
                        </td>
                        <td>{product.pName ?? product.pHeading}</td>
                        <td>{product.pPrice ?? '—'}</td>
                        <td>{product.pStatus === 1 ? 'Active' : 'Inactive'}</td>
                        <td>
                          <Link href={`/admin/edit-cosmetics/${product.legacyId}`}>
                            <i className="fa fa-pencil btn btn-info btn-sm"></i>
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && (
                      <tr>
                        <td colSpan={6}>No cosmetics products added yet.</td>
                      </tr>
                    )}
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
