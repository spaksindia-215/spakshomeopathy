/**
 * `POST /save-appointment` — mirrors `routes/web.php:100`
 * (`Route::post('save-appointment','HomeController@SaveAppointment')`)
 * exactly.
 *
 * Backs `src/app/consultancy/page.tsx`'s real form
 * (`action="/save-appointment"`). Native HTML form POST, same convention as
 * every other wired route.ts in this app.
 *
 * Source performs NO validation at all (`HomeController.php:829-838` has no
 * `$request->validate()` call) — `bookAppointment` preserves this exactly,
 * so unlike `save-enquiry/route.ts` there is no failure branch to
 * distinguish: every submission succeeds and inserts, regardless of
 * content, matching source's own total absence of a rejection path.
 *
 * M5-B: verifies `_token` via `csrf.ts` first — `consultancy.blade.php:47`
 * has `@csrf`, confirmed directly this slice. This IS a real,
 * newly-introduced failure branch (source had none for validation, but
 * `VerifyCsrfToken` is a SEPARATE, earlier-running global middleware — a
 * CSRF-failed request in Laravel never reaches `SaveAppointment`'s
 * (validation-free) body at all). See `user-login/route.ts`'s header for
 * the CSRF-mismatch redirect+flash reasoning.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb/client';
import { AppointmentRepository } from '@/lib/mongodb/repositories/appointmentRepository';
import { bookAppointment } from '@/lib/services/appointmentService';
import { setFlash } from '@/lib/auth/flash';
import { verifyCsrfToken } from '@/lib/auth/csrf';

/** Mirrors Laravel reading `$req->age` from an HTML form field (always a
 * string or absent) and inserting it as-is into a MariaDB `int` column,
 * which MySQL coerces at the storage layer. A non-numeric/empty value has
 * no faithful "coerced integer" to preserve, so it maps to `null` — the
 * same absent-field behavior source already has for `$req->age` when the
 * field is missing entirely. Matches this codebase's existing
 * `Number(v)`/null convention (src/lib/migration/transform/*.ts). */
function toNullableInt(value: FormDataEntryValue | null): number | null {
  if (value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();
  const origin = request.nextUrl.origin;

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return NextResponse.redirect(new URL('/consultancy', origin), 303);
  }

  const name = formData.get('name');
  const age = formData.get('age');
  const gender = formData.get('gender');
  const phone = formData.get('phone');
  const appointmentDate = formData.get('appointment_date');
  const consultantHour = formData.get('consultant_hour');

  const db = await getDb();

  const repo = new AppointmentRepository(db);
  const legacyId = await repo.nextLegacyId();

  await bookAppointment(db, {
    legacyId,
    name: name === null || name === '' ? null : String(name),
    age: toNullableInt(age),
    gender: gender === null || gender === '' ? null : String(gender),
    phone: phone === null || phone === '' ? null : String(phone),
    appointmentDate:
      appointmentDate === null || appointmentDate === '' ? null : String(appointmentDate),
    consultantHour:
      consultantHour === null || consultantHour === '' ? null : String(consultantHour),
  });

  // Mirrors HomeController.php:837 exactly — the SAME text as
  // save-enquiry's success flash, which is correct: source's
  // saveEnq/SaveAppointment both flash the identical literal string
  // 'Thank you. We will contact soon.', verified directly against both
  // methods this slice.
  await setFlash('message', 'Thank you. We will contact soon.');
  return NextResponse.redirect(new URL('/consultancy', origin), 303);
}
