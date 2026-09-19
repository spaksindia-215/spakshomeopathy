/**
 * `POST /admin/update-blog` — mirrors `routes/admin.php:87`
 * (`Route::post('update-blog','AdminController@UpdateBlog')`, inside the
 * `userAuth` group).
 *
 * SOURCE (`AdminController.php:1041-1064`):
 *
 *   public function UpdateBlog(Request $request) {
 *     $blog_id=$request->blog_id;
 *     $old_image=$request->old_image;
 *     $blog_catid=$request->blog_catid;
 *     $blog_title=$request->blog_title;
 *     $blog_desc=$request->blog_desc;
 *     $blog_author=$request->blog_author;
 *     if($request->hasFile('blog_image')) {
 *       $blog_image=$request->file('blog_image');
 *       $filename = time().'g'.$blog_image->getClientOriginalName();
 *       $blog_image->move(public_path('uploaded_files/blogs'), $filename);
 *       if ($old_image!='' && file_exists('uploaded_files/blogs/'.$old_image)) {
 *         unlink('uploaded_files/blogs/'.$old_image);
 *       }
 *     } else {
 *       $filename=$old_image;
 *     }
 *     $blog_status=$request->blog_status;
 *     DB::table('blogs')->where('id','=',$blog_id)
 *       ->update(['blog_catid'=>...,'blog_title'=>...,'blog_image'=>$filename,'blog_desc'=>...,'blog_author'=>...,'blog_status'=>...]);
 *     return redirect()->back()->with('message', 'Blog updated successfully.');
 *   }
 *
 * UNLIKE `UpdateBlogCategory` (which has the `file_exists(!'...')` bug —
 * see that route's header), THIS method's `file_exists()` call is
 * well-formed — no stray `!`, correct path concatenation. Verified
 * directly this slice. Old-image cleanup DOES correctly fire here.
 *
 * FIX-004 precedent applies: `blogs.updated_at` has no
 * `ON UPDATE current_timestamp()` clause (confirmed,
 * `Database/db_newhomo.sql:104-115`) and source's raw `update([...])`
 * call never sets it — `updatedAt` is deliberately NOT included below.
 *
 * `blog_slug` is NEVER re-generated on Update (source's `$data` array has
 * no `blog_slug` key at all) — the original slug from creation is
 * preserved permanently, even if the title changes. Reproduced: this
 * route's `updateBlog(...)` call never touches `blogSlug`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { setFlash } from '@/lib/auth/flash';
import { BlogRepository } from '@/lib/mongodb/repositories/blogRepository';
import { saveAdminUpload, deleteAdminUpload, UploadRejectedError } from '@/lib/uploads/adminUpload';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();

  const blogId = String(formData.get('blog_id') ?? '');

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return redirectTo(`/admin/edit-blog/${blogId}`, 303);
  }

  await requireAdminSession();

  const blogCatId = String(formData.get('blog_catid') ?? '');
  const blogTitle = String(formData.get('blog_title') ?? '');
  const blogDesc = String(formData.get('blog_desc') ?? '');
  const blogAuthor = String(formData.get('blog_author') ?? '');
  const blogStatus = String(formData.get('blog_status') ?? '');
  const oldImage = String(formData.get('old_image') ?? '');
  const imageFile = formData.get('blog_image');
  const legacyId = Number(blogId);
  const catIdNum = Number(blogCatId);

  let filename = oldImage;
  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      filename = await saveAdminUpload(imageFile, 'blogs');
    } catch (error) {
      if (error instanceof UploadRejectedError) {
        await setFlash('message', error.message);
        return redirectTo(`/admin/edit-blog/${blogId}`, 303);
      }
      throw error;
    }
    // Old-image cleanup DOES correctly fire here — see file header.
    await deleteAdminUpload(oldImage, 'blogs');
  }

  if (Number.isFinite(legacyId)) {
    const db = await getDb();
    const repo = new BlogRepository(db);
    await repo.updateBlog(legacyId, {
      categoryId: Number.isFinite(catIdNum) ? catIdNum : null,
      blogTitle,
      blogImage: filename,
      blogDesc,
      blogAuthor,
      blogStatus: Number(blogStatus) || 0,
    });
  }

  await setFlash('message', 'Blog updated successfully.');
  return redirectTo(`/admin/edit-blog/${blogId}`, 303);
}
