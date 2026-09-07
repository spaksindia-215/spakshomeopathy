/**
 * `POST /admin/update-slider` — mirrors `routes/admin.php:106`
 * (`Route::post('update-slider','AdminController@UpdateSlider')`, inside
 * the `userAuth` group).
 *
 * SOURCE (`AdminController.php:1178-1200`):
 *
 *   public function UpdateSlider(Request $request) {
 *     $slider_title=$request->slider_title;
 *     $slider_subtitle=$request->slider_subtitle;
 *     $slider_id=$request->slider_id;
 *     $old_image=$request->old_image;
 *     if($request->hasFile('slider_image')) {
 *       $slider_image=$request->file('slider_image');
 *       $filename = time().'g'.$slider_image->getClientOriginalName();
 *       $slider_image->move(public_path('uploaded_files/slider'), $filename);
 *       if ($old_image!='' && file_exists('uploaded_files/slider/'.$old_image)) {
 *         unlink('uploaded_files/slider/'.$old_image);
 *       }
 *     } else {
 *       $filename=$old_image;
 *     }
 *     $slider_status=$request->slider_status;
 *     $updtSlider=DB::table('slider')->where('id','=',$slider_id)
 *       ->update(['slider_title'=>...,'slider_subtitle'=>...,'slider_image'=>$filename,'slider_status'=>...]);
 *     return redirect()->back()->with('message', 'Record updated successfully.');
 *   }
 *
 * D-04 — RESOLVED (Fix Register FIX-003): same extension whitelist +
 * filename sanitization as `save-slider/route.ts`, applied ONLY when a
 * new file is actually supplied (matching source's `hasFile()` branch —
 * an edit that keeps the existing image performs no upload at all, so no
 * validation question arises for that path either, exactly mirroring
 * source).
 *
 * OLD-IMAGE DELETION ORDER preserved exactly: source deletes the OLD file
 * only AFTER the new one is successfully moved (`move()` before
 * `unlink()`) — this port performs the new upload before calling
 * `deleteAdminUpload` for the same reason: if the new upload fails
 * (rejected extension), the old file must still exist afterward, matching
 * source's own effective behavior (a move() failure in Laravel would
 * throw before reaching the unlink() line, leaving old_image intact).
 *
 * FIX-004, DISCLOSED AND CORRECTED RETROACTIVELY (2026-09-04, found during
 * the blog-categories sub-slice): the ORIGINAL version of this route set
 * `updatedAt: new Date()` on every update — this was WRONG, for the exact
 * same reason as `update-pincode/route.ts`'s own FIX-004 note (see that
 * file's header for the full explanation): `slider.updated_at` has no
 * `ON UPDATE current_timestamp()` clause (confirmed against
 * `Database/db_newhomo.sql:31708-31716`), and source's raw
 * `DB::table()->update([...])` never sets it explicitly either — so on
 * real Laravel it is set once at creation and never changes again.
 * Corrected: `updatedAt` is no longer included in this route's
 * `updateSlider(...)` call.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { setFlash } from '@/lib/auth/flash';
import { SliderRepository } from '@/lib/mongodb/repositories/sliderRepository';
import { saveAdminUpload, deleteAdminUpload, UploadRejectedError } from '@/lib/uploads/adminUpload';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();
  const origin = request.nextUrl.origin;

  const sliderId = String(formData.get('slider_id') ?? '');

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return NextResponse.redirect(new URL(`/admin/edit-slider/${sliderId}`, origin), 303);
  }

  await requireAdminSession();

  const sliderTitle = String(formData.get('slider_title') ?? '');
  const sliderSubtitle = String(formData.get('slider_subtitle') ?? '');
  const sliderStatusRaw = String(formData.get('slider_status') ?? '');
  const oldImage = String(formData.get('old_image') ?? '');
  const imageFile = formData.get('slider_image');
  const legacyId = Number(sliderId);

  let filename = oldImage;
  // Mirrors source's `$request->hasFile('slider_image')` check — a File
  // with size 0 is treated as "no file supplied" (the same effective
  // outcome as Laravel's hasFile(), which returns false for an empty
  // upload field).
  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      filename = await saveAdminUpload(imageFile, 'slider');
    } catch (error) {
      if (error instanceof UploadRejectedError) {
        await setFlash('message', error.message);
        return NextResponse.redirect(new URL(`/admin/edit-slider/${sliderId}`, origin), 303);
      }
      throw error;
    }
    await deleteAdminUpload(oldImage, 'slider');
  }

  if (Number.isFinite(legacyId)) {
    const db = await getDb();
    const repo = new SliderRepository(db);
    // FIX-004 (§ file header, added retroactively): updatedAt is
    // deliberately NOT bumped here — see this route's header for why.
    await repo.updateSlider(legacyId, {
      sliderTitle,
      sliderSubtitle,
      sliderImage: filename,
      sliderStatus: Number(sliderStatusRaw) || 0,
    });
  }
  // Non-numeric/invalid slider_id: same silent zero-row no-op reasoning
  // as update-pincode/route.ts.

  await setFlash('message', 'Record updated successfully.');
  return NextResponse.redirect(new URL(`/admin/edit-slider/${sliderId}`, origin), 303);
}
