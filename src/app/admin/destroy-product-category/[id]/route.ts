/**
 * `GET /admin/destroy-product-category/{id}` — mirrors
 * `routes/admin.php:37`
 * (`Route::get('destroy-product-category/{id}','AdminController@DestroyCategory')`,
 * inside the `userAuth` group).
 *
 * SOURCE (`AdminController.php:188-201`):
 *
 *   public function DestroyCategory($id) {
 *     $getData=DB::table('product_category')->where('id','=',$id)->first();
 *     if($getData->cat_image!='') {
 *       if(file_exists(public_path('uploaded_files/product-categories/'.$getData->cat_image))){
 *         unlink(public_path('uploaded_files/product-categories/'.$getData->cat_image));
 *       }
 *     }
 *     $DelCat=DB::table('product_category')->where('id','=',$id)->delete();
 *     return redirect()->back()->with('message', 'Category deleted successfully.');
 *   }
 *
 * ★ THIS IS THE SHARED DELETE HANDLER FOR ALL THREE CATEGORY LEVELS —
 * verified directly this slice: `product-category-list.blade.php`,
 * `product-subcategory-list.blade.php`, AND
 * `other-category-list.blade.php` all link their delete action to this
 * SAME `destroy-product-category/{id}` URL, not level-specific routes.
 * `DestroyCategory` itself performs no `cat_level` filtering — it deletes
 * whatever row matches the id, regardless of level. One route correctly
 * serves all three list pages.
 *
 * NOTE: `ProductCategoryList` (`AdminController.php:79-91`) ALSO contains
 * a second, near-identical delete implementation — but it sits entirely
 * AFTER that method's own `return` statement, making it genuinely dead,
 * unreachable code (confirmed directly this slice). `DestroyCategory`
 * (the actually-routed method, above) is the real, live handler — not
 * that dead code. Not reproduced from the dead copy; this route mirrors
 * `DestroyCategory` only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { setFlash } from '@/lib/auth/flash';
import { ProductCategoryRepository } from '@/lib/mongodb/repositories/categoryRepository';
import { deleteAdminUpload } from '@/lib/uploads/adminUpload';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  await requireAdminSession();

  const { id } = await params;
  const legacyId = Number(id);

  if (Number.isFinite(legacyId)) {
    const db = await getDb();
    const repo = new ProductCategoryRepository(db);
    const category = await repo.findByLegacyId(legacyId);
    if (category) {
      await deleteAdminUpload(category.catImage ?? '', 'product-categories');
      await repo.deleteProductCategory(legacyId);
    }
  }

  // Mirrors redirect()->back()->with('message', 'Category deleted successfully.')
  // — the referring page could be any of the 3 list pages; redirect
  // targets a fixed destination (product-category-list, the top-level
  // list) same as every other route.ts in this project's own
  // fixed-target-instead-of-Referer-parsing convention.
  await setFlash('message', 'Category deleted successfully.');
  return redirectTo('/admin/product-category-list', 303);
}
