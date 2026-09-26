/**
 * `POST /admin/save-blog` — mirrors `routes/admin.php:85`
 * (`Route::post('save-blog','AdminController@SaveBlog')`, inside the
 * `userAuth` group).
 *
 * SOURCE (`AdminController.php:1008-1024`):
 *
 *   public function SaveBlog(Request $request) {
 *     $blog_catid=$request->blog_catid;
 *     $blog_title=$request->blog_title;
 *     $blog_slug=$this->convert_to_slug($blog_title);
 *     $blog_image=$request->file('blog_image');
 *     $filename = time().'g'.$blog_image->getClientOriginalName();
 *     $blog_image->move(public_path('uploaded_files/blogs'), $filename);
 *     $blog_desc=$request->blog_desc;
 *     $blog_author=$request->blog_author;
 *     $blog_status=$request->blog_status;
 *     $data=array('blog_catid'=>...,'blog_title'=>...,'blog_image'=>$filename,'blog_desc'=>...,'blog_author'=>...,'blog_slug'=>$blog_slug,'blog_status'=>...);
 *     DB::table('blogs')->insert($data);
 *     return redirect()->back()->with('message', 'Blog saved successfully.');
 *   }
 *
 * P-07: slug via `convert_to_slug` (`src/lib/adminSlug.ts`) — the SAME
 * algorithm as blog categories/product categories/products, NOT
 * categories' own `name-rand()` variant.
 *
 * NEW FINDING, PRESERVED, NOT FIXED: `$blog_image=$request->file(...)`
 * has NO `hasFile()`/`empty()` guard here either (same class of gap as
 * `Savecategory`, `docs/GATE-REPORT-M3.md` §6.2 Finding 6) — but UNLIKE
 * `add-category.blade.php`'s `c_image`, `add-blog.blade.php`'s
 * `blog_image` DOES carry a `required` attribute (verified directly this
 * slice, `add-blog.blade.php:89`), making the crash meaningfully harder
 * to reach through the normal UI (client-side `required` is not a server
 * guard, but does close off the accidental/careless-omission path a
 * missing `required` attribute leaves open). Same disclosed, non-fatal
 * rejection reproduced here regardless, for consistency and because
 * `required` is bypassable (a raw POST, a modified form).
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { setFlash } from '@/lib/auth/flash';
import { BlogRepository } from '@/lib/mongodb/repositories/blogRepository';
import { saveAdminUpload, UploadRejectedError } from '@/lib/uploads/adminUpload';
import { convertToSlug } from '@/lib/adminSlug';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return redirectTo('/admin/add-blog', 303);
  }

  await requireAdminSession();

  const blogCatId = String(formData.get('blog_catid') ?? '');
  const blogTitle = String(formData.get('blog_title') ?? '');
  const blogDesc = String(formData.get('blog_desc') ?? '');
  const blogAuthor = String(formData.get('blog_author') ?? '');
  const blogStatus = String(formData.get('blog_status') ?? '');
  const imageFile = formData.get('blog_image');

  if (!(imageFile instanceof File) || imageFile.size === 0) {
    await setFlash('message', 'No image file was uploaded.');
    return redirectTo('/admin/add-blog', 303);
  }

  let filename: string;
  try {
    filename = await saveAdminUpload(imageFile, 'blogs');
  } catch (error) {
    if (error instanceof UploadRejectedError) {
      await setFlash('message', error.message);
      return redirectTo('/admin/add-blog', 303);
    }
    console.error('[admin/save-blog] upload failed:', error);
    throw error;
  }

  const blogSlug = convertToSlug(blogTitle);
  const catIdNum = Number(blogCatId);

  const db = await getDb();
  const repo = new BlogRepository(db);
  const legacyId = await repo.nextLegacyIdGeneric();

  await repo.insertBlog({
    legacyId,
    categoryId: Number.isFinite(catIdNum) ? catIdNum : null,
    blogTitle,
    blogImage: filename,
    blogDesc,
    blogAuthor,
    blogSlug,
    blogStatus: Number(blogStatus) || 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Mirrors redirect()->back()->with('message', 'Blog saved successfully.')
  // — note the message text differs from every other Save handler in this
  // module set ("Blog saved" vs. the usual "Record saved") — preserved
  // exactly, not normalized.
  await setFlash('message', 'Blog saved successfully.');
  return redirectTo('/admin/add-blog', 303);
}
