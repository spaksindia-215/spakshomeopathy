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
 */
export async function readAndClearFlash(kind: FlashKind): Promise<string | null> {
  const cookieStore = await cookies();
  const entry = cookieStore.get(COOKIE_NAME[kind]);
  if (!entry) return null;
  cookieStore.delete(COOKIE_NAME[kind]);
  return entry.value;
}
