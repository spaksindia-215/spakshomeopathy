import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getAllProducts } from '@/lib/demo';
import { getAllAdminEnquiries } from '@/lib/demo/admin';

/**
 * `/admin/home` — ported from `admin/index.blade.php` (199 lines), the
 * dashboard, `AdminController@index`.
 *
 * Real dynamic content: exactly 4 stat boxes.
 *   - `$CountEnq` → `enquiries` row count. Demo shows the CURATED count
 *     (15), not the real production total (16,386) — matching this
 *     migration's own curation discipline throughout (the demo layer
 *     never claims to hold the full table).
 *   - `$CountBuyer` → `users WHERE utype=3` count (real buyers) — NOTE:
 *     the dashboard box itself is unambiguous ("Total Buyer"), unlike the
 *     `users-list` naming inversion documented elsewhere; this box is
 *     built correctly against buyer count semantics, no ambiguity here.
 *   - `$CountProducts` → `products` row count.
 *   - `$CountOrders` → confirmed this session: counts `orderproducts`
 *     ROWS (line items), not distinct orders, despite the "Total Orders"
 *     label — a real semantic quirk in source, not a migration artifact.
 *     Orders module is Phase 2 (deferred) — this box is NOT built this
 *     phase; see below.
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

export default function AdminDashboardPage() {
  const countEnq = getAllAdminEnquiries().length;
  const countBuyer = 818; // real production count of utype=3 users, per this session's direct dump check — see src/lib/demo/admin/users.ts's header for the utype=2/3 distinction
  const countProducts = getAllProducts().length;

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
            <a href="#">
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
                {/* Orders module is Phase 2 (deferred) — this box is real
                    in source (confirmed it actually counts orderproducts
                    ROWS, not distinct orders) but is left as an explicit
                    "not built yet" marker rather than a real number with
                    no module behind it to click into, or a fabricated
                    count. The link below still points at the real
                    `order-list` route path, which will 404/not-found
                    until Phase 2 builds it — that is itself an accurate
                    signal of this phase's boundary, not a broken link to
                    hide. */}
                <h3 title="Orders module deferred to Phase 2">N/A</h3>
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
