/**
 * `GET /admin/destroy-enquiry/{id}` — mirrors `AdminController@DestroyEnq`
 * (AdminController.php:1282-1286):
 *
 *   public function DestroyEnq($id) {
 *     $delBlog=DB::table('enquiries')->where('id','=',$id)->delete();
 *     return redirect()->back()->with('message', 'Enquiry deleted successfully.');
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { setFlash } from '@/lib/auth/flash';
import { deleteAdminEnquiry } from '@/lib/services/adminEnquiryService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  await requireAdminSession();

  const { id } = await params;
  const legacyId = Number(id);

  if (Number.isFinite(legacyId)) {
    const db = await getDb();
    await deleteAdminEnquiry(db, legacyId);
  }

  await setFlash('message', 'Enquiry deleted successfully.');
  return redirectTo('/admin/enquires-list', 303);
}
