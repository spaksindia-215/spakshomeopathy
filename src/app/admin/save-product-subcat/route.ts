/**
 * `POST /admin/save-product-subcat` — mirrors `routes/admin.php:31`
 * (`Route::post('save-product-subcat','AdminController@SaveProductSubCat')`,
 * inside the `userAuth` group).
 *
 * SOURCE (`AdminController.php:161-178`):
 *
 *   public function SaveProductSubCat(Request $request) {
 *     $cat_name=$request->cat_name;
 *     $parent_id=$request->parent_id;
 *     $cat_level=2;
 *     $cat_slug=$this->convert_to_slug($cat_name);
 *     if ($request->hasFile('cat_image')) {
 *       $cat_image=$request->file('cat_image');
 *       $filename = time().'g'.$cat_image->getClientOriginalName();
 *       $cat_image->move(public_path('uploaded_files/product-categories'), $filename);
 *     } else {
 *       $filename ="";
 *     }
 *     $cat_status= $request->cat_status;
 *     $data=array('parent_id'=>...,'cat_name'=>...,'cat_image'=>$filename,'cat_level'=>2,'cat_slug'=>...,'cat_status'=>...);
 *     DB::table('product_category')->insert($data);
 *     return redirect()->back()->with('message', 'Record saved successfully.');
 *   }
 *
 * `parent_id` is the submitted top-level category's id, from
 * `add-product-subcategory.blade.php`'s `<select name="parent_id">`
 * (populated by `AddProductSubCategory`'s `where('parent_id','=','0')`
 * query — i.e. only real top-level categories, never sub- or
 * other-categories, since only cat_level=1 rows ever have parent_id=0).
 * No validation on `parent_id` here — an invalid/missing value is stored
 * as-submitted, matching source exactly (no `->where('id',$parent_id)
 * ->first()` existence check anywhere in this method, unlike `SavePost`'s
 * category lookup).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { setFlash } from '@/lib/auth/flash';
import { ProductCategoryRepository } from '@/lib/mongodb/repositories/categoryRepository';
import { saveAdminUpload, UploadRejectedError } from '@/lib/uploads/adminUpload';
import { convertToSlug } from '@/lib/adminSlug';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();
  const origin = request.nextUrl.origin;

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return NextResponse.redirect(new URL('/admin/add-product-subcategory', origin), 303);
  }

  await requireAdminSession();

  const catName = String(formData.get('cat_name') ?? '');
  const parentIdRaw = String(formData.get('parent_id') ?? '');
  const catStatus = String(formData.get('cat_status') ?? '');
  const imageFile = formData.get('cat_image');

  let filename = '';
  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      filename = await saveAdminUpload(imageFile, 'product-categories');
    } catch (error) {
      if (error instanceof UploadRejectedError) {
        await setFlash('message', error.message);
        return NextResponse.redirect(new URL('/admin/add-product-subcategory', origin), 303);
      }
      throw error;
    }
  }

  const catSlug = convertToSlug(catName);
  const parentIdNum = Number(parentIdRaw);

  const db = await getDb();
  const repo = new ProductCategoryRepository(db);
  const legacyId = await repo.nextLegacyIdGeneric();

  await repo.insertProductCategory({
    legacyId,
    // Stored as-submitted, no existence check — matches source exactly.
    // An empty/non-numeric submission stores null, the closest MongoDB
    // equivalent to an unset/invalid MariaDB int column value.
    parentId: Number.isFinite(parentIdNum) ? parentIdNum : null,
    catName,
    catImage: filename,
    catLevel: 2,
    catSlug,
    catStatus: Number(catStatus) || 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await setFlash('message', 'Record saved successfully.');
  return NextResponse.redirect(new URL('/admin/add-product-subcategory', origin), 303);
}
