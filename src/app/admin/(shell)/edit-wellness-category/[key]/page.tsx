import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { readWellnessCategoriesFromDb, isHerbsDbConfigured } from '@/lib/herbs/db';
import { EditWellnessCategoryForm } from './EditWellnessCategoryForm';

interface Props {
  params: Promise<{ key: string }>;
}

export const metadata: Metadata = {
  title: 'Admin Panel | Edit Wellness Category',
};

/**
 * `/admin/edit-wellness-category/[key]` — CR-006 Phase 6. Only resolves
 * DB-backed rows (not the static seed constant) — the list page only
 * links here for `source: 'db'` rows, same "Seed Data can't be edited
 * directly" posture `/admin/herbs-list` uses for delete.
 */
export default async function AdminEditWellnessCategoryPage({ params }: Props) {
  const { key } = await params;

  const dbConfigured = isHerbsDbConfigured();
  const dbCategories = dbConfigured ? await readWellnessCategoriesFromDb() : null;
  const category = (dbCategories ?? []).find((c) => c.key === key);
  if (!category) notFound();

  return (
    <>
      <AdminStylesheets />

      <section className="content-header">
        <h1>Edit Wellness Category</h1>
        <ol className="breadcrumb">
          <li>
            <a href="/admin/home">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li>
            <a href="/admin/wellness-categories">Wellness Categories</a>
          </li>
          <li className="active">Edit Wellness Category</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          <div className="col-xs-12">
            <div className="box box-primary">
              <div className="box-body">
                <EditWellnessCategoryForm category={category} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
