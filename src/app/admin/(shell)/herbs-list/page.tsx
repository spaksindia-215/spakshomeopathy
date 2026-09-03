import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { HERB_PRODUCTS } from '@/lib/herbs/data/products';
import { getLeadVariant } from '@/lib/herbs/types';
import { readHerbProductsFromDb, isHerbsDbConfigured } from '@/lib/herbs/db';
import { DeleteHerbButton } from './DeleteHerbButton';

/**
 * `/admin/herbs-list` — Herbs Store admin product list (CR-003 §10.5/§17
 * of the original brief: "Admin should eventually be able to manage...
 * Reuse existing admin authentication"). Lives under `admin/(shell)/`
 * exactly like every other admin screen, so it automatically inherits
 * the real `requireAdminSession()` auth guard from that route group's
 * `layout.tsx` — no separate/duplicate admin authentication was added.
 *
 * DATA SOURCE (upgraded from the original static-only version):
 * always shows the static `HERB_PRODUCTS` seed catalogue, PLUS any
 * products saved to the `herbProducts` MongoDB collection via
 * `/admin/add-herb` — merged, with DB-backed rows labeled "Saved" and
 * seed rows labeled "Seed Data" so it's never ambiguous which is which.
 * If no database is configured (`isHerbsDbConfigured()` false — the
 * common case in a fresh clone or sandbox session), the DB read is
 * skipped entirely and only seed data shows, with an explicit notice —
 * never a silent failure.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Herbs List',
};

export default async function AdminHerbsListPage() {
  const dbConfigured = isHerbsDbConfigured();
  const dbProducts = dbConfigured ? await readHerbProductsFromDb() : null;
  const seedRows = HERB_PRODUCTS.map((h) => ({ ...h, source: 'seed' as const }));
  const dbRows = (dbProducts ?? []).map((h) => ({ ...h, source: 'db' as const }));
  const herbs = [...dbRows, ...seedRows];

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css"
      />

      <section className="content-header">
        <h1>Herbs List</h1>
        <ol className="breadcrumb">
          <li>
            <a href="/admin/home">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Herbs List</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          <div className="col-xs-12">
            <div className="box">
              <div className="box-header">
                <p style={{ margin: 0, fontSize: 12.5, color: '#888' }}>
                  {dbConfigured ? (
                    <>
                      {herbs.length} herb products — {dbRows.length} saved to the database,{' '}
                      {seedRows.length} from seed data. Add/Edit forms persist to the{' '}
                      <code>herbProducts</code> collection.
                    </>
                  ) : (
                    <>
                      {herbs.length} herb products (seed data only). No database is configured for
                      the Herbs Store (<code>MONGODB_URI</code>/<code>MONGODB_DB_NAME</code>/
                      <code>MONGODB_ENV</code> not set) — Add/Edit forms will not persist until one
                      is.
                    </>
                  )}
                </p>
              </div>
              <div className="box-body">
                <table className="table table-bordered table-hover">
                  <thead>
                    <tr>
                      <th style={{ width: '8%' }}>S.No</th>
                      <th style={{ width: '20%' }}>Name</th>
                      <th style={{ width: '12%' }}>Category</th>
                      <th style={{ width: '9%' }}>Price</th>
                      <th style={{ width: '8%' }}>Stock</th>
                      <th style={{ width: '13%' }}>Flags</th>
                      <th style={{ width: '9%' }}>Status</th>
                      <th style={{ width: '9%' }}>Source</th>
                      <th style={{ width: '12%' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {herbs.map((herb, i) => {
                      const lead = getLeadVariant(herb);
                      return (
                        <tr key={herb.id}>
                          <td>{i + 1}</td>
                          <td>{herb.name}</td>
                          <td>{herb.categoryLabel}</td>
                          <td>{lead ? `₹${lead.price}` : '—'}</td>
                          <td>{herb.stock}</td>
                          <td>
                            {herb.featured && <span className="label label-success">Featured</span>}{' '}
                            {herb.bestseller && (
                              <span className="label label-warning">Bestseller</span>
                            )}{' '}
                            {herb.newArrival && <span className="label label-info">New</span>}
                          </td>
                          <td>
                            {herb.status === 'active' && (
                              <span className="btn btn-success btn-xs">Active</span>
                            )}
                            {herb.status === 'out-of-stock' && (
                              <span className="btn btn-danger btn-xs">Out of Stock</span>
                            )}
                            {herb.status === 'draft' && (
                              <span className="btn btn-default btn-xs">Draft</span>
                            )}
                          </td>
                          <td>
                            {herb.source === 'db' ? (
                              <span className="label label-primary">Saved</span>
                            ) : (
                              <span className="label label-default">Seed Data</span>
                            )}
                          </td>
                          <td>
                            <Link href={`/admin/edit-herb/${herb.id}`}>
                              <i className="fa fa-pencil btn btn-info btn-sm"></i>
                            </Link>
                            &nbsp;&nbsp;
                            {herb.source === 'db' ? (
                              <DeleteHerbButton id={herb.id} name={herb.name} />
                            ) : (
                              <a
                                href="#"
                                className="demo-destroy-link"
                                title="Seed data cannot be deleted"
                              >
                                <i className="fa fa-trash btn btn-danger btn-sm"></i>
                              </a>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Seed-data destroy links only: these rows have no DB document to
          delete, so this stays a demo confirm()/alert(), same convention
          the legacy admin/product-list page's own destroy links use. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
document.querySelectorAll('.demo-destroy-link').forEach(function (el) {
  el.addEventListener('click', function (e) {
    e.preventDefault();
    window.alert('This row is seed data, not a saved database record — nothing to delete. Add a new herb via "Add Herb Product" to create a deletable, database-backed row.');
  });
});
`,
        }}
      />
    </>
  );
}
