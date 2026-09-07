import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { CKEditorPlaceholder } from '@/components/admin/CKEditorPlaceholder';
import { getAllProducts } from '@/lib/demo';
import { getDb } from '@/lib/mongodb/client';
import { PostRepository } from '@/lib/mongodb/repositories/postRepository';
import { CategoryRepository } from '@/lib/mongodb/repositories/categoryRepository';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/edit-post/[post_id]` — ported from `admin/edit-post.blade.php`
 * (387 lines), `AdminController@EditPost` (GET) / `UpdatePost` (POST, to
 * `admin/update-post`).
 *
 * P-04's edit-side half (confirmed directly this session): the Category
 * `<select>` here uses each category's `id` as the option value (source
 * line 225: `value="{{$row->id}}"`, `selected` compared against
 * `$getPost->post_homeopathy`) — NOT `slug` like `add-post`'s equivalent
 * select. Reproduced with `option value={c.legacyId}`.
 *
 * Product `<select>` still uses `p_slug` as its value on THIS page too
 * (source line 273, `selected` compared against `$getPost->p_id`, which
 * source's own `postSchema.pId` doc note flags as a varchar field, not a
 * numeric id) — same as `add-post`, no asymmetry here.
 *
 * M5-E: switched from `@/lib/demo` to live `spaks_dev` reads
 * (`PostRepository.findByLegacyId`,
 * `CategoryRepository.findAllByNameAscending` for the dropdown —
 * matching source's `EditPost()`, which queries `categories` live), CSRF
 * -token-wired, success flash rendered. Product dropdown remains
 * demo-fixture-backed, same disclosed asymmetry as `add-post` (products'
 * own CRUD/read infrastructure is out of this sub-slice's scope).
 *
 * PRESERVED DEFECTS:
 *   - Image field name is `post_image` here — DIFFERS from Add's
 *     `p_pimage` (see that page's header).
 *   - "Old Image" preview has NO accompanying hidden `old_image` field
 *     tied to it directly in this block (the real hidden field is
 *     `old_pimage`, placed separately below the Image file input,
 *     confirmed source lines 253-259) — reproduced in that same
 *     structural position, not moved next to the preview.
 *   - Bootstrap CSS loaded twice.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Edit Post',
};

export default async function AdminEditPostPage({
  params,
}: {
  params: Promise<{ post_id: string }>;
}) {
  const { post_id } = await params;
  const legacyId = Number(post_id);

  const db = await getDb();
  const postRepo = new PostRepository(db);
  const post = Number.isFinite(legacyId) ? await postRepo.findByLegacyId(legacyId) : null;

  if (!post) {
    notFound();
  }

  const categoryRepo = new CategoryRepository(db);
  const categories = await categoryRepo.findAllByNameAscending();
  const products = getAllProducts();
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
        <h1>Edit Post</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Edit Post</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <form method="post" action="/admin/update-post" encType="multipart/form-data">
            <input type="hidden" name="_token" value={csrfToken} />
            <div className="col-md-6">
              <div className="box box-success">
                <div className="box-header with-border">
                  <h3 className="box-title">Post Info</h3>
                </div>
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Post Title</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter Post Title"
                      name="post_title"
                      defaultValue={post.postTitle ?? ''}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputPassword1"> Description</label>
                    <CKEditorPlaceholder
                      name="post_desc"
                      defaultValue={post.postDesc ?? ''}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="box box-info">
                <div className="box-header with-border">
                  <h3 className="box-title">Post Info</h3>
                </div>
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="exampleInputPassword1">Category</label>
                    <select
                      className="form-control"
                      name="post_homeopathy"
                      required
                      defaultValue={post.homeopathyId ?? ''}
                    >
                      <option value="">--Select--</option>
                      {categories.map((c) => (
                        <option key={c.legacyId} value={c.legacyId}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Old Image</label>
                    <img
                      src={`/uploaded_files/post/${post.postImage ?? ''}`}
                      style={{ height: '100px', width: '100px' }}
                      alt=""
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Image</label>
                    <input type="file" className="form-control" name="post_image" />
                  </div>

                  <input type="hidden" name="old_pimage" value={post.postImage ?? ''} />
                  <input type="hidden" name="post_id" value={post.legacyId} />

                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Product</label>
                    <select
                      className="form-control"
                      name="p_id"
                      id="p_id"
                      required
                      defaultValue={post.pId}
                    >
                      <option value="">--Select--</option>
                      {products.map((p) => (
                        <option key={p.legacyId} value={p.pSlug ?? ''}>
                          {p.pHeading}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Status</label>
                    <select
                      name="post_status"
                      className="form-control"
                      defaultValue={post.postStatus ?? ''}
                    >
                      <option value="">--select--</option>
                      <option value="1">Active</option>
                      <option value="0">Inactive</option>
                    </select>
                  </div>

                  <div className="box-footer">
                    <button type="submit" className="btn btn-success">
                      Update Post
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
