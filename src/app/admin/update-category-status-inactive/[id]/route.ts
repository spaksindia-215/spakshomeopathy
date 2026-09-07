/**
 * `GET /admin/update-category-status-inactive/{id}` — mirrors
 * `routes/admin.php:67`
 * (`Route::get('update-category-status-inactive/{id}','AdminController@UpdateCategoryStausInactive')`,
 * inside the `userAuth` group).
 *
 * SOURCE (`AdminController.php:427-434`):
 *
 *   public function UpdateCategoryStausInactive($id) {
 *     $id=$id;
 *     $status='0';
 *     $data=array('status'=>$status);
 *     $UpdateData=DB::table('categories')->where('id','=',$id)->update($data);
 *     return redirect()->back()->with('message', 'Category Updated successfully.');
 *   }
 *
 * See the sibling `update-category-status-active/[id]/route.ts`'s header
 * for the full toggle-link mapping confirmation (this route is correctly
 * linked from a currently-ACTIVE row, deactivating it — a real, working
 * toggle, not an inversion).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { setFlash } from '@/lib/auth/flash';
import { CategoryRepository } from '@/lib/mongodb/repositories/categoryRepository';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  await requireAdminSession();

  const { id } = await params;
  const legacyId = Number(id);

  if (Number.isFinite(legacyId)) {
    const db = await getDb();
    const repo = new CategoryRepository(db);
    await repo.updateCategory(legacyId, { status: 0 });
  }

  await setFlash('message', 'Category Updated successfully.');
  return NextResponse.redirect(new URL('/admin/cat-list', request.nextUrl.origin), 303);
}
