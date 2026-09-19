/**
 * `POST /admin/save-post` — mirrors `routes/admin.php:42`
 * (`Route::post('save-post','AdminController@SavePost')`, inside the
 * `userAuth` group).
 *
 * SOURCE (`AdminController.php:849-871`):
 *
 *   public function SavePost(Request $req) {
 *     $getHomo=DB::table('categories')->orderBy('name','ASC')->get(); // ← unused return value, dead
 *     $post_homeopathy=$req->post_homeopathy;
 *     $post_title=$req->post_title;
 *     $p_id=$req->p_id;
 *     $prod_image=$req->file('p_pimage');
 *     $filename=$req->old_pimage;                              // ← dead, overwritten next line
 *     $filename = time().'g'.$prod_image->getClientOriginalName();
 *     $prod_image->move(public_path('uploaded_files/post'), $filename);
 *     $post_desc=$req->post_desc;
 *     $post_status=$req->post_status;
 *     $getDisId=DB::table('categories')->where('slug',$post_homeopathy)->first();
 *     $data=array('post_homeopathy'=>$post_homeopathy,'post_diseases'=>$getDisId->id,'p_id'=>$p_id,'post_title'=>...,'post_image'=>$filename,'post_desc'=>...,'post_status'=>...);
 *     $SaveData=DB::table('tbl_post')->insert($data);
 *     return redirect()->back()->with('message', 'Post added successfully!!');
 *   }
 *
 * P-04 (create-by-slug/edit-by-id asymmetry) — SOURCE-CONFIRMED, EXACT
 * MECHANICS (verified directly this slice, going further than the
 * pre-existing `schemas/post.ts` note): `add-post.blade.php`'s Category
 * `<select>` submits each category's SLUG as `post_homeopathy`
 * (`option value="{{$row->slug}}"`, confirmed line 249) — Laravel then
 * looks that slug up (`$getDisId`) ONLY to populate `post_diseases`
 * (always a numeric `categories.id`, matching `postSchema.diseaseId`).
 * **`post_homeopathy` ITSELF is stored as the RAW SUBMITTED SLUG STRING**,
 * unconditionally — Laravel's own `$data` array never resolves it.
 *
 * OWNER-APPROVED DEVIATION FROM THIS SPECIFIC BEHAVIOR (2026-09-04,
 * disclosed and decided before implementation — contract §10.1 Step 6):
 * every one of the 414 real historical `tbl_post` rows has a NUMERIC
 * `post_homeopathy` (confirmed by direct inspection of
 * `Database/db_newhomo.sql`'s INSERT statements this slice — matches
 * `post_diseases` exactly on every sampled row), and every downstream
 * consumer of this field in this codebase (the pre-existing
 * `postSchema.homeopathyId: number|null` type, the `posts_homeopathyId`
 * index, the migration transform's `n(row.post_homeopathy)` numeric
 * coercion, and `src/lib/demo/posts.ts`'s public-facing
 * `getPostsByHomeopathy(homeopathyId: number)`) already assumes it is
 * ALWAYS numeric. Storing a raw slug string here — Laravel's literal,
 * un-corrected behavior — would introduce a genuine, previously-
 * nonexistent type inconsistency into a column every other part of this
 * project treats as reliably numeric. The owner was presented with this
 * exact tradeoff and selected: **resolve the slug to `$getDisId->id`
 * before storing**, so `post_homeopathy` is written as the SAME numeric
 * value as `post_diseases` on every new post — matching UpdatePost's own
 * storage format and every real historical row, not Laravel's literal
 * (never-yet-triggered-against-a-surviving-row) storage bug. This is a
 * disclosed, narrow deviation — NOT a silent "obvious bug" fix; it was
 * raised and decided explicitly, not defaulted into. `post_diseases` and
 * `post_homeopathy` are therefore always identical on posts created
 * through this route, by design.
 *
 * NEW FINDING, PRESERVED, NOT FIXED: `$prod_image=$req->file('p_pimage')`
 * has NO `hasFile()`/`empty()` guard (same class as `Savecategory`/
 * `SaveBlog`, `docs/GATE-REPORT-M3.md` §6.2 Finding 6) — `p_pimage` DOES
 * carry `required` in source (`add-post.blade.php:117`), same
 * client-side-only caveat as blogs' equivalent field. Disclosed,
 * non-fatal rejection reproduced, same established pattern.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { setFlash } from '@/lib/auth/flash';
import { PostRepository } from '@/lib/mongodb/repositories/postRepository';
import { CategoryRepository } from '@/lib/mongodb/repositories/categoryRepository';
import { saveAdminUpload, UploadRejectedError } from '@/lib/uploads/adminUpload';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return redirectTo('/admin/add-post', 303);
  }

  await requireAdminSession();

  const postHomeopathySlug = String(formData.get('post_homeopathy') ?? '');
  const postTitle = String(formData.get('post_title') ?? '');
  const pId = String(formData.get('p_id') ?? '');
  const postDesc = String(formData.get('post_desc') ?? '');
  const postStatus = String(formData.get('post_status') ?? '');
  const imageFile = formData.get('p_pimage');

  if (!(imageFile instanceof File) || imageFile.size === 0) {
    await setFlash('message', 'No image file was uploaded.');
    return redirectTo('/admin/add-post', 303);
  }

  const db = await getDb();
  const categoryRepo = new CategoryRepository(db);

  // Mirrors `$getDisId=DB::table('categories')->where('slug',$post_homeopathy)->first()`.
  const category = await categoryRepo.findOne({ slug: postHomeopathySlug });
  if (!category) {
    // Source's own $getDisId->id on a null $getDisId would fatal here —
    // disclosed, non-fatal rejection instead, same established pattern.
    await setFlash('message', 'Selected category was not found.');
    return redirectTo('/admin/add-post', 303);
  }

  let filename: string;
  try {
    filename = await saveAdminUpload(imageFile, 'post');
  } catch (error) {
    if (error instanceof UploadRejectedError) {
      await setFlash('message', error.message);
      return redirectTo('/admin/add-post', 303);
    }
    throw error;
  }

  const postRepo = new PostRepository(db);
  const legacyId = await postRepo.nextLegacyIdGeneric();

  await postRepo.insertPost({
    legacyId,
    pId,
    // Owner-approved deviation (see file header): resolved to the
    // category's numeric id, NOT the raw submitted slug.
    homeopathyId: category.legacyId,
    diseaseId: category.legacyId,
    postTitle,
    postImage: filename,
    postDesc,
    postStatus: Number(postStatus) || 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Mirrors redirect()->back()->with('message', 'Post added successfully!!')
  // — exact text, including the double exclamation mark, preserved.
  await setFlash('message', 'Post added successfully!!');
  return redirectTo('/admin/add-post', 303);
}
