import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { CKEditorPlaceholder } from '@/components/admin/CKEditorPlaceholder';
import { getDb } from '@/lib/mongodb/client';
import { BlogRepository } from '@/lib/mongodb/repositories/blogRepository';
import { BlogCategoryRepository } from '@/lib/mongodb/repositories/blogCategoryRepository';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/edit-blog/[id]` — ported from `admin/edit-blog.blade.php` (188
 * lines), `AdminController@EditBlog` (GET) / `UpdateBlog` (POST, to
 * `admin/update-blog`).
 *
 * M5-E: switched from `@/lib/demo` to live `spaks_dev` reads
 * (`BlogRepository.findByLegacyId`, `BlogCategoryRepository.findAllDescending`
 * for the dropdown — matching source's `EditBlog()`, which queries both
 * live), CSRF-token-wired, success flash rendered.
 *
 * NOTE: source sets a `value="{{$getBlog->blog_image}}"` attribute on
 * the file `<input>` (line 129) — browsers silently ignore any `value`
 * on `type="file"` inputs for security reasons, so this is a dead
 * attribute with zero visible effect even in the real app. Not
 * reproduced (React actively warns/errors on a file input given a
 * `value`, unlike a browser attribute it can just ignore) — the outcome
 * (an empty file picker) is identical either way.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Edit Blog',
};

export default async function AdminEditBlogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const legacyId = Number(id);

  const db = await getDb();
  const blogRepo = new BlogRepository(db);
  const blog = Number.isFinite(legacyId) ? await blogRepo.findByLegacyId(legacyId) : null;

  if (!blog) {
    notFound();
  }

  const categoryRepo = new BlogCategoryRepository(db);
  const categories = await categoryRepo.findAllDescending();
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
        <h1>Edit Blog</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Edit Blog</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <form method="post" action="/admin/update-blog" encType="multipart/form-data">
            <input type="hidden" name="_token" value={csrfToken} />
            <div className="col-md-6">
              <div className="box box-success">
                <div className="box-header with-border">
                  <h3 className="box-title">Blog Info</h3>
                </div>
                <div className="box-body">
                  <input type="hidden" name="blog_id" value={blog.legacyId} />
                  <input type="hidden" name="old_image" value={blog.blogImage ?? ''} />
                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Blog Title</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter Blog Title"
                      name="blog_title"
                      defaultValue={blog.blogTitle ?? ''}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputPassword1"> Description</label>
                    <CKEditorPlaceholder
                      name="blog_desc"
                      defaultValue={blog.blogDesc ?? ''}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="box box-info">
                <div className="box-header with-border">
                  <h3 className="box-title">Blog Info</h3>
                </div>
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="exampleInputPassword1">Blog Category</label>
                    <select
                      className="form-control"
                      name="blog_catid"
                      required
                      defaultValue={blog.categoryId ?? ''}
                    >
                      <option value="">--Select--</option>
                      {categories.map((c) => (
                        <option key={c.legacyId} value={c.legacyId}>
                          {c.bcatName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Previous Image</label>
                    <img
                      src={`/uploaded_files/blogs/${blog.blogImage ?? ''}`}
                      height={80}
                      width={80}
                      alt=""
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Image</label>
                    <input type="file" className="form-control" name="blog_image" />
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Author</label>
                    <input
                      type="text"
                      className="form-control"
                      name="blog_author"
                      defaultValue={blog.blogAuthor ?? ''}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputPassword1">Status</label>
                    <select
                      className="form-control"
                      name="blog_status"
                      required
                      defaultValue={blog.blogStatus ?? ''}
                    >
                      <option value="">--Select--</option>
                      <option value="1">Active</option>
                      <option value="0">Inactive</option>
                    </select>
                  </div>

                  <div className="box-footer">
                    <button type="submit" className="btn btn-success">
                      Update
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
