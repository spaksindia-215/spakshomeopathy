/**
 * `GET /admin/destroy-blog/{id}` — mirrors `routes/admin.php:88`
 * (`Route::get('destroy-blog/{id}','AdminController@DestroyBlog')`,
 * inside the `userAuth` group).
 *
 * SOURCE (`AdminController.php:1072-1084`):
 *
 *   public function DestroyBlog($id) {
 *     $getBlog=DB::table('blogs')->where('id','=',$id)->first();
 *     $image=$getBlog->blog_image;
 *     if ($image!='' && file_exists('uploaded_files/blogs/'.$image)) {
 *       unlink('uploaded_files/blogs/'.$image);
 *     }
 *     $delBlog=DB::table('blogs')->where('id','=',$id)->delete();
 *     return redirect()->back()->with('message', 'Record deleted successfully.');
 *   }
 *
 * Well-formed `file_exists()` call — correctly deletes the image, same
 * pattern as `DestroyBlogCategory`/`DestroySlider`/`DestroyPinCode`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { setFlash } from '@/lib/auth/flash';
import { BlogRepository } from '@/lib/mongodb/repositories/blogRepository';
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
    const repo = new BlogRepository(db);
    const blog = await repo.findByLegacyId(legacyId);
    if (blog) {
      await deleteAdminUpload(blog.blogImage ?? '', 'blogs');
      await repo.deleteBlog(legacyId);
    }
  }

  await setFlash('message', 'Record deleted successfully.');
  return NextResponse.redirect(new URL('/admin/blog-list', request.nextUrl.origin), 303);
}
