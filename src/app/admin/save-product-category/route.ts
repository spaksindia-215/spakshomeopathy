/**
 * `POST /admin/save-product-category` — mirrors `routes/admin.php:26`
 * (`Route::post('save-product-category','AdminController@SaveProductCategory')`,
 * inside the `userAuth` group).
 *
 * SOURCE (`AdminController.php:54-73`):
 *
 *   public function SaveProductCategory(Request $request) {
 *     $cat_name=$request->cat_name;
 *     $parent_id=0;
 *     $cat_level=1;
 *     $cat_slug=$this->convert_to_slug($cat_name);
 *     if ($request->hasFile('cat_image')) {
 *       $cat_image=$request->file('cat_image');
 *       $filename = time().'g'.$cat_image->getClientOriginalName();
 *       $cat_image->move(public_path('uploaded_files/product-categories'), $filename);
 *     } else {
 *       $filename='';
 *     }
 *     $cat_status= $request->cat_status;
 *     $data=array('parent_id'=>0,'cat_name'=>...,'cat_image'=>$filename,'cat_level'=>1,'cat_slug'=>...,'cat_status'=>...);
 *     DB::table('product_category')->insert($data);
 *     return redirect()->back()->with('message', 'Record saved successfully.');
 *   }
 *
 * ★ THIS SAME ROUTE IS ALSO `edit-product-category.blade.php`'s form
 * ACTION — confirmed directly this slice, source line 56. THIS IS A
 * GENUINE, PREVIOUSLY-UNDOCUMENTED BROKEN "EDIT" PAGE, NOT A FIDELITY
 * QUESTION THIS ROUTE RESOLVES: the Edit form has NO hidden `id` field
 * (confirmed, full-file grep of `edit-product-category.blade.php` finds
 * none) and POSTs to THIS SavePost-shaped handler, which ALWAYS inserts a
 * brand-new row with `parent_id=0`/`cat_level=1` — it never looks up or
 * updates the category being "edited." Submitting the Edit form
 * therefore silently creates a DUPLICATE top-level category and leaves
 * the original completely untouched. This route reproduces that exact
 * behavior — it does not distinguish an Add-originated submission from
 * an Edit-originated one (source cannot either; both post to the
 * identical URL with the identical field set). No `id`/`legacyId` is
 * ever read from this request. NOT added to the BROKEN register (B-#) or
 * a new Fix Register candidate by this session — flagged here and in
 * `docs/GATE-REPORT-M5-E-PRODUCT-CATEGORIES.md` for the owner's
 * awareness; the disposition (reproduce forever vs. treat as a Fix
 * Register candidate) is the owner's to decide, not defaulted here.
 *
 * P-07: slug via `convertToSlug` (same algorithm as blog
 * categories/blogs/products).
 *
 * NO null-guard needed here (unlike Savecategory/SaveBlog/SavePost) —
 * `hasFile('cat_image')` IS checked, matching the OTHER two Save
 * handlers on this same table (`SaveProductSubCat`/`SaveOtherCategory`),
 * all three of which correctly guard their upload, unlike the
 *`categories`/`blogs`/`posts` Add handlers' documented gap.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { setFlash } from '@/lib/auth/flash';
import { ProductCategoryRepository } from '@/lib/mongodb/repositories/categoryRepository';
import { saveAdminUpload, UploadRejectedError } from '@/lib/uploads/adminUpload';
import { convertToSlug } from '@/lib/adminSlug';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return redirectTo('/admin/add-product-category', 303);
  }

  await requireAdminSession();

  const catName = String(formData.get('cat_name') ?? '');
  const catStatus = String(formData.get('cat_status') ?? '');
  const imageFile = formData.get('cat_image');

  let filename = '';
  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      filename = await saveAdminUpload(imageFile, 'product-categories');
    } catch (error) {
      if (error instanceof UploadRejectedError) {
        await setFlash('message', error.message);
        return redirectTo('/admin/add-product-category', 303);
      }
      throw error;
    }
  }

  const catSlug = convertToSlug(catName);

  const db = await getDb();
  const repo = new ProductCategoryRepository(db);
  const legacyId = await repo.nextLegacyIdGeneric();

  await repo.insertProductCategory({
    legacyId,
    parentId: 0,
    catName,
    catImage: filename,
    catLevel: 1,
    catSlug,
    catStatus: Number(catStatus) || 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await setFlash('message', 'Record saved successfully.');
  return redirectTo('/admin/add-product-category', 303);
}
