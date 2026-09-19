import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { WELLNESS_CATEGORIES } from '@/lib/herbs/data/taxonomy';
import { readWellnessCategoriesFromDb, isHerbsDbConfigured } from '@/lib/herbs/db';
import { DeleteWellnessCategoryButton } from './DeleteWellnessCategoryButton';

/**
 * `/admin/wellness-categories` — Wellness Category admin list, CR-006
 * Phase 6 (`docs/CR-006-PHASE-6-PLAN.md`). GENUINELY NEW ADMIN SCREEN, NOT
 * A MIGRATION: no Laravel view to port (see `wellnessCategorySchema.ts`'s
 * header). Same merge-static-with-DB pattern as `/admin/herbs-list`: DB
 * rows are labeled "Saved", the static `WELLNESS_CATEGORIES` constant's
 * entries are labeled "Seed Data" and only shown when no database row
 * with the same `key` already exists (once the seed script runs, DB rows
 * take over and the static entries stop appearing here).
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Wellness Categories',
};

export default async function AdminWellnessCategoriesPage() {
  const dbConfigured = isHerbsDbConfigured();
  const dbCategories = dbConfigured ? await readWellnessCategoriesFromDb() : null;
  const dbRows = (dbCategories ?? []).map((c) => ({ ...c, source: 'db' as const }));
  const dbKeys = new Set(dbRows.map((c) => c.key));
  const seedRows = WELLNESS_CATEGORIES.filter((c) => !dbKeys.has(c.key)).map((c) => ({
    ...c,
    sortOrder: 0,
    status: 'active' as const,
    createdAt: '',
    updatedAt: '',
    source: 'seed' as const,
  }));
  const categories = [...dbRows, ...seedRows].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css"
      />

      <section className="content-header">
        <h1>Wellness Categories</h1>
        <ol className="breadcrumb">
          <li>
            <a href="/admin/home">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Wellness Categories</li>
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
                      {categories.length} wellness categories — {dbRows.length} saved to the
                      database, {seedRows.length} from seed data. Tags herbs on
                      &quot;/herbs/wellness&quot; and the herb add/edit forms.
                    </>
                  ) : (
                    <>
                      {categories.length} wellness categories (seed data only). No database is
                      configured for the Herbs Store — Add/Edit forms will not persist until one
                      is.
                    </>
                  )}
                </p>
              </div>
              <div className="box-body">
                <div style={{ marginBottom: 12 }}>
                  <Link href="/admin/add-wellness-category" className="btn btn-success btn-sm">
                    <i className="fa fa-plus"></i> Add Wellness Category
                  </Link>
                </div>
                <table className="table table-bordered table-hover">
                  <thead>
                    <tr>
                      <th style={{ width: '8%' }}>S.No</th>
                      <th style={{ width: '20%' }}>Label</th>
                      <th style={{ width: '15%' }}>Key</th>
                      <th style={{ width: '25%' }}>Description</th>
                      <th style={{ width: '9%' }}>Status</th>
                      <th style={{ width: '9%' }}>Source</th>
                      <th style={{ width: '14%' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((c, i) => (
                      <tr key={c.key}>
                        <td>{i + 1}</td>
                        <td>{c.label}</td>
                        <td>
                          <code>{c.key}</code>
                        </td>
                        <td>{c.description}</td>
                        <td>
                          {c.status === 'active' ? (
                            <span className="btn btn-success btn-xs">Active</span>
                          ) : (
                            <span className="btn btn-default btn-xs">Hidden</span>
                          )}
                        </td>
                        <td>
                          {c.source === 'db' ? (
                            <span className="label label-primary">Saved</span>
                          ) : (
                            <span className="label label-default">Seed Data</span>
                          )}
                        </td>
                        <td>
                          {c.source === 'db' ? (
                            <>
                              <Link href={`/admin/edit-wellness-category/${c.key}`}>
                                <i className="fa fa-pencil btn btn-info btn-sm"></i>
                              </Link>
                              &nbsp;&nbsp;
                              <DeleteWellnessCategoryButton label={c.label} wellKey={c.key} />
                            </>
                          ) : (
                            <a
                              href="#"
                              className="demo-destroy-link"
                              title="Seed data — not yet saved to the database"
                            >
                              <i className="fa fa-pencil btn btn-info btn-sm"></i>
                            </a>
                          )}
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

      <script
        dangerouslySetInnerHTML={{
          __html: `
document.querySelectorAll('.demo-destroy-link').forEach(function (el) {
  el.addEventListener('click', function (e) {
    e.preventDefault();
    window.alert('This row is seed data, not a saved database record. Use "Add Wellness Category" to create a manageable, database-backed row with this key.');
  });
});
`,
        }}
      />
    </>
  );
}
