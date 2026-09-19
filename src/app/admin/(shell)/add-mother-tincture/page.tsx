import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { isMotherTinctureDbConfigured } from '@/lib/motherTincture/db/config';
import { getDb } from '@/lib/mongodb/client';
import { CategoryRepository } from '@/lib/mongodb/repositories/categoryRepository';
import { AddMotherTinctureForm } from './AddMotherTinctureForm';

/**
 * `/admin/add-mother-tincture` — basic admin form for adding Mother
 * Tincture medicines to the public catalogue (mirrors `/admin/add-herb`'s
 * `useActionState` + Server Action pattern, over the real `Product`
 * schema's meaningful subset rather than the full 10-variant-slot legacy
 * `/admin/add-product` form — kept "basic" per the owner's own framing).
 *
 * Calls the real `createMotherTinctureProductAction` Server Action (via
 * `AddMotherTinctureForm`, a client component wrapping it with
 * `useActionState`). When a database is configured, submissions genuinely
 * persist to the `motherTinctureProducts` collection and are merged into
 * `/mother-tincture`, `/homeopathy/products`, and `/nutrition`; when none
 * is configured, the action returns `persisted: false` with an explicit
 * reason, shown inline — never a silent failure, same honesty posture as
 * `/admin/add-herb`.
 *
 * Route protection: this page lives under `src/app/admin/(shell)/`, so
 * `admin/(shell)/layout.tsx`'s `requireAdminSession()` gates it for free
 * — no separate auth check needed here.
 *
 * Category dropdown reads live `categories` (type "N") via the main
 * `CategoryRepository` — the same migrated collection every other admin
 * category dropdown reads, not the Mother-Tincture-specific database
 * `isMotherTinctureDbConfigured()` gates (categories aren't
 * Mother-Tincture-specific data).
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Add Mother Tincture',
};

export default async function AdminAddMotherTincturePage() {
  const dbConfigured = isMotherTinctureDbConfigured();
  const db = await getDb();
  const categories = await new CategoryRepository(db).findByType('N', 1);

  return (
    <>
      <AdminStylesheets />

      <section className="content-header">
        <h1>Add Mother Tincture Medicine</h1>
        <ol className="breadcrumb">
          <li>
            <a href="/admin/home">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Add Mother Tincture Medicine</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          <div className="col-xs-12">
            <div className="box box-primary">
              <div className="box-body">
                <p className="text-muted" style={{ fontSize: 12.5 }}>
                  {dbConfigured
                    ? 'Saves to the motherTinctureProducts database collection. Saved medicines appear on /mother-tincture, /homeopathy/products, and /nutrition.'
                    : 'No database is configured for Mother Tincture admin-add — submissions will show a ' +
                      'clear "not saved" notice instead of persisting.'}
                </p>
                <AddMotherTinctureForm categories={categories} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
