import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { BlogCategoryRepository } from '@/lib/mongodb/repositories/blogCategoryRepository';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/edit-blog-category/[id]` — ported from
 * `admin/edit-blog-category.blade.php` (160 lines),
 * `AdminController@EditBlogCategory` (GET) / `UpdateBlogCategory`
 * (POST, to `admin/update-blog-category`).
 *
 * FLAGSHIP PRESERVED MISLABEL, verified directly this session: the
 * `<title>` (line 7), page `<h1>` (line 44), and breadcrumb active item
 * (line 48) ALL literally read "Add Blog Category" — a genuine
 * copy-paste-from-Add artifact — even though the form itself correctly
 * posts to `admin/update-blog-category` and is pre-filled with real
 * data via hidden `bcat_id`/`old_image` fields. Reproduced verbatim: the
 * page title/heading/breadcrumb below say "Add Blog Category", NOT
 * "Edit Blog Category". Do not "fix" this to match the page's actual
 * function.
 *
 * PRESERVED DEFECT: "Previous Image" block is conditionally rendered in
 * source only when `bcat_image` is non-empty AND `file_exists()` passes
 * — approximated here (no server filesystem to check) by gating on
 * `bcatImage` truthiness alone, same divergence noted on
 * `blog-category-list`.
 *
 * M5-E: switched from `@/lib/demo`'s static fixture to a live `spaks_dev`
 * read (`BlogCategoryRepository.findByLegacyId`), CSRF-token-wired,
 * success flash rendered. See `src/app/admin/update-blog-category/route.ts`'s
 * header for a genuinely new finding this slice surfaced (Update never
 * deletes the old image file on real Laravel either — preserved, not
 * fixed).
 */
export const metadata: Metadata = {
  // PRESERVED MISLABEL — see file header. Not "Edit Blog Category".
  title: 'Admin Panel | Add Blog Category',
};

export default async function AdminEditBlogCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const legacyId = Number(id);

  const db = await getDb();
  const repo = new BlogCategoryRepository(db);
  const category = Number.isFinite(legacyId) ? await repo.findByLegacyId(legacyId) : null;

  if (!category) {
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
        {/* PRESERVED MISLABEL — see file header. */}
        <h1>Add Blog Category</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Add Blog Category</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <form method="post" action="/admin/update-blog-category" encType="multipart/form-data">
            <input type="hidden" name="_token" value={csrfToken} />
            <div className="col-md-6">
              <div className="box box-success">
                <div className="box-header with-border">
                  <h3 className="box-title">Category Info</h3>
                </div>
                <div className="box-body">
                  <input type="hidden" name="bcat_id" value={category.legacyId} />
                  <input type="hidden" name="old_image" value={category.bcatImage ?? ''} />
                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Category Name</label>
                    <input
                      type="text"
                      name="bcat_name"
                      className="form-control"
                      placeholder="Enter Name"
                      defaultValue={category.bcatName ?? ''}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="box box-info">
                <div className="box-header with-border">
                  <h3 className="box-title">Category Info</h3>
                </div>
                <div className="box-body">
                  {category.bcatImage && (
                    <div className="form-group">
                      <label htmlFor="exampleInputEmail1">Previous Image</label>
                      <img
                        src={`/uploaded_files/blog-categories/${category.bcatImage}`}
                        height={80}
                        width={80}
                        alt=""
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Image</label>
                    <input type="file" name="bcat_image" className="form-control" />
                  </div>

                  <div className="box-footer">
                    <button type="submit" className="btn btn-success">
                      Submit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
