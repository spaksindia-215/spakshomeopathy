import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { requirePartnerSession } from '@/lib/auth/guard';
import { UserRepository } from '@/lib/mongodb/repositories/userRepository';
import { ProductRepository } from '@/lib/mongodb/repositories/productRepository';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/partner/dashboard` — Partner Panel feature. GENUINELY NEW. Simple,
 * focused landing page: the partner's own info, a count of their
 * submitted products, and a list linking each one — per the requirement's
 * "simple and focused... do not add unnecessary features" instruction.
 * Reuses the `AdminStylesheets`/box/box-header/box-body conventions so the
 * page visually matches the admin panel.
 */
export const metadata: Metadata = {
  title: 'Partner Panel | Dashboard',
};

export default async function PartnerDashboardPage() {
  const session = await requirePartnerSession();
  const db = await getDb();
  const user = await new UserRepository(db).findByLegacyId(session.userId);
  const products = await new ProductRepository(db).findByCreatedByUserId(session.userId);
  const message = await readAndClearFlash('message');

  return (
    <>
      <AdminStylesheets />

      <section className="content-header">
        <h1>Dashboard</h1>
        <ol className="breadcrumb">
          <li className="active">Dashboard</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}

          <div className="col-xs-12">
            <div className="box box-success">
              <div className="box-header with-border">
                <h3 className="box-title">Welcome, {user?.name ?? session.email}</h3>
              </div>
              <div className="box-body">
                <p>
                  You have submitted <strong>{products.length}</strong> product
                  {products.length === 1 ? '' : 's'}. Products you add require admin approval
                  before they appear publicly.
                </p>
                <Link href="/partner/add-product" className="btn btn-success">
                  <i className="fa fa-plus"></i> Add Product
                </Link>
              </div>
            </div>
          </div>

          <div className="col-xs-12">
            <div className="box">
              <div className="box-header with-border">
                <h3 className="box-title">Your Products</h3>
              </div>
              <div className="box-body">
                <table className="table table-bordered table-hover">
                  <thead>
                    <tr>
                      <th style={{ width: '10%' }}>S.No</th>
                      <th style={{ width: '40%' }}>Title</th>
                      <th style={{ width: '15%' }}>Price</th>
                      <th style={{ width: '35%' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product, i) => (
                      <tr key={product.legacyId}>
                        <td>{i + 1}</td>
                        <td>{product.pName ?? product.pHeading}</td>
                        <td>₹{product.pPrice}</td>
                        <td>
                          {product.pStatus === 1 ? (
                            <span className="label label-success">
                              Active (visible publicly)
                            </span>
                          ) : (
                            <span className="label label-warning">
                              Pending admin approval
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center">
                          You have not submitted any products yet.
                        </td>
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
