/**
 * `POST /save-enquiry` — mirrors `routes/web.php:32`
 * (`Route::post('save-enquiry','HomeController@saveEnq')`) exactly.
 *
 * Backs `src/app/contact/page.tsx`'s real form (`action="/save-enquiry"`).
 * Native HTML form POST (no client JS), so a redirect response reproduces
 * Laravel's server-rendered redirect flow, same convention as
 * `save-user/route.ts`/`user-login/route.ts`.
 *
 * Mail::send('enquiry-email', ...) (the notification email to
 * gauravsvm07@gmail.com) is Laravel/SMTP infrastructure, not a MongoDB
 * concern — NOT implemented here, per `enquiryService.ts`'s own documented
 * boundary. This is a disclosed, not silent, scope limit.
 *
 * `$errors` (Laravel's separate ValidationException redirect-back bag) is
 * not wired — same pre-existing, already-disclosed gap as
 * `user-login/route.ts`/`save-user/route.ts`. A validation failure here
 * folds into the same `message` flash the success path uses, since no
 * `$errors`-bag equivalent exists yet anywhere in this app.
 *
 * M5-B: verifies `_token` via `csrf.ts` first — `contact.blade.php:62` has
 * `@csrf`, confirmed directly this slice. See `user-login/route.ts`'s
 * header for the CSRF-mismatch redirect+flash reasoning.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { EnquiryRepository } from '@/lib/mongodb/repositories/enquiryRepository';
import { submitEnquiry } from '@/lib/services/enquiryService';
import { setFlash } from '@/lib/auth/flash';
import { verifyCsrfToken } from '@/lib/auth/csrf';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return redirectTo('/contact', 303);
  }

  const name = String(formData.get('name') ?? '');
  const email = String(formData.get('email') ?? '');
  const subject = String(formData.get('subject') ?? '');
  const messageRaw = formData.get('message');
  // Matches source: `message` carries no `required` rule, so an absent or
  // empty field is stored as-is (NULL-equivalent), not coerced to a
  // required value.
  const message = messageRaw === null || messageRaw === '' ? null : String(messageRaw);

  const db = await getDb();

  try {
    const repo = new EnquiryRepository(db);
    const legacyId = await repo.nextLegacyId();
    await submitEnquiry(db, { legacyId, name, email, subject, message });
  } catch (err) {
    // Mirrors Laravel's ValidationException redirect-back-to-/contact
    // DESTINATION exactly (a missing required field never reaches the
    // DB::table('enquiries')->insert() call in source either) — but since
    // no `$errors`-bag equivalent exists yet anywhere in this app (same
    // disclosed gap as user-login/save-user), the closest faithful signal
    // is a distinct flash message, not the same "Thank you" success text a
    // real submission gets. Silently claiming success on a rejected
    // submission would be a fidelity violation in the other direction
    // (masking a real failure), not a faithful reproduction.
    const reason = err instanceof Error ? err.message : 'Please fill in all required fields.';
    await setFlash('message', reason);
    return redirectTo('/contact', 303);
  }

  // Mirrors HomeController.php:340 exactly.
  await setFlash('message', 'Thank you. We will contact soon.');
  return redirectTo('/contact', 303);
}
