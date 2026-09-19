import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { CKEditorPlaceholder } from '@/components/admin/CKEditorPlaceholder';
import { getDb } from '@/lib/mongodb/client';
import { PageRepository } from '@/lib/pages/repository';
import { pageSlugSchema } from '@/lib/pages/schema';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { readAndClearFlash } from '@/lib/auth/flash';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';

interface Props {
  params: Promise<{ slug: string }>;
}

const DEFAULT_TITLES: Record<string, string> = {
  terms: 'Terms and Conditions – Spaks Homeopathy',
  'privacy-policy': 'PRIVACY POLICY',
  'return-policy': 'Return & Refund Policy',
};

export const metadata: Metadata = {
  title: 'Admin Panel | Edit Page',
};

/**
 * `/admin/edit-page/[slug]` — CR-006 Phase 7. GENUINELY NEW, no Laravel
 * equivalent (see `src/lib/pages/schema.ts`'s header). Only the 3 slugs
 * in `pageSlugSchema` are valid — an unmatched slug 404s, same as this
 * codebase's other slug-keyed edit screens.
 *
 * Reuses the existing `CKEditorPlaceholder` component for `bodyHtml` —
 * this codebase's established, deliberate stand-in for a raw-HTML admin
 * content field (already used for `post_desc`/`blog_desc`/`p_desc`), not
 * a new editor dependency.
 */
export default async function AdminEditPagePage({ params }: Props) {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.CONTENT_EDIT);

  const { slug: rawSlug } = await params;
  const parsedSlug = pageSlugSchema.safeParse(rawSlug);
  if (!parsedSlug.success) notFound();
  const slug = parsedSlug.data;

  const repo = new PageRepository(db);
  const existing = await repo.findBySlug(slug);

  const csrfToken = generateCsrfToken();
  const message = await readAndClearFlash('message');

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/bootstrap/dist/css/bootstrap.min.css"
      />

      <section className="content-header">
        <h1>Edit Page</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li>
            <a href="/admin/pages-list">Pages</a>
          </li>
          <li className="active">Edit Page</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          {!existing && (
            <div className="col-md-12">
              <div className="alert alert-warning">
                No saved content yet — the public page currently renders its original,
                pre-migration content. Saving here will replace it.
              </div>
            </div>
          )}
          <form method="post" action="/admin/update-page">
            <input type="hidden" name="_token" value={csrfToken} />
            <input type="hidden" name="slug" value={slug} />
            <div className="col-md-12">
              <div className="box box-success">
                <div className="box-header with-border">
                  <h3 className="box-title">Page Content</h3>
                </div>
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="title">Title</label>
                    <input
                      type="text"
                      className="form-control"
                      id="title"
                      name="title"
                      defaultValue={existing?.title ?? DEFAULT_TITLES[slug]}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="bodyHtml">Body</label>
                    <CKEditorPlaceholder
                      name="bodyHtml"
                      id="bodyHtml"
                      defaultValue={existing?.bodyHtml ?? ''}
                    />
                  </div>
                </div>

                <div className="box-footer">
                  <button type="submit" className="btn btn-success">
                    Save
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
