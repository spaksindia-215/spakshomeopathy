import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { HERB_PRODUCTS } from '@/lib/herbs/data/products';
import { WELLNESS_CATEGORIES } from '@/lib/herbs/data/taxonomy';
import {
  readHerbProductsFromDb,
  readWellnessCategoriesFromDb,
  isHerbsDbConfigured,
} from '@/lib/herbs/db';
import { EditHerbForm } from './EditHerbForm';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: 'Admin Panel | Edit Herb',
};

/**
 * `/admin/edit-herb/[id]` — looks up `id` in the DB-backed catalogue
 * first (if a database is configured), falling back to the static seed
 * array — so both "Saved" and "Seed Data" rows from `/admin/herbs-list`
 * resolve here correctly. Saving calls the real `updateHerbProductAction`
 * (via `EditHerbForm`); editing a seed-data row still shows the honest
 * "not saved" notice from that action if no database is configured,
 * matching the original demo-only posture in that case.
 */
export default async function AdminEditHerbPage({ params }: Props) {
  const { id } = await params;

  const dbConfigured = isHerbsDbConfigured();
  const dbProducts = dbConfigured ? await readHerbProductsFromDb() : null;
  const herb =
    (dbProducts ?? []).find((h) => h.id === id) ?? HERB_PRODUCTS.find((h) => h.id === id);
  if (!herb) notFound();

  const dbWellness = dbConfigured ? await readWellnessCategoriesFromDb() : null;
  const wellnessCategories =
    dbWellness && dbWellness.length > 0
      ? dbWellness.filter((c) => c.status === 'active')
      : WELLNESS_CATEGORIES;

  return (
    <>
      <AdminStylesheets />

      <section className="content-header">
        <h1>Edit Herb Product</h1>
        <ol className="breadcrumb">
          <li>
            <a href="/admin/home">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li>
            <a href="/admin/herbs-list">Herbs List</a>
          </li>
          <li className="active">Edit Herb Product</li>
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
                    : 'No database is configured for the Herbs Store — saving will show a clear ' +
                      '"not saved" notice instead of persisting.'}
                </p>
                <EditHerbForm herb={herb} wellnessCategories={wellnessCategories} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
