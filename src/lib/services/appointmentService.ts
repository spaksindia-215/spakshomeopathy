/**
 * Appointment booking — mirrors `HomeController@SaveAppointment`
 * (public_html/app/Http/Controllers/HomeController.php:829-838).
 *
 * Added M4-PREP (docs/M4-PREPARATION.md).
 *
 * SOURCE BEHAVIOR, VERIFIED THIS PHASE AGAINST public_html/:
 *
 *   public function SaveAppointment(Request $req) {
 *     $name=$req->name; $age=$req->age; $gender=$req->gender; $phone=$req->phone;
 *     $appointment_date=$req->appointment_date; $consultant_hour=$req->consultant_hour;
 *     $data=array('name'=>$name,'age'=>$age,'gender'=>$gender,'phone'=>$phone,
 *                 'appointment_date'=>$appointment_date,'consultant_hour'=>$consultant_hour);
 *     $saveData=DB::table('tbl_appointment')->insert($data);
 *     return redirect()->back()->with('message', 'Thank you. We will contact soon.');
 *   }
 *
 * PRESERVED BEHAVIOR — THIS IS THE IMPORTANT ONE: there is NO
 * `$req->validate(...)` call anywhere in this method. Every field is read
 * straight from the request and inserted as-is, including empty strings,
 * missing fields (Laravel's `$req->name` on an absent field yields `null`,
 * which inserts as SQL NULL against columns that allow it), or anything
 * else a POST body happens to contain. `bookAppointment` below preserves
 * this EXACTLY: it performs no validation of its own. This is a deliberate
 * inversion of normal service-layer instinct — do not "helpfully" add a
 * required-field check here. Doing so would silently tighten behavior
 * Laravel never had, which is exactly what contract F-12 (no unauthorized
 * validation-tightening) forbids. If this ever needs to change, that is a
 * product decision requiring explicit owner authorization, not something
 * to infer from "this looks unsafe."
 *
 * `legacyId` — same open dependency as `enquiryService.ts` (see that
 * file's header for the full explanation): required caller-supplied
 * parameter here too, not invented by this function.
 */

import type { Db } from 'mongodb';
import { AppointmentRepository } from '../mongodb/repositories/appointmentRepository';
import type { Appointment } from '../mongodb/schemas';

export interface BookAppointmentInput {
  /** See file header — legacyId assignment strategy for new documents is
   * an open dependency, not decided by this function. */
  legacyId: number;
  name?: string | null;
  age?: number | null;
  gender?: string | null;
  phone?: string | null;
  appointmentDate?: string | null;
  consultantHour?: string | null;
}

/**
 * Mirrors `HomeController@SaveAppointment`'s insert step exactly,
 * including its complete absence of input validation — see file header.
 * Never throws for a missing/empty field; every field defaults to `null`
 * exactly as an absent Laravel request parameter would.
 */
export async function bookAppointment(db: Db, input: BookAppointmentInput): Promise<Appointment> {
  const now = new Date();
  const doc: Appointment = {
    legacyId: input.legacyId,
    name: input.name ?? null,
    age: input.age ?? null,
    gender: input.gender ?? null,
    phone: input.phone ?? null,
    appointmentDate: input.appointmentDate ?? null,
    consultantHour: input.consultantHour ?? null,
    createdAt: now,
    updatedAt: now,
  };

  const repo = new AppointmentRepository(db);
  return repo.insertOne(doc);
}
