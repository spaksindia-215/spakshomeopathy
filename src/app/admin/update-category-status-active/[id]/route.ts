/**
 * `GET /admin/update-category-status-active/{id}` — mirrors
 * `routes/admin.php:66`
 * (`Route::get('update-category-status-active/{id}','AdminController@UpdateCategoryStausActive')`,
 * inside the `userAuth` group). Note the source METHOD NAME TYPO
 * ("Staus", not "Status") — preserved in this file's own comments for
 * traceability, though the route PATH itself is spelled correctly
 * ("status") and is what NN-3 actually governs.
 *
 * SOURCE (`AdminController.php:418-425`):
 *
 *   public function UpdateCategoryStausActive($id) {
 *     $id=$id;
 *     $status='1';
 *     $data=array('status'=>$status);
 *     $UpdateData=DB::table('categories')->where('id','=',$id)->update($data);
 *     return redirect()->back()->with('message', 'Category Updated successfully.');
 *   }
 *
 * `cat-list/page.tsx`'s own toggle link renders THIS route (`-active`)
 * for a currently-INACTIVE category (`status===0`, labeled "Deativate"
 * [sic — preserved typo]), and the sibling `-inactive` route for a
 * currently-ACTIVE one (labeled "Active") — verified directly against
 * that page's own pre-existing, unmodified href logic this slice. This
 * IS a correctly-functioning toggle (clicking a currently-inactive row's
 * link activates it, and vice versa), not an inversion — confirmed here
 * explicitly since an earlier draft of this file's own comment
 * momentarily mis-stated it as inverted before being corrected against
 * the actual source read.
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
    await repo.updateCategory(legacyId, { status: 1 });
  }

  await setFlash('message', 'Category Updated successfully.');
  return NextResponse.redirect(new URL('/admin/cat-list', request.nextUrl.origin), 303);
}
