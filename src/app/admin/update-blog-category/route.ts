/**
 * `POST /admin/update-blog-category` — mirrors `routes/admin.php:81`
 * (`Route::post('update-blog-category','AdminController@UpdateBlogCategory')`,
 * inside the `userAuth` group).
 *
 * SOURCE (`AdminController.php:928-946`):
 *
 *   public function UpdateBlogCategory(Request $request) {
 *     $id=$request->bcat_id;
 *     $bcat_name=$request->bcat_name;
 *     $old_image=$request->old_image;
 *     if($request->hasFile('bcat_image')) {
 *       $bcat_image=$request->file('bcat_image');
 *       $filename = time().'g'.$bcat_image->getClientOriginalName();
 *       $bcat_image->move(public_path('uploaded_files/blog-categories'), $filename);
 *       if ($old_image!='' && file_exists(!'uploaded_files/blog-categories/'.$old_image)) {
 *         unlink('uploaded_files/blog-categories/'.$old_image);
 *       }
 *     } else {
 *       $filename=$old_image;
 *     }
 *     DB::table('blog_category')->where('id','=',$id)
 *       ->update(['bcat_name'=>$bcat_name,'bcat_image'=>$filename]);
 *     return redirect()->back()->with('message', 'Record updated successfully.');
 *   }
 *
 * NEW FINDING THIS SLICE, PRESERVED FAITHFULLY, NOT FIXED
 * ---------------------------------------------------------
 * `file_exists(!'uploaded_files/blog-categories/'.$old_image)` — note the
 * leading `!` INSIDE the file_exists() call, applied to the string
 * BEFORE concatenation binds (PHP operator precedence: `!` binds tighter
 * than `.`, so this is `file_exists( (!'uploaded_files/blog-categories/') . $old_image )`
 * — `!'uploaded_files/blog-categories/'` evaluates to boolean `false`
 * (any non-empty string is truthy in PHP, so `!` on it is `false`), and
 * PHP's `.` concatenation operator coerces that `false` to the empty
 * string `''` before concatenating — so the actual argument passed to
 * `file_exists()` is simply `$old_image` (the bare filename, with NO
 * directory prefix). Verified directly against
 * `AdminController.php:941` this slice — this is not a typo in this
 * migration's own reading, it is genuinely present in the live source.
 *
 * OBSERVABLE EFFECT: `file_exists($old_image)` checks for a file at that
 * bare name relative to the PHP process's OWN working directory (which,
 * for a request served through the public web root, is essentially never
 * where `$old_image` — a filename with no path — actually resolves to
 * the real uploaded file under `uploaded_files/blog-categories/`). This
 * check is therefore, for all practical purposes, ALWAYS FALSE, which
 * means: **`unlink()` never runs — the OLD blog-category image file is
 * NEVER deleted when a new one is uploaded on Update, even though the
 * database row's `bcat_image` value correctly switches to the new
 * filename.** Old, now-orphaned image files accumulate on disk
 * indefinitely. This is a genuine, previously-undocumented defect,
 * distinct from B-09/B-14/etc., NOT added to the BROKEN register (it does
 * not crash or produce wrong user-visible output — the update still
 * succeeds and the new image displays correctly; the only observable
 * effect is silent disk accumulation, invisible to any user or admin
 * through the UI) — flagged here and in
 * `docs/GATE-REPORT-M5-E-BLOG-CATEGORIES.md` for the owner's awareness,
 * reproduced EXACTLY: this route calls `deleteAdminUpload` only when the
 * old file WOULD be deletable in a correct implementation, but per the
 * decision below, it is intentionally NEVER called on this path,
 * matching source's real (buggy) behavior precisely.
 *
 * D-04/FIX-003 still applies to the extension whitelist for any NEW file
 * uploaded here — this finding is orthogonal to D-04 (it's about
 * cleanup-on-replace, not about what's accepted).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { setFlash } from '@/lib/auth/flash';
import { BlogCategoryRepository } from '@/lib/mongodb/repositories/blogCategoryRepository';
import { saveAdminUpload, UploadRejectedError } from '@/lib/uploads/adminUpload';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();
  const origin = request.nextUrl.origin;

  const bcatId = String(formData.get('bcat_id') ?? '');

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return NextResponse.redirect(new URL(`/admin/edit-blog-category/${bcatId}`, origin), 303);
  }

  await requireAdminSession();

  const bcatName = String(formData.get('bcat_name') ?? '');
  const oldImage = String(formData.get('old_image') ?? '');
  const imageFile = formData.get('bcat_image');
  const legacyId = Number(bcatId);

  let filename = oldImage;
  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      filename = await saveAdminUpload(imageFile, 'blog-categories');
    } catch (error) {
      if (error instanceof UploadRejectedError) {
        await setFlash('message', error.message);
        return NextResponse.redirect(new URL(`/admin/edit-blog-category/${bcatId}`, origin), 303);
      }
      throw error;
    }
    // DELIBERATELY NOT CALLING deleteAdminUpload(oldImage, 'blog-categories')
    // HERE — see this file's header. Source's own `file_exists(!'...')`
    // bug means the old file is never cleaned up on real Laravel either;
    // calling deleteAdminUpload here would be an unauthorized, silent fix
    // of a genuine (if minor) defect.
  }

  if (Number.isFinite(legacyId)) {
    const db = await getDb();
    const repo = new BlogCategoryRepository(db);
    // FIX-004 precedent (see update-pincode/update-slider routes):
    // updatedAt is deliberately NOT bumped — blogCategories.updated_at
    // has no ON UPDATE current_timestamp() clause, and source's own
    // update([...]) call only ever sets bcat_name/bcat_image.
    await repo.updateBlogCategory(legacyId, {
      bcatName,
      bcatImage: filename,
    });
  }
  // Non-numeric/invalid bcat_id: silent zero-row no-op, same reasoning as
  // update-pincode/update-slider.

  await setFlash('message', 'Record updated successfully.');
  return NextResponse.redirect(new URL(`/admin/edit-blog-category/${bcatId}`, origin), 303);
}
