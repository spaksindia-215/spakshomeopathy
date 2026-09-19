/**
 * `GET /admin/destroy-pincode/{id}` — mirrors `routes/admin.php:101`
 * (`Route::get('destroy-pincode/{id}','AdminController@DestroyPinCode')`,
 * inside the `userAuth` group).
 *
 * SOURCE (`AdminController.php:1136-1139`):
 *
 *   public function DestroyPinCode($id) {
 *     $delPinCode=DB::table('pin_codes')->where('id','=',$id)->delete();
 *     return redirect()->back()->with('message', 'Record deleted successfully.');
 *   }
 *
 * No B-09/DR-03 involvement — `where('id','=',$id)->delete()` never
 * referenced the mismatched `pin_code`/`pin_address`/`pin_status` column
 * names in source, so this route was never broken and needed no DR-03
 * resolution to work. `id` (source) == `legacyId` (this port).
 *
 * GET, not POST — matches source exactly (a GET-based destructive
 * operation, IR-3: "GET-based destructive operations stay GET"). No CSRF
 * check, consistent with `cancel-order/route.ts`'s established precedent:
 * Laravel's `VerifyCsrfToken`/`isReading()` exempts GET/HEAD/OPTIONS from
 * CSRF checking entirely (confirmed directly against
 * `vendor/laravel/framework/.../VerifyCsrfToken.php` during M5-B) — adding
 * a CSRF check to a GET route here would be protection Laravel never had,
 * not a parity fix.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { setFlash } from '@/lib/auth/flash';
import { PinCodeRepository } from '@/lib/mongodb/repositories/pinCodeRepository';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  await requireAdminSession();

  const { id } = await params;
  const legacyId = Number(id);

  if (Number.isFinite(legacyId)) {
    const db = await getDb();
    const repo = new PinCodeRepository(db);
    await repo.deletePinCode(legacyId);
  }
  // Non-numeric id: source's own where('id','=',$id)->delete() against a
  // non-matching/non-numeric id is a silent zero-row no-op (MariaDB
  // coerces a non-numeric string comparison to no match) — same
  // "quiet either way" reasoning as update-pincode/route.ts.

  // Mirrors redirect()->back()->with('message', 'Record deleted successfully.')
  // — `back()` always resolves to /admin/pin-code-list, the only page
  // linking to this route.
  await setFlash('message', 'Record deleted successfully.');
  return redirectTo('/admin/pin-code-list', 303);
}
