/**
 * `POST /admin/save-blog-category` — mirrors `routes/admin.php:78`
 * (`Route::post('save-blog-category','AdminController@SaveBlogCategory')`,
 * inside the `userAuth` group).
 *
 * SOURCE (`AdminController.php:883-900`):
 *
 *   public function SaveBlogCategory(Request $request) {
 *     $name=$request->bcat_name;
 *     $bcat_slug=$this->convert_to_slug($name);
 *     if($request->hasFile('bcat_image')) {
 *       $files=$request->file('bcat_image');
 *       $file_name=time().'g'.$files->getClientOriginalName();
 *       $files->move('uploaded_files/blog-categories',$file_name);
 *     } else {
 *       $file_name='';
 *     }
 *     $data=array('bcat_name'=>$name,'bcat_image'=>$file_name,'bcat_slug'=>$bcat_slug);
 *     DB::table('blog_category')->insert($data);
 *     return redirect()->back()->with('message', 'Record saved successfully.');
 *   }
 *
 * P-07 (Preserved Defect): the slug is generated via `convert_to_slug()`
 * (`src/lib/adminSlug.ts`), P-07's "second algorithm" — unsanitized
 * beyond `[a-z0-9-]` collapsing, `name-{5 random chars}` shape. NOT
 * "cleaned up" to a stricter slugify.
 *
 * IMAGE OPTIONAL, UNLIKE SLIDER/PINCODE: source's `hasFile()` check means
 * a blog-category with no image is fully legitimate (`bcat_image=''`),
 * not an error — `add-blog-category.blade.php`'s file input has no
 * `required` attribute (confirmed directly, unlike `add-slider`'s). D-04/
 * FIX-003's extension whitelist still applies whenever a file IS supplied
 * — this route doesn't relax that.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { setFlash } from '@/lib/auth/flash';
import { BlogCategoryRepository } from '@/lib/mongodb/repositories/blogCategoryRepository';
import { saveAdminUpload, UploadRejectedError } from '@/lib/uploads/adminUpload';
import { convertToSlug } from '@/lib/adminSlug';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return redirectTo('/admin/add-blog-category', 303);
  }

  await requireAdminSession();

  const bcatName = String(formData.get('bcat_name') ?? '');
  const imageFile = formData.get('bcat_image');

  let filename = '';
  // Mirrors source's `$request->hasFile('bcat_image')` — an empty/absent
  // file field is a legitimate, fully-supported "no image" case here,
  // unlike save-slider's required upload.
  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      filename = await saveAdminUpload(imageFile, 'blog-categories');
    } catch (error) {
      if (error instanceof UploadRejectedError) {
        await setFlash('message', error.message);
        return redirectTo('/admin/add-blog-category', 303);
      }
      console.error('[admin/save-blog-category] upload failed:', error);
      throw error;
    }
  }

  const bcatSlug = convertToSlug(bcatName);

  const db = await getDb();
  const repo = new BlogCategoryRepository(db);
  const legacyId = await repo.nextLegacyIdGeneric();

  await repo.insertBlogCategory({
    legacyId,
    bcatName,
    bcatImage: filename,
    bcatSlug,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Mirrors redirect()->back()->with('message', 'Record saved successfully.')
  // — back() always resolves to /admin/add-blog-category, the only page
  // with this form action.
  await setFlash('message', 'Record saved successfully.');
  return redirectTo('/admin/add-blog-category', 303);
}
