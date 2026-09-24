import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { HerbArticleRepository } from '@/lib/herbArticles/repository';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { readAndClearFlash } from '@/lib/auth/flash';

export const metadata: Metadata = {
  title: 'Admin Panel | Herb Articles List',
};

/**
 * `/admin/herb-articles-list` — GENUINELY NEW ADMIN SCREEN, no Laravel
 * equivalent (see `src/lib/herbArticles/schema.ts`'s header).
 */
export default async function AdminHerbArticlesListPage() {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.CONTENT_VIEW);

  const repo = new HerbArticleRepository(db);
  const articles = await repo.findAllDescending();
  const message = await readAndClearFlash('message');

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css"
      />

      <section className="content-header">
        <h1>Herb Articles List</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Herb Articles List</li>
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
                      <th>S.No</th>
                      <th>Title</th>
                      <th>Slug</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {articles.map((article, i) => (
                      <tr key={article.legacyId}>
                        <td>{i + 1}</td>
                        <td>{article.title}</td>
                        <td>
                          <a href={`/herbs/learn/${article.slug}`} target="_blank" rel="noreferrer">
                            {article.slug}
                          </a>
                        </td>
                        <td>{article.category}</td>
                        <td>{article.status === 1 ? 'Active' : 'Inactive'}</td>
                        <td>
                          <Link href={`/admin/edit-herb-article/${article.legacyId}`}>
                            <i className="fa fa-pencil btn btn-info btn-sm"></i>
                          </Link>{' '}
                          <a href={`/admin/destroy-herb-article/${article.legacyId}`}>
                            <i className="fa fa-trash btn btn-danger btn-sm"></i>
                          </a>
                        </td>
                      </tr>
                    ))}
                    {articles.length === 0 && (
                      <tr>
                        <td colSpan={6}>No articles added yet.</td>
                      </tr>
                    )}
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
