/**
 * `POST /admin/save-slider` — mirrors `routes/admin.php:104`
 * (`Route::post('save-slider','AdminController@SaveSlider')`, inside the
 * `userAuth` group).
 *
 * SOURCE (`AdminController.php:1149-1165`):
 *
 *   public function SaveSlider(Request $request) {
 *     $slider_title=$request->slider_title;
 *     $slider_subtitle=$request->slider_subtitle;
 *     $slider_image=$request->file('slider_image');
 *     $filename = time().'g'.$slider_image->getClientOriginalName();
 *     $slider_image->move(public_path('uploaded_files/slider'), $filename);
 *     $slider_status=$request->slider_status;
 *     $data=array('slider_title'=>...,'slider_subtitle'=>...,'slider_image'=>$filename,'slider_status'=>...);
 *     $sliderData=DB::table('slider')->insert($data);
 *     return redirect()->back()->with('message', 'Record saved successfully.');
 *   }
 *
 * D-04 — RESOLVED (Fix Register FIX-003, see
 * `src/lib/uploads/adminUpload.ts`'s header for the full reasoning):
 * `saveAdminUpload` enforces an extension whitelist and sanitizes the
 * original filename, while preserving the `{unix-seconds}g{name}` naming
 * scheme exactly. A rejected extension flashes an error and does NOT
 * insert a `sliders` document — this is the one place this route's
 * OBSERVABLE behavior differs from source's unconditional acceptance,
 * disclosed here and in the Fix Register, not silent.
 *
 * No column-mismatch defect here (unlike B-09) — `slider`'s real columns
 * match what this controller writes exactly; `sliders` collection schema
 * (`schemas/slider.ts`) was already correct, no DR-03-equivalent decision
 * was needed for this entity.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { setFlash } from '@/lib/auth/flash';
import { SliderRepository } from '@/lib/mongodb/repositories/sliderRepository';
import { saveAdminUpload, UploadRejectedError } from '@/lib/uploads/adminUpload';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();
  const origin = request.nextUrl.origin;

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return NextResponse.redirect(new URL('/admin/add-slider', origin), 303);
  }

  await requireAdminSession();

  const sliderTitle = String(formData.get('slider_title') ?? '');
  const sliderSubtitle = String(formData.get('slider_subtitle') ?? '');
  const sliderStatusRaw = String(formData.get('slider_status') ?? '');
  const imageFile = formData.get('slider_image');

  if (!(imageFile instanceof File) || imageFile.size === 0) {
    // Source's own form has `required` on this input (client-side only,
    // no server-side check) — a request that bypasses the browser and
    // omits the file would hit `$slider_image->getClientOriginalName()`
    // on a null UploadedFile and fatal in Laravel. This port responds
    // with a disclosed, non-fatal rejection instead of attempting to
    // reproduce a PHP null-pointer fatal — same reasoning already applied
    // project-wide to B-06-style null-dereference cases that aren't
    // themselves in the BROKEN register.
    await setFlash('message', 'No image file was uploaded.');
    return NextResponse.redirect(new URL('/admin/add-slider', origin), 303);
  }

  let filename: string;
  try {
    filename = await saveAdminUpload(imageFile, 'slider');
  } catch (error) {
    if (error instanceof UploadRejectedError) {
      await setFlash('message', error.message);
      return NextResponse.redirect(new URL('/admin/add-slider', origin), 303);
    }
    throw error;
  }

  const db = await getDb();
  const repo = new SliderRepository(db);
  const legacyId = await repo.nextLegacyIdGeneric();

  await repo.insertSlider({
    legacyId,
    sliderTitle,
    sliderSubtitle,
    sliderImage: filename,
    sliderStatus: Number(sliderStatusRaw) || 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Mirrors redirect()->back()->with('message', 'Record saved successfully.')
  // — back() always resolves to /admin/add-slider, the only page with this
  // form action.
  await setFlash('message', 'Record saved successfully.');
  return NextResponse.redirect(new URL('/admin/add-slider', origin), 303);
}
