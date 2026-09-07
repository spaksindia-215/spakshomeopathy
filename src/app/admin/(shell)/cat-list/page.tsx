import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { CategoryRepository } from '@/lib/mongodb/repositories/categoryRepository';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/cat-list` — ported from `admin/category-list.blade.php` (301
 * lines — the sidebar's "Category List" link points here, but the real
 * Blade file is named `category-list.blade.php`, not `cat-list.blade.php`;
 * confirmed via `AdminController@CategorytList`, which renders
 * `view('admin.category-list', ...)`), `AdminController@CategorytList`
 * (route `cat-list`).
 *
 * M5-E: switched from `@/lib/demo` to live `spaks_dev` read
 * (`CategoryRepository.findAllDescending`), now that the write path is
 * real — avoids the half-migrated trap. Success flash now rendered too
 * (source has a `session()->has('message')` block, `category-list.blade.php:111`,
 * previously unwired — same gap already closed for pincode/slider/
 * blog-category).
 *
 * PAGINATION NOT IMPLEMENTED — DISCLOSED GAP, DIFFERENT FROM PRIOR
 * SUB-SLICES: source uses `paginate(20)` (`AdminController.php:645`).
 * Unlike pincode/slider/blog-category (all far below 20 real rows),
 * `categories` has ~23 real rows per `docs/M5-PREFLIGHT-AUDIT.md`'s own
 * count — meaning production pagination boundaries WOULD actually be
 * crossed (page 1 of 20, page 2 with the remaining ~3). This page
 * currently renders the FULL unpaginated list. Flagged explicitly in
 * `docs/GATE-REPORT-M5-E-CATEGORIES.md` as a genuine, currently-
 * unreproduced D5 (data-read/pagination) gap — not silently assumed
 * irrelevant the way it correctly was for the smaller-count entities.
 *
 * PRESERVED DEFECTS, verified directly this session:
 *   - Status IS a live toggle here (unlike `product-list`'s dead `href="#"`
 *     badges) — real links to `update-category-status-inactive/{id}` /
 *     `update-category-status-active/{id}`. Reproduced as real-looking
 *     but inert `<a>` tags (no backend to receive them this phase).
 *   - Delete action is HTML-commented out in source for this module only
 *     — Action column has ONLY an edit link, no delete control at all.
 *     Do not add one.
 *   - Double-`class` attribute bug on the edit `<i>` icon (same
 *     unavoidable JSX simplification as `product-list`'s identical bug).
 *   - `$sno++` sits correctly INSIDE the `@foreach` loop here — S.No
 *     increments correctly per row (this page does NOT have the
 *     `enquires-list` off-by-scope bug).
 *   - DataTables CSS/JS is loaded but no `.DataTable()` init call exists
 *     anywhere in source (confirmed empty `<!-- page script -->` with
 *     nothing following it) — reproduced as inert includes.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Category List',
};

export default async function AdminCatListPage() {
  const db = await getDb();
  const repo = new CategoryRepository(db);
  const categories = await repo.findAllDescending();
  const message = await readAndClearFlash('message');

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css"
      />

      <section className="content-header">
        <h1>Category List</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Category List</li>
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
                      <th style={{ width: '10%' }}>S.No</th>
                      <th style={{ width: '25%' }}>Name</th>
                      <th style={{ width: '10%' }}>Image</th>
                      <th style={{ width: '10%' }}>Type</th>
                      <th style={{ width: '20%' }}>Status</th>
                      <th style={{ width: '10%' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat, i) => (
                      <tr key={cat.legacyId}>
                        <td>{i + 1}</td>
                        <td>{cat.name}</td>
                        <td>
                          <img
                            src={`/uploaded_files/categories/${cat.image ?? ''}`}
                            style={{ height: '100px', width: '100px' }}
                            alt=""
                          />
                        </td>
                        <td>
                          {cat.type === 'H' && (
                            <a href="#" className="btn btn-success">
                              Herbs
                            </a>
                          )}
                          {cat.type === 'N' && (
                            <a href="#" className="btn btn-danger">
                              Other
                            </a>
                          )}
                        </td>
                        <td>
                          {cat.status === 1 && (
                            <a
                              href={`/admin/update-category-status-inactive/${cat.legacyId}`}
                              className="btn btn-success"
                            >
                              Active
                            </a>
                          )}
                          {cat.status === 0 && (
                            <a
                              href={`/admin/update-category-status-active/${cat.legacyId}`}
                              className="btn btn-danger"
                            >
                              Deativate
                            </a>
                          )}
                        </td>
                        <td>
                          <Link href={`/admin/edit-category/${cat.legacyId}`}>
                            <i className="fa fa-pencil btn btn-info btn-sm"></i>
                          </Link>
                          &nbsp;&nbsp;&nbsp;&nbsp;
                          {/* Delete is HTML-commented out in source for this module — no delete control at all. */}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <center>
                  <div></div>
                </center>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
