import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { EnquiryRepository } from '@/lib/mongodb/repositories/enquiryRepository';
import { UserRepository } from '@/lib/mongodb/repositories/userRepository';
import { ProductRepository } from '@/lib/mongodb/repositories/productRepository';
import { OrderProductRepository } from '@/lib/mongodb/repositories/orderRepository';

/**
 * `/admin/home` — ported from `admin/index.blade.php` (199 lines), the
 * dashboard, `AdminController@index`.
 *
 * Real dynamic content: exactly 4 stat boxes, all backed by live counts.
 *   - `$CountEnq` → `enquiries` row count.
 *   - `$CountBuyer` → `users WHERE utype=3` count (real buyers).
 *   - `$CountProducts` → `products` row count.
 *   - `$CountOrders` → confirmed against source: counts `orderproducts`
 *     ROWS (line items), not distinct orders, despite the "Total Orders"
 *     label — a real semantic quirk in source, preserved here rather than
 *     "fixed" to count distinct orders.
 *
 * Below the 4 stat boxes, source's entire remaining dashboard content is
 * a HOLLOW EMPTY SHELL — one empty `box box-primary` with only comments,
 * no chart/table content — confirmed directly this session, despite
 * loading morris.js/jvectormap/sparkline/knob chart libraries in
 * `<head>`. NOT reproduced with invented chart content — the emptiness
 * itself is the faithful migration.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Dashboard',
};

export default async function AdminDashboardPage() {
  const db = await getDb();
  const [countEnq, countBuyer, countProducts, countOrders] = await Promise.all([
    new EnquiryRepository(db).count(),
    new UserRepository(db).count({ utype: 3 }),
    new ProductRepository(db).count(),
    new OrderProductRepository(db).count(),
  ]);

  return (
    <>
      <AdminStylesheets />
      <link rel="stylesheet" href="/admin-assets/bower_components/morris.js/morris.css" />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/jvectormap/jquery-jvectormap.css"
      />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/bootstrap-datepicker/dist/css/bootstrap-datepicker.min.css"
      />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/bootstrap-daterangepicker/daterangepicker.css"
      />
      <link
        rel="stylesheet"
        href="/admin-assets/plugins/bootstrap-wysihtml5/bootstrap3-wysihtml5.min.css"
      />

      <section className="content-header">
        <h1>
          Dashboard <small>Control panel</small>
        </h1>
        <ol className="breadcrumb">
          <li>
            <a href="/admin/home">
              <i className="fa fa-dashboard"></i> Home
            </a>
          </li>
          <li className="active">Dashboard</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          <div className="col-lg-3 col-xs-6">
            <div className="small-box bg-aqua">
              <div className="inner">
                <h3>{countEnq}</h3>
                <p>Total Enquiry</p>
              </div>
              <div className="icon">
                <i className="ion ion-bag"></i>
              </div>
              <a href="/admin/enquires-list" className="small-box-footer">
                More info <i className="fa fa-arrow-circle-right"></i>
              </a>
            </div>
          </div>

          <div className="col-lg-3 col-xs-6">
            <div className="small-box bg-green">
              <div className="inner">
                <h3>{countBuyer}</h3>
                <p>Total Buyer</p>
              </div>
              <div className="icon">
                <i className="ion ion-bag"></i>
              </div>
              <a href="/admin/manage-buyers" className="small-box-footer">
                More info <i className="fa fa-arrow-circle-right"></i>
              </a>
            </div>
          </div>

          <div className="col-lg-3 col-xs-6">
            <div className="small-box bg-yellow">
              <div className="inner">
                <h3>{countProducts}</h3>
                <p>Total Products</p>
              </div>
              <div className="icon">
                <i className="ion ion-person-add"></i>
              </div>
              <a href="/admin/product-list" className="small-box-footer">
                More info <i className="fa fa-arrow-circle-right"></i>
              </a>
            </div>
          </div>

          <div className="col-lg-3 col-xs-6">
            <div className="small-box bg-red">
              <div className="inner">
                <h3>{countOrders}</h3>
                <p>Total Orders</p>
              </div>
              <div className="icon">
                <i className="ion ion-person-add"></i>
              </div>
              <a href="/admin/order-list" className="small-box-footer">
                More info <i className="fa fa-arrow-circle-right"></i>
              </a>
            </div>
          </div>
        </div>

        <div className="row">
          <section className="col-lg-12 connectedSortable">
            <div className="box box-primary">
              {/* Intentionally empty — matches source exactly (index.blade.php's
                  own lower dashboard content is an empty box with no chart/table
                  content, despite loading chart libraries in <head>). */}
            </div>
          </section>
        </div>
      </section>
    </>
  );
}
