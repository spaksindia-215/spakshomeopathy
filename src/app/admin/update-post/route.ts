/**
 * `POST /admin/update-post` — mirrors `routes/admin.php:45`
 * (`Route::post('update-post','AdminController@UpdatePost')`, inside the
 * `userAuth` group).
 *
 * SOURCE (`AdminController.php:794-821`):
 *
 *   public function UpdatePost(Request $req) {
 *     $post_homeopathy=$req->post_homeopathy;
 *     $post_title=$req->post_title;
 *     $post_id=$req->post_id;
 *     $p_id=$req->p_id;
 *     $prod_image=$req->file('post_image');
 *     if (empty($prod_image)) {
 *       $filename=$req->old_pimage;
 *     } else {
 *       $filename = time().'g'.$prod_image->getClientOriginalName();
 *       $prod_image->move(public_path('uploaded_files/post'), $filename);
 *     }
 *     $post_desc=$req->post_desc;
 *     $post_status=$req->post_status;
 *     $getDisId=DB::table('categories')->where('id',$post_homeopathy)->first();
 *     $data=array('post_homeopathy'=>$post_homeopathy,'post_diseases'=>$getDisId->id,'p_id'=>$p_id,'post_title'=>...,'post_image'=>$filename,'post_desc'=>...,'post_status'=>...);
 *     $SaveData=DB::table('tbl_post')->where('id',$post_id)->update($data);
 *     return redirect()->back()->with('message', 'Post updated successfully!!');
 *   }
 *
 * P-04's edit-side half: `edit-post.blade.php`'s Category `<select>`
 * submits each category's ID (not slug — see `save-post/route.ts`'s
 * header for the Add-side asymmetry), so `$getDisId=...->where('id',
 * $post_homeopathy)` is a genuine id lookup here, and `post_homeopathy`
 * is stored as the SAME numeric value Add now also produces (per the
 * owner-approved deviation on the Add side) — no fidelity gap on Update,
 * this path was already numeric-consistent in source.
 *
 * NO old-image cleanup performed here (source has no `unlink()` call
 * anywhere in `UpdatePost`, unlike `UpdateBlog`/`UpdateSlider`) —
 * correctly NOT calling `deleteAdminUpload`.
 *
 * `updatedAt` is deliberately NOT bumped — FIX-004 precedent, see
 * `postRepository.ts`'s own note on why this applies uniformly across
 * every table in this project regardless of the `updated_at` column's
 * NOT NULL vs. nullable declaration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { setFlash } from '@/lib/auth/flash';
import { PostRepository } from '@/lib/mongodb/repositories/postRepository';
import { CategoryRepository } from '@/lib/mongodb/repositories/categoryRepository';
import { saveAdminUpload, UploadRejectedError } from '@/lib/uploads/adminUpload';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();
  const origin = request.nextUrl.origin;

  const postId = String(formData.get('post_id') ?? '');

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return NextResponse.redirect(new URL(`/admin/edit-post/${postId}`, origin), 303);
  }

  await requireAdminSession();

  const postHomeopathyRaw = String(formData.get('post_homeopathy') ?? '');
  const postTitle = String(formData.get('post_title') ?? '');
  const pId = String(formData.get('p_id') ?? '');
  const postDesc = String(formData.get('post_desc') ?? '');
  const postStatus = String(formData.get('post_status') ?? '');
  const oldPimage = String(formData.get('old_pimage') ?? '');
  const imageFile = formData.get('post_image');
  const legacyId = Number(postId);
  const postHomeopathyId = Number(postHomeopathyRaw);

  const db = await getDb();
  const categoryRepo = new CategoryRepository(db);

  // Mirrors $getDisId=DB::table('categories')->where('id',$post_homeopathy)->first().
  const category = Number.isFinite(postHomeopathyId)
    ? await categoryRepo.findOne({ legacyId: postHomeopathyId })
    : null;
  if (!category) {
    await setFlash('message', 'Selected category was not found.');
    return NextResponse.redirect(new URL(`/admin/edit-post/${postId}`, origin), 303);
  }

  // Mirrors source's `empty($prod_image)` check.
  let filename = oldPimage;
  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      filename = await saveAdminUpload(imageFile, 'post');
    } catch (error) {
      if (error instanceof UploadRejectedError) {
        await setFlash('message', error.message);
        return NextResponse.redirect(new URL(`/admin/edit-post/${postId}`, origin), 303);
      }
      throw error;
    }
    // Source has no old-image cleanup here — correctly not calling
    // deleteAdminUpload, see file header.
  }

  if (Number.isFinite(legacyId)) {
    const postRepo = new PostRepository(db);
    await postRepo.updatePost(legacyId, {
      pId,
      homeopathyId: category.legacyId,
      diseaseId: category.legacyId,
      postTitle,
      postImage: filename,
      postDesc,
      postStatus: Number(postStatus) || 0,
    });
  }

  // Mirrors redirect()->back()->with('message', 'Post updated successfully!!')
  await setFlash('message', 'Post updated successfully!!');
  return NextResponse.redirect(new URL(`/admin/edit-post/${postId}`, origin), 303);
}
