/**
 * `GET /api/redirects` — CR-006 Phase 8 (`docs/CR-006-PHASE-8-PLAN.md`
 * §2.3, revised during implementation). GENUINELY NEW, no Laravel
 * equivalent.
 *
 * WHY THIS EXISTS: `middleware.ts` (also new this phase) needs the
 * current redirect rules, but Next.js Middleware runs in the Edge
 * runtime by default, and the installed Next.js version (15.5.22,
 * confirmed by inspecting its own type definitions — no `nodeMiddleware`
 * experimental flag, no `runtime` field on the middleware config type)
 * has no supported way to run middleware in the Node.js runtime, which
 * the MongoDB driver (`getDb()`) requires (`net`/`tls`, unavailable on
 * Edge). This ordinary Route Handler runs in the normal Node.js server
 * context like every other route handler in this codebase, so it CAN
 * use the real MongoDB driver — middleware calls this endpoint instead
 * of importing the driver directly.
 *
 * Returns the full rule set as JSON; `middleware.ts` caches the response
 * for 60s (its own module-level TTL) rather than calling this on every
 * request.
 */

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb/client';
import { RedirectRepository } from '@/lib/redirects/repository';

export async function GET(): Promise<NextResponse> {
  try {
    const db = await getDb();
    const repo = new RedirectRepository(db);
    const rules = await repo.findAll();
    return NextResponse.json({ rules });
  } catch {
    // Unconfigured/unreachable database — same fail-open posture
    // `middleware.ts` itself would otherwise need to implement; an empty
    // rule list means "no redirects apply," never a broken response that
    // could block normal site traffic.
    return NextResponse.json({ rules: [] });
  }
}
