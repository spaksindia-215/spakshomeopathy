import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { HerbArticleRepository } from '@/lib/herbArticles/repository';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { readAndClearFlash } from '@/lib/auth/flash';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';

export const metadata: Metadata = {
  title: 'Admin Panel | Edit Herb Article',
};

/**
 * `/admin/edit-herb-article/[id]` — GENUINELY NEW ADMIN SCREEN, no
 * Laravel equivalent (see `src/lib/herbArticles/schema.ts`'s header).
 */
export default async function AdminEditHerbArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.CONTENT_EDIT);

  const { id } = await params;
  const legacyId = Number(id);

  const repo = new HerbArticleRepository(db);
  const article = Number.isFinite(legacyId) ? await repo.findByLegacyId(legacyId) : null;

  if (!article) {
    notFound();
  }

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
        <h1>Edit Herb Article</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Edit Herb Article</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <div className="col-md-8">
            <div className="box box-success">
              <div className="box-header with-border">
                <h3 className="box-title">Article Info</h3>
              </div>
              <form method="post" action="/admin/update-herb-article">
                <input type="hidden" name="_token" value={csrfToken} />
                <input type="hidden" name="article_id" value={article.legacyId} />
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="title">Title</label>
                    <input
                      type="text"
                      name="title"
                      className="form-control"
                      defaultValue={article.title}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="slug">Slug (used in the URL)</label>
                    <input
                      type="text"
                      name="slug"
                      className="form-control"
                      defaultValue={article.slug}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="category">Category</label>
                    <input
                      type="text"
                      name="category"
                      className="form-control"
                      defaultValue={article.category}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="readTime">Read Time</label>
                    <input
                      type="text"
                      name="readTime"
                      className="form-control"
                      defaultValue={article.readTime}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="excerpt">Excerpt</label>
                    <textarea
                      name="excerpt"
                      className="form-control"
                      rows={3}
                      defaultValue={article.excerpt}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="status">Status</label>
                    <select
                      className="form-control"
                      name="status"
                      required
                      defaultValue={article.status}
                    >
                      <option value="">--Select--</option>
                      <option value="1">Active</option>
                      <option value="0">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="box-footer">
                  <button type="submit" name="submit" className="btn btn-success">
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
