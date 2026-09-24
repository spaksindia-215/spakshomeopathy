import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { readCosmeticsProductByLegacyId } from '@/lib/cosmetics/db/service';
import { getDb } from '@/lib/mongodb/client';
import { CategoryRepository } from '@/lib/mongodb/repositories/categoryRepository';
import { EditCosmeticsForm } from './EditCosmeticsForm';

export const metadata: Metadata = {
  title: 'Admin Panel | Edit Cosmetics Product',
};

/**
 * `/admin/edit-cosmetics/[id]` — Cosmetics CRUD feature. Full-field edit
 * + delete, extending the add-only Mother Tincture pattern this feature
 * is otherwise modeled on (see `EditCosmeticsForm.tsx`'s header).
 */
export default async function AdminEditCosmeticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const legacyId = Number(id);

  const product = Number.isFinite(legacyId)
    ? await readCosmeticsProductByLegacyId(legacyId)
    : null;

  if (!product) {
    notFound();
  }

  const db = await getDb();
  const categories = await new CategoryRepository(db).findByType('N', 1);

  return (
    <>
      <AdminStylesheets />

      <section className="content-header">
        <h1>Edit Cosmetics Product</h1>
        <ol className="breadcrumb">
          <li>
            <a href="/admin/home">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li>
            <a href="/admin/cosmetics-list">Cosmetics</a>
          </li>
          <li className="active">Edit Cosmetics Product</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          <div className="col-xs-12">
            <div className="box box-primary">
              <div className="box-body">
                <EditCosmeticsForm product={product} categories={categories} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
