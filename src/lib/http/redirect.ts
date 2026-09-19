/**
 * Same-origin redirect helper for `route.ts` POST handlers.
 *
 * WHY THIS EXISTS: `NextResponse.redirect()` requires an absolute URL
 * (`next/dist/server/web/utils.js`'s `validateURL` calls `new URL(url)`
 * with no base, and throws on a bare path). Every call site in this app
 * built that absolute URL via `new URL(path, request.nextUrl.origin)`.
 * `request.nextUrl.origin` is derived from an `initUrl` Next.js computes
 * from the SERVER'S OWN bind hostname/port when it can't otherwise trust
 * the request's `Host` header (`next-server.js`'s `initUrl` fallback) —
 * on this app's production (Hostinger/Passenger, standalone `next start`,
 * not Vercel) that bind address is `0.0.0.0:3000`, so every one of those
 * ~113 redirects resolved to `https://0.0.0.0:3000/...` in production
 * regardless of `experimental.trustHostHeader`, causing "Unable to
 * connect" after login, cart actions, checkout, and every admin
 * save/update/delete action.
 *
 * FIX: skip origin construction entirely. A `Location` header is allowed
 * by HTTP (RFC 9110 §10.2.2) to be a relative reference, and every
 * browser resolves it against the current page's own origin — so the
 * redirect target never depends on what Next.js believes its own origin
 * is. `NextResponse.redirect()` itself won't accept a relative URL, so
 * this constructs the response directly via the `NextResponse`
 * constructor (which is a plain `Response` subclass) and sets `Location`
 * by hand.
 */

import { NextResponse } from 'next/server';

type RedirectStatus = 301 | 302 | 303 | 307 | 308;

/**
 * Redirects to `path` (e.g. `/admin/home`) on the current request's own
 * origin, without constructing or depending on an absolute URL.
 */
export function redirectTo(path: string, status: RedirectStatus = 303): NextResponse {
  return new NextResponse(null, {
    status,
    headers: { Location: path },
  });
}
