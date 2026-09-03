/**
 * Route/page protection — M4 slices (route guards).
 *
 * Two independent guards, one per Laravel middleware: `requireAdminSession`
 * (mirrors `UserAuth`, admin routes) below, and `requireBuyerSession`
 * (mirrors `CheckBuyer`, buyer routes) further down this file.
 *
 * SOURCE EQUIVALENCE, NOT A REDESIGN
 * -----------------------------------
 * Mirrors `App\Http\Middleware\UserAuth` (`public_html/app/Http/Middleware/
 * UserAuth.php`), the ONLY middleware guarding admin routes in
 * `routes/admin.php` (`Route::group(['middleware' => 'userAuth'], ...)`,
 * wrapping every admin route except `login`, `/`, and `user-login`).
 *
 * Laravel's `UserAuth::handle()`:
 *   if (Auth::user()=='' || utype==3 || utype==2 || utype==4) {
 *       if (Auth::user()!='') Auth::logout();
 *       return redirect('admin/login')->with('AuthMsg', 'Please login here');
 *   }
 *   return $next($request);
 *
 * i.e. reject when there is NO user, OR the user is not utype=1 (admin).
 * (utype==3/2/4 are listed explicitly in source, but combined with "no
 * user" this is equivalent to "reject unless utype===1" — verified
 * against `userSchema`'s own utype enumeration: 1/2/3/4 are the only
 * values, so anything that isn't 1 is one of the three explicitly
 * rejected values or absent entirely.)
 *
 * DELIBERATELY NOT REPRODUCED: `Session::put('backUrl', URL::previous())`.
 * Confirmed (`docs/M3-APPLICATION-MAPPING.md:174`) this value is "never
 * read elsewhere" in the live Laravel application — a genuine dead write
 * in source, not a behavior worth porting.
 *
 * DELIBERATELY NOT REPRODUCED (mechanically impossible from this call
 * site, and separately a dead write in source): `->with('AuthMsg', ...)`
 * and the `Auth::logout()` session-destroy on a wrong-role session. This
 * guard runs inside a Server Component (`admin/(shell)/layout.tsx`)
 * during rendering — Next.js only allows `cookies().set()`/`.delete()`
 * from a Route Handler or Server Action, and throws a hard runtime error
 * ("Cookies can only be modified in a Server Action or Route Handler") if
 * called from a layout/page render, confirmed directly by running the
 * built app this phase. Since `admin/login.blade.php:33` only reads
 * `Session::get('error')` — a key `UserAuth`'s `AuthMsg` write never
 * populates, per the pre-existing source defect already disclosed in
 * `docs/GATE-REPORT-M4-AUTH.md` §7 — the flash write was never visible on
 * real Laravel either, so its absence here changes nothing observable.
 * The wrong-role session is still denied access on every request (the
 * actual security property); it simply is not proactively deleted from
 * this call site. A future slice building the login/logout ROUTE HANDLERS
 * further could add an explicit destroy there if desired — out of scope
 * for a read-only page guard.
 *
 * ARCHITECTURE CHOICE: layout-level guard (`admin/(shell)/layout.tsx`),
 * not `middleware.ts`. The `(shell)` route group already IS the Next.js
 * equivalent of Laravel's `userAuth` route group — every page under it
 * maps 1:1 to a route inside `routes/admin.php`'s `userAuth` group, and
 * `admin/login` already lives outside the group as a sibling folder. A
 * root `middleware.ts` would need to hand-maintain a path matcher that
 * only duplicates what this folder boundary already expresses, and would
 * run on every request project-wide instead of only admin shell
 * navigations. This is the smaller, more precise mechanism for this
 * specific codebase.
 */

import { redirect } from 'next/navigation';
import { getSession, type SessionPayload } from './session';

/** utype=1 is the only admin value — see userSchema.ts / UserAuth.php above. */
const ADMIN_UTYPE = 1;

/** utype=3 is the only buyer value — see BUYER GUARD section below. */
const BUYER_UTYPE = 3;

/**
 * Server-side admin guard. Call at the top of a Server Component that
 * must only render for an authenticated admin (utype=1). Never trusts
 * client-provided state — `getSession()` re-verifies the HMAC signature
 * and expiry server-side on every call; there is no separate
 * client-readable "is logged in" flag anywhere in this app.
 *
 * Redirects (never returns) to `/admin/login` for: no session, an
 * invalid/forged/expired session (all three collapse to `getSession()`
 * returning `null`), or a valid session whose `utype` is not 1.
 */
export async function requireAdminSession(): Promise<SessionPayload> {
  const session = await getSession();

  if (!session || session.utype !== ADMIN_UTYPE) {
    redirect('/admin/login');
  }

  return session;
}

/**
 * BUYER GUARD — mirrors `App\Http\Middleware\CheckBuyer`
 * (`public_html/app/Http/Middleware/CheckBuyer.php`), the middleware
 * wrapping `routes/web.php`'s `checkBuyer` group (`web.php:104-119`:
 * `buyer-panel`, `manage-orders`, `view-order/{orderId}`, `profile`,
 * `change-password`, `myaccount`, `product-checkout` (POST action),
 * `post-checkout`, `save-order`, `cancel-order`, `update-shipping-type`).
 *
 * Laravel's `CheckBuyer::handle()`:
 *   if (Auth::user()=='' || utype==1 || utype==2 || utype==4) {
 *       if (Auth::user()!='') Auth::logout();
 *       Session::put('backUrl', URL::previous());
 *       return redirect('login')->with('AuthMsg', 'Please login here');
 *   }
 *   return $next($request);
 *
 * i.e. reject when there is NO user, OR the user is not utype=3 (buyer) —
 * equivalent to "allow only utype===3", by the same reasoning as
 * `requireAdminSession` above (1/2/4 combined with "no user" covers every
 * non-3 case, per userSchema's utype enumeration).
 *
 * DELIBERATELY NOT REPRODUCED: `Session::put('backUrl', ...)` — same dead
 * write as `UserAuth`'s copy, confirmed never read
 * (`docs/M3-APPLICATION-MAPPING.md:174`).
 *
 * DELIBERATELY NOT REPRODUCED: the `AuthMsg` flash write and
 * `Auth::logout()` on a wrong-role session — same mechanical constraint
 * as `requireAdminSession` (a Server Component render cannot call
 * `cookies().set()`/`.delete()`; confirmed by the runtime failure caught
 * and fixed in the admin guard, same root cause applies here). UNLIKE the
 * admin case, this one IS a real, user-visible gap: `login.blade.php`
 * DOES read and render `AuthMsg` (`src/app/login/page.tsx` already wires
 * it) — so on real Laravel, a `CheckBuyer` redirect back to `/login` DOES
 * show "Please login here". This Next.js guard produces the same
 * destination redirect but WITHOUT that message, a genuine (small),
 * disclosed fidelity gap, not a silent one.
 */
export async function requireBuyerSession(): Promise<SessionPayload> {
  const session = await getSession();

  if (!session || session.utype !== BUYER_UTYPE) {
    redirect('/login');
  }

  return session;
}
