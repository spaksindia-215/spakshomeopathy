import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { PageRepository } from '@/lib/pages/repository';
import { pageSlugSchema } from '@/lib/pages/schema';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/pages-list` — CR-006 Phase 7. GENUINELY NEW ADMIN SCREEN, NOT A
 * MIGRATION: `terms`/`privacy-policy`/`return-policy`/`about` have no
 * Laravel admin equivalent — see `src/lib/pages/schema.ts`'s header.
 *
 * Fixed 3-row list (the closed `pageSlugSchema` enum — Terms, Privacy
 * Policy, Return Policy; `/about` is deliberately excluded, see
 * `src/lib/pages/schema.ts`'s header) — no add/delete, matching the
 * design decision that this is NOT a general page-builder. Rows without
 * a saved document yet show "Not customized" (the public page still
 * renders its original hardcoded content until an admin saves one).
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Pages',
};

const PAGE_PATHS: Record<string, string> = {
  terms: '/terms',
  'privacy-policy': '/privacy-policy',
  'return-policy': '/return-policy',
};

export default async function AdminPagesListPage() {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.CONTENT_VIEW);

  const repo = new PageRepository(db);
  const saved = await repo.findAll();
  const savedBySlug = new Map(saved.map((p) => [p.slug, p]));

  const message = await readAndClearFlash('message');

  return (
    <>
      <AdminStylesheets />

      <section className="content-header">
        <h1>Pages</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Pages</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <div className="col-xs-12">
            <div className="box">
              <div className="box-body">
                <table className="table table-bordered table-hover">
                  <thead>
                    <tr>
                      <th style={{ width: '10%' }}>S.No</th>
                      <th style={{ width: '30%' }}>Page</th>
                      <th style={{ width: '25%' }}>Public URL</th>
                      <th style={{ width: '20%' }}>Status</th>
                      <th style={{ width: '15%' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageSlugSchema.options.map((slug, i) => {
                      const doc = savedBySlug.get(slug);
                      return (
                        <tr key={slug}>
                          <td>{i + 1}</td>
                          <td>{doc?.title ?? slug}</td>
                          <td>
                            <a href={PAGE_PATHS[slug]} target="_blank" rel="noreferrer">
                              {PAGE_PATHS[slug]}
                            </a>
                          </td>
                          <td>
                            {doc ? (
                              <span className="btn btn-success btn-xs">Customized</span>
                            ) : (
                              <span className="btn btn-default btn-xs">Not customized</span>
                            )}
                          </td>
                          <td>
                            <Link href={`/admin/edit-page/${slug}`}>
                              <i className="fa fa-pencil btn btn-info btn-sm"></i>
                            </Link>
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
    </>
  );
}
