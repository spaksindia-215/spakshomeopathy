/**
 * `POST /admin/save-other-category` — mirrors `routes/admin.php:34`
 * (`Route::post('save-other-category','AdminController@SaveOtherCategory')`,
 * inside the `userAuth` group).
 *
 * SOURCE (`AdminController.php:117-140`):
 *
 *   public function SaveOtherCategory(Request $request) {
 *     $p_cat=$request->p_cat;
 *     $p_subcat=$request->p_subcat;
 *     $cat_name=$request->cat_name;
 *     $parent_id=$p_subcat;
 *     $cat_level=3;
 *     $cat_slug=$this->convert_to_slug($cat_name);
 *     if ($request->hasFile('cat_image')) { ... } else { $filename=''; }
 *     $cat_status= $request->cat_status;
 *     $data=array('parent_id'=>$parent_id,'cat_name'=>...,'cat_image'=>$filename,'cat_level'=>3,'cat_slug'=>...,'cat_status'=>...);
 *     DB::table('product_category')->insert($data);
 *     return redirect()->back()->with('message', 'Record saved successfully.');
 *   }
 *
 * `parent_id` is stored from `$p_subcat` — `p_cat` (the Main Category
 * selection) is READ BUT NEVER USED anywhere in this method beyond being
 * assigned to an unused local variable. Confirmed directly this slice:
 * `$p_cat` never appears again after its own assignment line. Dead read,
 * not reproduced as a stored field (there is nowhere to store it even if
 * it mattered — `product_category` has no `p_cat`-equivalent column).
 *
 * ★ CRITICAL FIDELITY NOTE, VERIFIED AGAINST THE ACTUAL RENDERED FORM
 * THIS SESSION: `add-other-category.blade.php`'s `p_subcat` `<select>`
 * starts as a single `--Select--` placeholder option and is populated
 * ONLY by an AJAX call to `getsub-category/{id}`
 * (`SellerController@GetSubCat`) when `p_cat` changes — and that route's
 * controller CLASS DOES NOT EXIST ANYWHERE IN THIS CODEBASE (already
 * catalogued: `docs/M5-PREFLIGHT-AUDIT.md` §1 finding 1, B-05). **On real
 * Laravel today, this AJAX call always fails, `p_subcat` is NEVER
 * populated with real options, and every genuine "Other Category" save
 * therefore submits `p_subcat=''`** — meaning `parent_id` is stored as an
 * EMPTY STRING on every real submission, not a valid category id. This
 * route reproduces that exact broken end-to-end behavior: no AJAX
 * endpoint is built (B-05 is explicitly out of this sub-slice's scope,
 * per the owner's own scoping decision), and `p_subcat`'s submitted value
 * (whatever it is — realistically always empty) is stored as-is, with no
 * lookup/validation, matching source's `$parent_id=$p_subcat` assignment
 * exactly.
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
    return redirectTo('/admin/add-other-category', 303);
  }

  await requireAdminSession();

  // $p_cat is read here for source-parity, matching Laravel's own dead
  // assignment, then intentionally never used again — see file header.
  void formData.get('p_cat');
  const pSubcat = String(formData.get('p_subcat') ?? '');
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
        return redirectTo('/admin/add-other-category', 303);
      }
      throw error;
    }
  }

  const catSlug = convertToSlug(catName);
  // Stored as-submitted, matching $parent_id=$p_subcat exactly — a
  // realistic real-world submission is an empty string (see file header),
  // stored as null (the closest MongoDB equivalent to an unset/empty
  // MariaDB int column value written from an empty POST field).
  const parentIdNum = Number(pSubcat);

  const db = await getDb();
  const repo = new ProductCategoryRepository(db);
  const legacyId = await repo.nextLegacyIdGeneric();

  await repo.insertProductCategory({
    legacyId,
    parentId: pSubcat !== '' && Number.isFinite(parentIdNum) ? parentIdNum : null,
    catName,
    catImage: filename,
    catLevel: 3,
    catSlug,
    catStatus: Number(catStatus) || 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await setFlash('message', 'Record saved successfully.');
  return redirectTo('/admin/add-other-category', 303);
}
