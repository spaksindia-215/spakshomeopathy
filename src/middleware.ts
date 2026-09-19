/**
 * Next.js Middleware — CR-006 Phase 8 (`docs/CR-006-PHASE-8-PLAN.md`
 * §2.3). GENUINELY NEW: no `middleware.ts` existed in this project
 * before this phase.
 *
 * Serves admin-managed URL redirects (`src/lib/redirects/`) with a real
 * HTTP 301/302, before Next.js resolves the matched route. Only job this
 * middleware has — it is NOT used for auth (`requireAdminSession()` and
 * friends remain page/route-handler-level checks, unchanged) or any
 * other cross-cutting concern.
 *
 * LOCATION: `src/middleware.ts`, NOT a project-root `middleware.ts` —
 * this project uses the `src/` directory convention (`src/app`,
 * confirmed via `tsconfig.json`'s `@/*` → `./src/*` path mapping), and
 * Next.js only discovers middleware inside `src/` when that convention
 * is active. A first attempt at the project root silently built with an
 * EMPTY `middleware-manifest.json` (no error, no warning) — caught by
 * inspecting the build output directly, not by any compiler/lint error.
 *
 * RUNTIME CONSTRAINT, REVISED DURING IMPLEMENTATION: Next.js Middleware
 * runs in the Edge runtime, which cannot run the MongoDB Node.js driver
 * (no `net`/`tls`). The installed Next.js version (15.5.22) has no
 * supported way to run middleware in the Node.js runtime instead
 * (confirmed by inspecting its own type definitions — no
 * `nodeMiddleware` experimental flag, no `runtime` field on the
 * middleware config type). So this middleware does NOT import the
 * MongoDB driver directly — it calls `/api/redirects` (an ordinary
 * Route Handler, which DOES run in the normal Node.js server context)
 * and caches that response.
 *
 * CACHING: the redirect rule set is fetched from `/api/redirects` on a
 * short, module-level TTL cache (60s) rather than on every matched
 * request — middleware runs on every page load, so an uncached call
 * here would add real latency project-wide. This is a NEW pattern for
 * this codebase (no existing precedent to mirror) and a starting
 * default, not validated against real traffic.
 *
 * FAILS OPEN: if `/api/redirects` is unreachable or errors, the fetch
 * failure is caught and treated as "no redirects apply" — a broken/
 * absent database must never block normal site traffic.
 */

import { NextResponse, type NextRequest } from 'next/server';

interface RedirectRule {
  fromPath: string;
  toPath: string;
  statusCode: 301 | 302;
}

const CACHE_TTL_MS = 60_000;

let cache: { rules: Map<string, RedirectRule>; fetchedAt: number } | null = null;

async function getRedirectRules(origin: string): Promise<Map<string, RedirectRule>> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.rules;
  }
  let rules = new Map<string, RedirectRule>();
  try {
    const response = await fetch(new URL('/api/redirects', origin));
    if (response.ok) {
      const data = (await response.json()) as { rules: RedirectRule[] };
      rules = new Map(data.rules.map((r) => [r.fromPath, r]));
    }
  } catch {
    // /api/redirects unreachable — fail open with no redirects, never
    // block normal traffic on this middleware's own dependency.
  }
  cache = { rules, fetchedAt: Date.now() };
  return rules;
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const rules = await getRedirectRules(request.nextUrl.origin);
  const match = rules.get(request.nextUrl.pathname);

  if (match) {
    const destination = new URL(match.toPath, request.nextUrl.origin);
    return NextResponse.redirect(destination, match.statusCode);
  }

  return NextResponse.next();
}

export const config = {
  // Excludes admin routes (redirects must never intercept the admin
  // panel itself), the /api/redirects endpoint this middleware itself
  // calls (avoiding a self-referential loop), Next.js internals, and
  // static assets — matching the common Next.js middleware matcher
  // convention for "run on real page requests only."
  matcher: ['/((?!admin|api|_next/static|_next/image|favicon.ico|uploaded_files).*)'],
};
