/**
 * `POST /admin/save-cat` — mirrors `routes/admin.php:70`
 * (`Route::post('save-cat','AdminController@Savecategory')`, inside the
 * `userAuth` group). Note the route/method NAME MISMATCH (`save-cat` /
 * `Savecategory`, not `save-category`/`SaveCategory`) — preserved
 * verbatim, not renamed (IR-3).
 *
 * SOURCE (`AdminController.php:214-227`):
 *
 *   public function Savecategory(Request $req) {
 *     $c_name=$req->name;
 *     $c_slug=$req->name.'-'.rand(10000,99999);
 *     $c_type=$req->type;
 *     $c_status=$req->status;
 *     $prod_image=$req->file('c_image');
 *     $filename = time().'g'.$prod_image->getClientOriginalName();
 *     $prod_image->move(public_path('uploaded_files/categories'), $filename);
 *     $data=array('name'=>$c_name,'slug'=>$c_slug,'type'=>$c_type,'status'=>$c_status,'image'=>$filename);
 *     $getId=DB::table('categories')->insertGetId($data);
 *     return redirect()->back()->with('message', 'Category saved successfully.');
 *   }
 *
 * P-07 — THIS IS THE FIRST OF THE TWO SLUG ALGORITHMS (the "name-rand()"
 * one, distinct from `convert_to_slug`): `$req->name.'-'.rand(10000,99999)`
 * — the RAW, un-lowercased, un-sanitized name, string-concatenated with a
 * literal `-` and a random 5-digit integer (rand(10000,99999), NOT
 * str_random). Spaces, uppercase, and any punctuation in the name all
 * pass through UNCHANGED into the slug. Reproduced exactly — do NOT route
 * this through `convertToSlug` (`src/lib/adminSlug.ts`), which is the
 * OTHER algorithm, used by product categories/blog categories/blogs/
 * products, not this one.
 *
 * NEW FINDING THIS SLICE, PRESERVED FAITHFULLY, NOT FIXED
 * ---------------------------------------------------------
 * `$prod_image=$req->file('c_image')` has NO `hasFile()`/`empty()` guard
 * — confirmed directly this slice, and independently corroborated by
 * `docs/GATE-REPORT-M3.md` §6.2 Finding 6, which already catalogued
 * `Savecategory` as one of 6 admin "Add" handlers lacking this guard
 * (flagged then, NOT fixed then, NOT fixed now — the finding is
 * pre-existing, this slice's contribution is implementing the route that
 * makes it concretely reachable for the first time). On real Laravel, a
 * submission with NO `c_image` file (the form field has no `required`
 * attribute — confirmed against `add-category.blade.php:159`) calls
 * `->getClientOriginalName()` on a null `UploadedFile`, which FATALS.
 * This is a genuine, reachable crash condition, not previously registered
 * as a BROKEN item (B-01–B-17) or flagged as a new B-18 candidate by any
 * prior session. REPRODUCED: this route rejects a missing/empty image
 * with a disclosed, non-fatal flash-and-redirect (the same pattern
 * already established for `save-slider`'s own missing-file case) rather
 * than attempting to simulate a PHP null-pointer fatal — consistent with
 * this project's established handling of every other non-BROKEN-register
 * null-dereference edge case.
 *
 * `type` FIDELITY GAP, DISCLOSED, NOT SILENTLY DEFAULTED
 * ---------------------------------------------------------
 * `categories.type` is `enum('N','H') NOT NULL` with no default
 * (`Database/db_newhomo.sql:1029`), and this schema's own
 * `categorySchema.type` is a strict Zod `z.enum(['N','H'])`. The form's
 * `<select name="type">` includes an empty `--select--` option with no
 * `required` attribute — a real visitor CAN submit `type=''`. What real
 * MariaDB does with an invalid/empty ENUM value on this server's
 * `sql_mode` is NOT independently verified this slice (D-09, production
 * `sql_mode`, remains a standing item this project has never fully
 * closed) — it could silently coerce to the enum's zero-index empty
 * value under non-strict mode, or reject the insert entirely under
 * strict mode. Rather than guess either way, this route REJECTS an
 * empty/invalid `type` with a disclosed flash message instead of
 * forwarding an unvalidated value into a schema that requires exactly
 * `'N'`/`'H'`. This is a validation this port adds beyond source's own
 * total absence of one — a narrow, disclosed deviation (same category as
 * the missing-image rejection above), not a silent default.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { requireAdminSession } from '@/lib/auth/guard';
import { verifyCsrfToken } from '@/lib/auth/csrf';
import { setFlash } from '@/lib/auth/flash';
import { CategoryRepository } from '@/lib/mongodb/repositories/categoryRepository';
import { saveAdminUpload, UploadRejectedError } from '@/lib/uploads/adminUpload';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();

  if (!verifyCsrfToken(formData.get('_token') as string | null)) {
    await setFlash('message', 'CSRF token mismatch.');
    return redirectTo('/admin/add-hurbcat', 303);
  }

  await requireAdminSession();

  const name = String(formData.get('name') ?? '');
  const type = String(formData.get('type') ?? '');
  const status = String(formData.get('status') ?? '');
  const imageFile = formData.get('c_image');

  if (!(imageFile instanceof File) || imageFile.size === 0) {
    // See file header — source has no null guard here at all and would
    // fatal; this is a disclosed, non-fatal rejection instead.
    await setFlash('message', 'No image file was uploaded.');
    return redirectTo('/admin/add-hurbcat', 303);
  }

  if (type !== 'N' && type !== 'H') {
    // See file header's `type` FIDELITY GAP note — disclosed rejection,
    // not a silent coercion to a value the visitor didn't choose.
    await setFlash('message', 'Please select a category type.');
    return redirectTo('/admin/add-hurbcat', 303);
  }

  let filename: string;
  try {
    filename = await saveAdminUpload(imageFile, 'categories');
  } catch (error) {
    if (error instanceof UploadRejectedError) {
      await setFlash('message', error.message);
      return redirectTo('/admin/add-hurbcat', 303);
    }
    throw error;
  }

  // P-07, first algorithm — see file header. NOT convertToSlug.
  const slug = `${name}-${Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000}`;

  const db = await getDb();
  const repo = new CategoryRepository(db);
  const legacyId = await repo.nextLegacyIdGeneric();

  await repo.insertCategory({
    legacyId,
    name,
    image: filename,
    slug,
    type,
    status: Number(status) || 0,
    createdAt: new Date(),
  });

  // Mirrors redirect()->back()->with('message', 'Category saved successfully.')
  // — back() always resolves to /admin/add-hurbcat, the only page with
  // this form action.
  await setFlash('message', 'Category saved successfully.');
  return redirectTo('/admin/add-hurbcat', 303);
}
