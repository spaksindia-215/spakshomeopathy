/**
 * `POST /admin/update-category` — mirrors `routes/admin.php:65`
 * (`Route::post('update-category','AdminController@UpdateCategory')`,
 * inside the `userAuth` group).
 *
 * SOURCE (`AdminController.php:393-415`):
 *
 *   public function UpdateCategory(Request $req) {
 *     $name=$req->name;
 *     $type=$req->type;
 *     $status=$req->status;
 *     $old_image=$req->old_image;
 *     $id=$req->id;
 *     $prod_image=$req->file('image');
 *     if(empty($prod_image)) {
 *       $filename=$old_image;
 *     } else {
 *       $filename = time().'g'.$prod_image->getClientOriginalName();
 *       $prod_image->move(public_path('uploaded_files/categories'), $filename);
 *       $imgdata=array('id'=>$id,'image'=>$filename); // ← dead local var, never used
 *     }
 *     $data=array('name'=>$name,'image'=>$filename,'type'=>$type,'status'=>$status);
 *     $UpdateData=DB::table('categories')->where('id','=',$id)->update($data);
 *     return redirect()->back()->with('message', 'Category Updated successfully.');
 *   }
 *
 * NOTE: `$imgdata` (assigned inside the `else` branch) is NEVER read
 * anywhere in this method — dead code, confirmed directly this slice.
 * Not reproduced (contract §12.4: commented/dead code carries no
 * authority — this isn't commented, but assigning-and-never-reading has
 * no observable effect to reproduce either).
 *
 * IMAGE FIELD NAME DIFFERS FROM ADD: `image`, not `c_image` — already
 * documented in `edit-category/[id]/page.tsx`'s own header, confirmed
 * again here against the controller side.
 *
 * `type` accepts whatever was submitted (source has NO validation here
 * either — same absence as Add). UNLIKE `save-cat/route.ts`, this route
 * does NOT reject an empty/invalid `type`: the Edit form's `<select>`
 * always has a real `defaultValue` (the existing category's own value,
 * always a valid `'N'`/`'H'` from a previously-successful save), so an
 * empty submission here would require a user to actively override a
 * pre-filled valid selection back to blank — a materially different,
 * far less likely scenario than Add's genuinely-empty-by-default select.
 * Still guarded defensively (falls through to the same rejection) since
 * the underlying Zod-schema-vs-MariaDB-enum uncertainty is identical.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { setFlash } from '@/lib/auth/flash';
import { CategoryRepository } from '@/lib/mongodb/repositories/categoryRepository';
import { saveAdminUpload, UploadRejectedError } from '@/lib/uploads/adminUpload';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();
  const origin = request.nextUrl.origin;

  const id = String(formData.get('id') ?? '');

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return NextResponse.redirect(new URL(`/admin/edit-category/${id}`, origin), 303);
  }

  await requireAdminSession();

  const name = String(formData.get('name') ?? '');
  const type = String(formData.get('type') ?? '');
  const status = String(formData.get('status') ?? '');
  const oldImage = String(formData.get('old_image') ?? '');
  const imageFile = formData.get('image');
  const legacyId = Number(id);

  if (type !== 'N' && type !== 'H') {
    // See file header — same disclosed rejection reasoning as
    // save-cat/route.ts, even though this path is far less likely to be
    // reached in practice.
    await setFlash('message', 'Please select a category type.');
    return NextResponse.redirect(new URL(`/admin/edit-category/${id}`, origin), 303);
  }

  // Mirrors source's `empty($prod_image)` check — same "no file supplied"
  // treatment as pincode/slider/blog-category's own hasFile()-equivalent
  // handling.
  let filename = oldImage;
  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      filename = await saveAdminUpload(imageFile, 'categories');
    } catch (error) {
      if (error instanceof UploadRejectedError) {
        await setFlash('message', error.message);
        return NextResponse.redirect(new URL(`/admin/edit-category/${id}`, origin), 303);
      }
      throw error;
    }
    // Source performs NO old-image cleanup on Update here at all (no
    // unlink() call anywhere in UpdateCategory, unlike UpdateSlider or
    // even UpdateBlogCategory's dead-but-present attempt) — correctly
    // NOT calling deleteAdminUpload, matching that total absence exactly.
  }

  if (Number.isFinite(legacyId)) {
    const db = await getDb();
    const repo = new CategoryRepository(db);
    await repo.updateCategory(legacyId, {
      name,
      image: filename,
      type,
      status: Number(status) || 0,
    });
  }
  // Non-numeric/invalid id: silent zero-row no-op, same reasoning as
  // every other update route this project has built.

  await setFlash('message', 'Category Updated successfully.');
  return NextResponse.redirect(new URL(`/admin/edit-category/${id}`, origin), 303);
}
