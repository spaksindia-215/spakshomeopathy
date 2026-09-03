/**
 * Enquiry submission — mirrors `HomeController@saveEnq`
 * (public_html/app/Http/Controllers/HomeController.php:316-342).
 *
 * Added M4-PREP (docs/M4-PREPARATION.md) — the first file in a new
 * `src/lib/services/` layer. A service function coordinates repository
 * calls to reproduce one Laravel controller WORKFLOW; it contains no
 * MongoDB client construction of its own (the caller supplies `Db`,
 * exactly like every repository in `src/lib/mongodb/repositories/`).
 *
 * SOURCE BEHAVIOR, VERIFIED THIS PHASE AGAINST public_html/ (the current
 * authoritative Laravel export, not the stale spakshomeopathy.com/ backup):
 *
 *   public function saveEnq(Request $req) {
 *     $name=$req->name; $email=$req->email; $subject=$req->subject; $message=$req->message;
 *     $validatedData = $req->validate(['name'=>'required','email'=>'required','subject'=>'required']);
 *     $data=array('name'=>$name,'email'=>$email,'subject'=>$subject,'message'=>$message);
 *     DB::table('enquiries')->insert($data);
 *     Mail::send('enquiry-email', $data2, ...);
 *     return redirect()->back()->with('message', 'Thank you. We will contact soon.');
 *   }
 *
 * PRESERVED BEHAVIOR:
 *   - Exactly `name`/`email`/`subject` are required; `message` is NOT
 *     required (Laravel inserts whatever `$req->message` is, including
 *     absent/null — no `required` rule on it).
 *   - `phone`/mobile is NEVER read from the request at all — this is P-01
 *     (Preserved Defect Register), and this function preserves it by
 *     hardcoding `mobile: null` on every insert, not by accepting and
 *     ignoring a caller-supplied value. A caller cannot make this function
 *     persist a phone number, because Laravel's own form handler can't
 *     either.
 *
 * DOCUMENTED BOUNDARY — NOT IMPLEMENTED HERE:
 *   `Mail::send('enquiry-email', ...)` (the notification email to
 *   gauravsvm07@gmail.com) is Laravel/SMTP infrastructure, not a MongoDB
 *   concern. This function does not send email and does not stub a
 *   mail adapter — that is out of scope for this phase (no auth/payment/
 *   email infra work is authorized). A future phase wiring this into an
 *   actual Next.js route will need to add that separately; documented in
 *   docs/M4-PREPARATION.md rather than guessed at here.
 *
 * `legacyId` — OPEN DEPENDENCY, NOT DECIDED HERE: every schema in this
 * codebase requires a `legacyId: number` (docs/M3-MONGODB-ARCHITECTURE.md
 * §3.1), sourced from the migrated MariaDB row's `id` column. A document
 * created directly by this service was never a MariaDB row, so there is
 * no established convention yet for what `legacyId` should be for a
 * genuinely new, non-migrated document (a new sequence? a negative/offset
 * range to avoid colliding with migrated ids? something else?). Inventing
 * one here would be exactly the kind of undocumented, unilateral design
 * decision this phase's contract asks to avoid. This function therefore
 * takes `legacyId` as a REQUIRED caller-supplied parameter — the decision
 * is deferred to whichever future phase actually wires a live Next.js
 * route to this service, and is called out explicitly in
 * docs/M4-PREPARATION.md as an unresolved dependency.
 */

import type { Db } from 'mongodb';
import { EnquiryRepository } from '../mongodb/repositories/enquiryRepository';
import type { Enquiry } from '../mongodb/schemas';

export interface SubmitEnquiryInput {
  /** See file header — legacyId assignment strategy for new documents is
   * an open dependency, not decided by this function. */
  legacyId: number;
  name: string;
  email: string;
  subject: string;
  /** Optional, matching source: `message` carries no `required` rule. */
  message?: string | null;
}

/**
 * Mirrors `HomeController@saveEnq`'s insert step. Does NOT send email
 * (see file header). Throws if `name`/`email`/`subject` is missing or
 * empty — matching Laravel's `required` validation rule rejecting an
 * absent or empty-string field with a 422 before any insert happens.
 */
export async function submitEnquiry(db: Db, input: SubmitEnquiryInput): Promise<Enquiry> {
  for (const field of ['name', 'email', 'subject'] as const) {
    const value = input[field];
    if (value === undefined || value === null || value === '') {
      throw new Error(
        `submitEnquiry: "${field}" is required (mirrors HomeController@saveEnq's ` +
          `$req->validate(['${field}' => 'required']))`
      );
    }
  }

  const now = new Date();
  const doc: Enquiry = {
    legacyId: input.legacyId,
    name: input.name,
    email: input.email,
    mobile: null, // P-01: source never reads phone from the request either
    subject: input.subject,
    message: input.message ?? null,
    createdAt: now,
    updatedAt: now,
  };

  const repo = new EnquiryRepository(db);
  return repo.insertOne(doc);
}
