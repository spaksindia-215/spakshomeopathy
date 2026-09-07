/**
 * `GET /admin/destroy-slider/{id}` — mirrors `routes/admin.php:107`
 * (`Route::get('destroy-slider/{id}','AdminController@DestroySlider')`,
 * inside the `userAuth` group).
 *
 * SOURCE (`AdminController.php:1207-1217`):
 *
 *   public function DestroySlider($id) {
 *     $getSlider=DB::table('slider')->where('id','=',$id)->first();
 *     $image=$getSlider->slider_image;
 *     if ($image!='' && file_exists('uploaded_files/slider/'.$image)) {
 *       unlink('uploaded_files/slider/'.$image);
 *     }
 *     $delBlog=DB::table('slider')->where('id','=',$id)->delete();
 *     return redirect()->back()->with('message', 'Record deleted successfully.');
 *   }
 *
 * Reads the row FIRST (to get its image filename), deletes the file, THEN
 * deletes the row — same order preserved here. GET, not POST (IR-3), no
 * CSRF check (same `cancel-order`/`destroy-pincode` precedent — Laravel's
 * VerifyCsrfToken exempts GET entirely).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { setFlash } from '@/lib/auth/flash';
import { SliderRepository } from '@/lib/mongodb/repositories/sliderRepository';
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
    const repo = new SliderRepository(db);
    const slider = await repo.findByLegacyId(legacyId);
    if (slider) {
      await deleteAdminUpload(slider.sliderImage, 'slider');
      await repo.deleteSlider(legacyId);
    }
    // No matching row: source's own $getSlider->slider_image would fatal
    // on null in that case (a property access on a null object) — but
    // this is not a currently-catalogued BROKEN item (no BROKEN register
    // entry covers DestroySlider), and this route is only ever reached
    // via slider-list's own generated links to real ids, never a
    // hand-crafted arbitrary id in practice. Treated as a clean no-op
    // rather than reproducing an uncatalogued PHP fatal, consistent with
    // this project's established handling of similar non-BROKEN-register
    // null-dereference edges (e.g. update-pincode's non-matching pin_id).
  }

  // Mirrors redirect()->back()->with('message', 'Record deleted successfully.')
  // — back() always resolves to /admin/slider-list, the only page linking
  // to this route.
  await setFlash('message', 'Record deleted successfully.');
  return NextResponse.redirect(new URL('/admin/slider-list', request.nextUrl.origin), 303);
}
