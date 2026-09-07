/**
 * `POST /admin/update-pincode` — mirrors `routes/admin.php:100`
 * (`Route::post('update-pincode','AdminController@UpdatePinCode')`, inside
 * the `userAuth` group).
 *
 * SOURCE (`AdminController.php:1126-1134`):
 *
 *   public function UpdatePinCode(Request $request) {
 *     $pin_id=$request->pin_id;
 *     $pin_code=$request->pin_code;
 *     $pin_address=$request->pin_address;
 *     $pin_status=$request->pin_status;
 *     $getData=DB::table('pin_codes')->where('id','=',$pin_id)
 *       ->update(['pin_code'=>$pin_code,'pin_address'=>$pin_address,'pin_status'=>$pin_status]);
 *     return redirect()->back()->with('message', 'Record updated successfully.');
 *   }
 *
 * B-09 / DR-03 — RESOLVED (Fix Register FIX-001), same reasoning as
 * `save-pincode/route.ts`'s header: writes to the real columns
 * (`pincode`/`location`/`status`) keyed by `legacyId` (== source's `id`),
 * not the non-existent `pin_code`/`pin_address`/`pin_status` columns.
 * `country`/`uid` are left untouched by an update (Laravel's own
 * `update([...])` call only ever sets the same 3 keys — never touches
 * `country`/`uid` on an existing row either).
 *
 * FIX-004, DISCLOSED AND CORRECTED RETROACTIVELY (2026-09-04, found
 * during the blog-categories sub-slice, self-caught before any owner
 * review of that unrelated defect): the ORIGINAL version of this route
 * (pincode sub-slice) set `updatedAt: new Date()` on every update — this
 * was WRONG. `pin_codes.updated_at` is `DEFAULT current_timestamp()` with
 * NO `ON UPDATE current_timestamp()` clause (confirmed directly against
 * `Database/db_newhomo.sql:18328-18337` — zero `ON UPDATE` clauses exist
 * anywhere in the entire 34-table schema), and source's raw
 * `DB::table()->update([...])` call never sets `updated_at` explicitly
 * either — so on real Laravel, `updated_at` is set ONCE at row creation
 * and NEVER changes again, no matter how many times the row is later
 * updated. Bumping it here was an unauthorized, self-introduced fidelity
 * deviation (contract F-13) — not something the owner approved, not
 * disclosed at the time, simply an incorrect assumption ("update should
 * touch updatedAt") carried over from ordinary application conventions
 * that do not apply to this specific, timestamp-frozen-after-insert
 * table. Corrected here: `updatedAt` is no longer included in this
 * route's `updatePinCode(...)` call. See
 * `docs/GATE-REPORT-M5-E-BLOG-CATEGORIES.md` for the full disclosure and
 * `docs/M3-OWNER-DECISION-RECORDS.md`'s FIX-004 note.
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

  const pinId = String(formData.get('pin_id') ?? '');

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return NextResponse.redirect(new URL(`/admin/edit-pincode/${pinId}`, origin), 303);
  }

  await requireAdminSession();

  const pinCode = String(formData.get('pin_code') ?? '');
  const pinAddress = String(formData.get('pin_address') ?? '');
  const pinStatus = String(formData.get('pin_status') ?? '');
  const legacyId = Number(pinId);

  const db = await getDb();
  const repo = new PinCodeRepository(db);

  if (Number.isFinite(legacyId)) {
    // FIX-004 (§ file header, added retroactively): updatedAt is
    // deliberately NOT bumped here — see this route's header for why.
    await repo.updatePinCode(legacyId, {
      pincode: pinCode,
      location: pinAddress,
      status: pinStatus,
    });
  }
  // Non-numeric/invalid pin_id: source's own `->where('id','=',$pin_id)
  // ->update(...)` against a non-matching id is a silent zero-row no-op in
  // both MariaDB and MongoDB — no exception, no distinguishable response —
  // so this correctly falls through to the same success flash/redirect
  // Laravel would show either way. Not a fidelity gap.

  // Mirrors redirect()->back()->with('message', 'Record updated successfully.')
  // — `back()` always resolves to /admin/edit-pincode/{id}, the only page
  // with this form action, same fixed-target convention as elsewhere.
  await setFlash('message', 'Record updated successfully.');
  return NextResponse.redirect(new URL(`/admin/edit-pincode/${pinId}`, origin), 303);
}
