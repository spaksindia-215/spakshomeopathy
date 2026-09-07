/**
 * `GET /admin/destroy-blog-category/{id}` — mirrors `routes/admin.php:79`
 * (`Route::get('destroy-blog-category/{id}','AdminController@DestroyBlogCategory')`,
 * inside the `userAuth` group).
 *
 * SOURCE (`AdminController.php:910-919`):
 *
 *   public function DestroyBlogCategory($id) {
 *     $getBlogCat=DB::table('blog_category')->where('id','=',$id)->first();
 *     $image=$getBlogCat->bcat_image;
 *     if ($image!='' && file_exists('uploaded_files/blog-categories/'.$image)) {
 *       unlink('uploaded_files/blog-categories/'.$image);
 *     }
 *     DB::table('blog_category')->where('id','=',$id)->delete();
 *     return redirect()->back()->with('message', 'Record deleted successfully.');
 *   }
 *
 * UNLIKE `UpdateBlogCategory` (see that route's header for the
 * `file_exists(!'...')` defect), THIS method's `file_exists()` call is
 * well-formed — no stray `!`, correct path concatenation — verified
 * directly this slice. Destroy DOES correctly delete the image file; only
 * Update fails to. Reproduced accordingly: this route DOES call
 * `deleteAdminUpload`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { setFlash } from '@/lib/auth/flash';
import { BlogCategoryRepository } from '@/lib/mongodb/repositories/blogCategoryRepository';
import { deleteAdminUpload } from '@/lib/uploads/adminUpload';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  await requireAdminSession();

  const { id } = await params;
  const legacyId = Number(id);

  if (Number.isFinite(legacyId)) {
    const db = await getDb();
    const repo = new BlogCategoryRepository(db);
    const category = await repo.findByLegacyId(legacyId);
    if (category) {
      await deleteAdminUpload(category.bcatImage ?? '', 'blog-categories');
      await repo.deleteBlogCategory(legacyId);
    }
    // No matching row: same disclosed non-BROKEN-register edge as
    // destroy-slider/destroy-pincode.
  }

  // Mirrors redirect()->back()->with('message', 'Record deleted successfully.')
  // — back() always resolves to /admin/blog-category-list.
  await setFlash('message', 'Record deleted successfully.');
  return NextResponse.redirect(new URL('/admin/blog-category-list', request.nextUrl.origin), 303);
}
