/**
 * One-shot "flash" message, mirroring Laravel's
 * `redirect()->back()->with('message', ...)` / `->with('AuthMsg', ...)`
 * pattern used throughout `Auth\LoginController`/`Auth\RegisterController`.
 *
 * Laravel stores this in the server-side session for exactly one
 * subsequent request. This module reproduces that with a short-lived,
 * unsigned cookie (the content is a plain user-facing status string, not a
 * credential — nothing here is security-sensitive, so no HMAC signing is
 * needed, unlike session.ts). The cookie is deleted by the SAME request
 * that reads it, reproducing the "exactly once" semantics — a page refresh
 * after viewing the message does not show it again, matching Laravel's
 * session-flash behavior exactly.
 *
 * Two independent keys are used, exactly matching the two Blade-rendered
 * blocks in login.blade.php (`session()->has('message')` →
 * alert-success, `session()->has('AuthMsg')` → alert-danger) and
 * register.blade.php (`message` only, no `AuthMsg` block exists there —
 * verified directly against source).
 */

import { cookies } from 'next/headers';

const MESSAGE_COOKIE = 'spaks_flash_message';
const AUTH_MSG_COOKIE = 'spaks_flash_authmsg';

type FlashKind = 'message' | 'AuthMsg';

const COOKIE_NAME: Record<FlashKind, string> = {
  message: MESSAGE_COOKIE,
  AuthMsg: AUTH_MSG_COOKIE,
};

/** Mirrors `redirect(...)->with('message'|'AuthMsg', $text)`. */
export async function setFlash(kind: FlashKind, value: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME[kind], value, {
    httpOnly: false, // rendered directly into the page body, same as Blade — not a secret
    sameSite: 'lax',
    path: '/',
    maxAge: 60, // generous one-request window; deleted explicitly on read regardless
  });
}

/**
 * Mirrors `session()->has($kind)` / `session()->get($kind)` read-once
 * semantics: reads the value AND clears the cookie in the same call, so a
 * subsequent page load never sees it again.
 *
 * BUG FOUND AND FIXED, CR-006 Phase 10 (`docs/CR-006-PHASE-10-PLAN.md`):
 * every call site of this function is a `page.tsx` Server Component
 * (43 admin pages). Next.js forbids `cookies().set()`/`.delete()` from a
 * Server Component render — only a Server Action or Route Handler may
 * mutate cookies — so `cookieStore.delete(...)` below threw
 * "Cookies can only be modified in a Server Action or Route Handler" a
 * real HTTP 500 on every affected page, but ONLY when a flash cookie was
 * actually present at render time — i.e. immediately after every single
 * create/update/delete action redirected back to its own list page. This
 * went undetected through Phases 2-9 because no manual verification in
 * any prior phase happened to check a list page immediately after a real
 * form submission through it; Phase 10's new e2e suite
 * (`tests/admin-e2e/redirects-crud.spec.ts`) is what first exercised
 * this path and surfaced the 500.
 *
 * FIX: the delete is now best-effort — caught and ignored if it throws
 * (i.e. whenever this runs in the forbidden Server Component context,
 * which is every real call site). The cookie still reads and the
 * message still renders correctly; what's lost is the guarantee that a
 * page reload within the cookie's own 60s `maxAge` (`setFlash`, above)
 * never shows the message a second time — a small, disclosed regression
 * from "exactly once" to "shown for up to 60 seconds," strictly better
 * than the 500 error every affected page was actually producing before
 * this fix.
 */
export async function readAndClearFlash(kind: FlashKind): Promise<string | null> {
  const cookieStore = await cookies();
  const entry = cookieStore.get(COOKIE_NAME[kind]);
  if (!entry) return null;
  try {
    cookieStore.delete(COOKIE_NAME[kind]);
  } catch {
    // Called from a Server Component render (every real call site) —
    // Next.js forbids the mutation here. The cookie's own short maxAge
    // is the fallback expiry; see this function's header for the full
    // account of the trade-off.
  }
  return entry.value;
}
