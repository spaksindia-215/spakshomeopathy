/**
 * Test-only signed-session-cookie helper — CR-006 Phase 10
 * (`docs/CR-006-PHASE-10-PLAN.md` §2.2/§6.2).
 *
 * WHY THIS EXISTS, NOT A REAL LOGIN-FORM SUBMISSION: testing the admin
 * CMS requires an authenticated session, but the one real admin account
 * in the dev database has a real password this project has no reason to
 * possess or request. `src/lib/auth/session.ts`'s session is a
 * self-contained, HMAC-signed cookie — NOT a lookup key into a
 * server-side session store (see that file's own header, "SOURCE
 * EQUIVALENCE, NOT A REDESIGN") — so a validly-signed cookie constructed
 * directly, using the SAME `SESSION_SECRET` the dev server itself reads
 * from `.env.local`, is cryptographically indistinguishable from one the
 * real login flow would have produced. This exercises the REAL
 * `requireAdminSession()`/`requirePermissionForSession()` guard chain on
 * every subsequent request — it skips only the login FORM submission,
 * nothing about authorization itself.
 *
 * ISOLATION: lives under `tests/admin-e2e/` only. Nothing in `src/app/`
 * imports this file or depends on its existence — same isolation every
 * other test-only fixture in this codebase already has from application
 * code.
 *
 * ENCODING: mirrors `session.ts`'s `encode()` exactly
 * (`base64url(JSON.stringify(payload))` + `.` + HMAC-SHA256-base64url of
 * that string, keyed by `SESSION_SECRET`) — deliberately duplicated
 * rather than imported, since `session.ts`'s own `encode()` is not
 * exported (by design — no other application code should construct a
 * session cookie outside the real login flow) and this is TEST code, not
 * a second production code path.
 */

import { createHmac } from 'crypto';
import type { BrowserContext } from '@playwright/test';

const SESSION_COOKIE_NAME = 'spaks_session';

interface TestSessionPayload {
  userId: number;
  utype: number;
  email: string;
  issuedAt: number;
}

function sign(data: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      'SESSION_SECRET is not set in the Playwright process — playwright.admin.config.ts should ' +
        'have loaded it from .env/.env.local. Admin e2e specs cannot authenticate without it.'
    );
  }
  return createHmac('sha256', secret).update(data).digest('base64url');
}

function encode(payload: TestSessionPayload): string {
  const json = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(json);
  return `${json}.${signature}`;
}

/**
 * The one real admin account confirmed present in the dev database this
 * phase (`legacyId: 1`, no `role` field set — resolves to implicit
 * `SUPER_ADMIN` via `resolveRole()`'s own fallback, exactly like every
 * pre-Phase-9 admin session). Not configurable per-spec — every admin
 * e2e test in this suite runs as this one account, matching this
 * project's "exactly one real admin" reality rather than inventing a
 * second one that would need its own cleanup.
 */
const REAL_ADMIN_LEGACY_ID = 1;
const REAL_ADMIN_EMAIL = 'spaksindia@gmail.com';

/** Sets a validly-signed admin session cookie on `context`, so every
 * subsequent page navigation in that context is authenticated as the
 * one real admin account — call before any `page.goto()` that needs to
 * reach an `/admin/*` route past `requireAdminSession()`. */
export async function loginAsAdmin(context: BrowserContext, baseURL: string): Promise<void> {
  const payload: TestSessionPayload = {
    userId: REAL_ADMIN_LEGACY_ID,
    utype: 1,
    email: REAL_ADMIN_EMAIL,
    issuedAt: Date.now(),
  };
  const url = new URL(baseURL);
  await context.addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value: encode(payload),
      domain: url.hostname,
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
      secure: false,
    },
  ]);
}
