import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { isCosmeticsDbConfigured } from '@/lib/cosmetics/db/config';
import { getDb } from '@/lib/mongodb/client';
import { CategoryRepository } from '@/lib/mongodb/repositories/categoryRepository';
import { AddCosmeticsForm } from './AddCosmeticsForm';

/**
 * `/admin/add-cosmetics` — Cosmetics CRUD feature. Basic admin form for
 * adding Cosmetics products to the public `/homeopathy/cosmetics` page,
 * mirroring `/admin/add-mother-tincture`'s own `useActionState` + Server
 * Action pattern exactly (see `AddCosmeticsForm.tsx`'s header) — that page
 * itself pointed at "an admin panel (not built yet)" for this exact
 * purpose (`src/app/homeopathy/cosmetics/page.tsx`'s prior header
 * comment).
 *
 * Route protection: this page lives under `src/app/admin/(shell)/`, so
 * `admin/(shell)/layout.tsx`'s `requireAdminSession()` gates it for free.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Add Cosmetics Product',
};

export default async function AdminAddCosmeticsPage() {
  const dbConfigured = isCosmeticsDbConfigured();
  const db = await getDb();
  const categories = await new CategoryRepository(db).findByType('N', 1);

  return (
    <>
      <AdminStylesheets />

      <section className="content-header">
        <h1>Add Cosmetics Product</h1>
        <ol className="breadcrumb">
          <li>
            <a href="/admin/home">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li>
            <a href="/admin/cosmetics-list">Cosmetics</a>
          </li>
          <li className="active">Add Cosmetics Product</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          <div className="col-xs-12">
            <div className="box box-primary">
              <div className="box-body">
                <p className="text-muted" style={{ fontSize: 12.5 }}>
                  {dbConfigured
                    ? 'Saves to the cosmeticsProducts database collection. Saved products appear on /homeopathy/cosmetics.'
                    : 'No database is configured for Cosmetics admin-add — submissions will show a ' +
                      'clear "not saved" notice instead of persisting.'}
                </p>
                <AddCosmeticsForm categories={categories} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
