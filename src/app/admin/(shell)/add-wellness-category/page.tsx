import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { isHerbsDbConfigured } from '@/lib/herbs/db';
import { AddWellnessCategoryForm } from './AddWellnessCategoryForm';

/**
 * `/admin/add-wellness-category` — CR-006 Phase 6. Calls the real
 * `createWellnessCategoryAction` Server Action, same posture as
 * `/admin/add-herb`: when a database is configured, submissions persist
 * to the `wellnessCategories` collection; when none is configured, the
 * action returns `persisted: false` with an explicit reason.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Add Wellness Category',
};

export default function AdminAddWellnessCategoryPage() {
  const dbConfigured = isHerbsDbConfigured();

  return (
    <>
      <AdminStylesheets />

      <section className="content-header">
        <h1>Add Wellness Category</h1>
        <ol className="breadcrumb">
          <li>
            <a href="/admin/home">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li>
            <a href="/admin/wellness-categories">Wellness Categories</a>
          </li>
          <li className="active">Add Wellness Category</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          <div className="col-xs-12">
            <div className="box box-primary">
              <div className="box-body">
                <p className="text-muted" style={{ fontSize: 12.5 }}>
                  {dbConfigured
                    ? 'Saves to the Herbs Store database (wellnessCategories collection).'
                    : 'No database is configured for the Herbs Store — submissions will show a ' +
                      'clear "not saved" notice instead of persisting.'}
                </p>
                <AddWellnessCategoryForm />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
