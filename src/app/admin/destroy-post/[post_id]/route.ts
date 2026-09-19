/**
 * `GET /admin/destroy-post/{post_id}` — mirrors `routes/admin.php:46`
 * (`Route::get('destroy-post/{post_id}','AdminController@DestroyPost')`,
 * inside the `userAuth` group).
 *
 * SOURCE (`AdminController.php:827-838`):
 *
 *   public function DestroyPost($post_id) {
 *     // $getData=DB::table('post')->where('id','=',$post_id)->first();
 *     // if($getData->p_pimage!='') {
 *     //  if(file_exists(public_path('uploaded_files/post/'.$getData->p_pimage))){
 *     //   unlink(public_path('uploaded_files/post/'.$getData->p_pimage));
 *     //    } }
 *     $DelCat=DB::table('tbl_post')->where('id','=',$post_id)->delete();
 *     return redirect()->back()->with('message', 'Post deleted successfully.');
 *   }
 *
 * The entire image-cleanup block is COMMENTED OUT in source (references
 * a nonexistent `post` table and a nonexistent `p_pimage` column on
 * `tbl_post` — further evidence it's genuinely dead, not merely
 * disabled-but-correct code). Per contract §12.4 ("commented code is
 * never a source of behavior... carries no authority at any rank"), this
 * route performs NO filesystem cleanup — matching source's real,
 * observable behavior exactly (delete the row, leave the image file
 * orphaned on disk).
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { setFlash } from '@/lib/auth/flash';
import { PostRepository } from '@/lib/mongodb/repositories/postRepository';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ post_id: string }> }
): Promise<NextResponse> {
  await requireAdminSession();

  const { post_id } = await params;
  const legacyId = Number(post_id);

  if (Number.isFinite(legacyId)) {
    const db = await getDb();
    const repo = new PostRepository(db);
    await repo.deletePost(legacyId);
  }

  // Mirrors redirect()->back()->with('message', 'Post deleted successfully.')
  await setFlash('message', 'Post deleted successfully.');
  return redirectTo('/admin/post-list', 303);
}
