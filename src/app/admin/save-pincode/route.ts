/**
 * `POST /admin/save-pincode` — mirrors `routes/admin.php:98`
 * (`Route::post('save-pincode','AdminController@SavePinCode')`, inside the
 * `userAuth` group, `admin.php:6-136`).
 *
 * SOURCE (`AdminController.php:1109-1117`):
 *
 *   public function SavePinCode(Request $request) {
 *     $pin_code=$request->pin_code;
 *     $pin_address=$request->pin_address;
 *     $pin_status=$request->pin_status;
 *     $data=array('pin_code'=>$pin_code,'pin_address'=>$pin_address,'pin_status'=>$pin_status);
 *     $saveData=DB::table('pin_codes')->insert($data);
 *     return redirect()->back()->with('message', 'Record saved successfully.');
 *   }
 *
 * B-09 / DR-03 — RESOLVED (Fix Register FIX-001, see
 * `pinCodeRepository.ts`'s header and `docs/M3-OWNER-DECISION-RECORDS.md`
 * DR-03 addendum): source's `pin_code`/`pin_address`/`pin_status` columns
 * do not exist on the real table, so the equivalent Laravel request always
 * SQL-errors before reaching its own success flash. Per the owner-approved
 * fix, this handler writes to the table's REAL columns
 * (`pincode`/`location`/`status`) instead, and DOES reach the success
 * flash — this is the approved, disclosed deviation from B-09's literal
 * failure, not a silent one.
 *
 * The form's three field NAMES it reads from are still `pin_code`/
 * `pin_address`/`pin_status` (matching `add-pin-code/page.tsx`'s actual
 * `<input name="...">` attributes) — only the DATABASE column names
 * differ; the HTTP field names are unrelated to the SQL columns and were
 * never part of B-09's defect.
 *
 * `country`/`uid` (present on the real table, absent from source's
 * `SavePinCode` entirely) are written as `null` — Laravel's own insert
 * never populates them either (its `$data` array has exactly 3 keys, none
 * of which are `country`/`uid`), so this is a faithful reproduction of
 * "these columns are never set by this form," not a new omission.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { setFlash } from '@/lib/auth/flash';
import { PinCodeRepository } from '@/lib/mongodb/repositories/pinCodeRepository';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();
  const origin = request.nextUrl.origin;

  // Global VerifyCsrfToken, no route exceptions — same precedence as
  // every other protected route in this app (CSRF checked before the
  // admin-session guard, mirroring Kernel.php's middleware pipeline
  // order — the `web` group's VerifyCsrfToken runs before `userAuth`).
  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return NextResponse.redirect(new URL('/admin/add-pin-code', origin), 303);
  }

  await requireAdminSession();

  const pinCode = String(formData.get('pin_code') ?? '');
  const pinAddress = String(formData.get('pin_address') ?? '');
  const pinStatus = String(formData.get('pin_status') ?? '');

  const db = await getDb();
  const repo = new PinCodeRepository(db);
  const legacyId = await repo.nextLegacyIdGeneric();

  await repo.insertPinCode({
    legacyId,
    uid: null,
    country: null,
    pincode: pinCode,
    location: pinAddress,
    status: pinStatus,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Mirrors redirect()->back()->with('message', 'Record saved successfully.')
  // exactly, including source's own text — `back()` always resolves to
  // /admin/add-pin-code (the only page with this form action), same
  // fixed-target-instead-of-Referer-parsing convention established by
  // update-profile/route.ts.
  await setFlash('message', 'Record saved successfully.');
  return NextResponse.redirect(new URL('/admin/add-pin-code', origin), 303);
}
