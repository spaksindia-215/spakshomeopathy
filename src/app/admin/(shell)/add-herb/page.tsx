import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { WELLNESS_CATEGORIES } from '@/lib/herbs/data/taxonomy';
import { isHerbsDbConfigured, readWellnessCategoriesFromDb } from '@/lib/herbs/db';
import { AddHerbForm } from './AddHerbForm';

/**
 * `/admin/add-herb` — Herbs Store "Add Product" form (CR-003 §17).
 *
 * Calls the real `createHerbProductAction` Server Action (via
 * `AddHerbForm`, a client component wrapping it with `useActionState`).
 * When a database is configured, submissions genuinely persist to the
 * `herbProducts` collection; when none is configured, the action itself
 * returns `persisted: false` with an explicit reason, shown inline —
 * never a silent failure, same honesty posture as the original demo-only
 * version, now backed by a real write path instead of a fake one.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Add Herb',
};

export default async function AdminAddHerbPage() {
  const dbConfigured = isHerbsDbConfigured();
  const dbWellness = dbConfigured ? await readWellnessCategoriesFromDb() : null;
  const wellnessCategories =
    dbWellness && dbWellness.length > 0
      ? dbWellness.filter((c) => c.status === 'active')
      : WELLNESS_CATEGORIES;

  return (
    <>
      <AdminStylesheets />

      <section className="content-header">
        <h1>Add Herb Product</h1>
        <ol className="breadcrumb">
          <li>
            <a href="/admin/home">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li>
            <a href="/admin/herbs-list">Herbs List</a>
          </li>
          <li className="active">Add Herb Product</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          <div className="col-xs-12">
            <div className="box box-primary">
              <div className="box-body">
                <p className="text-muted" style={{ fontSize: 12.5 }}>
                  {dbConfigured
                    ? 'Saves to the Herbs Store database (herbProducts collection).'
                    : 'No database is configured for the Herbs Store — submissions will show a ' +
                      'clear "not saved" notice instead of persisting.'}
                </p>
                <AddHerbForm wellnessCategories={wellnessCategories} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
